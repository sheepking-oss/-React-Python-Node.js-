import sys
import os
import asyncio
from typing import Dict, Any, Optional, List, Callable, Awaitable
from datetime import datetime
from threading import Thread, Lock
from queue import Queue, Empty
import uuid
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from enum import Enum

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import TASK_QUEUE, SPIDER
from services.db_service import db_service


class TaskStatus(str, Enum):
    PENDING = 'pending'
    QUEUED = 'queued'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    TIMEOUT = 'timeout'
    CANCELLED = 'cancelled'


class TaskPriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


class TaskInfo:
    def __init__(
        self,
        task_id: str,
        task_type: str,
        handler: Callable,
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: float = None,
        max_retries: int = 0,
        kwargs: Dict[str, Any] = None
    ):
        self.task_id = task_id
        self.task_type = task_type
        self.handler = handler
        self.priority = priority
        self.timeout = timeout or TASK_QUEUE.get('task_timeout', 300)
        self.max_retries = max_retries
        self.retries = 0
        self.kwargs = kwargs or {}
        self.status = TaskStatus.PENDING
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.result: Optional[Any] = None
        self.progress: float = 0.0
        self._db_task_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'task_id': self.task_id,
            'task_type': self.task_type,
            'priority': self.priority.value,
            'status': self.status.value,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'retries': self.retries,
            'progress': self.progress,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60,
        success_threshold: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self._lock = Lock()
        self._failures = 0
        self._successes = 0
        self._state = 'CLOSED'
        self._last_failure_time: Optional[float] = None

    def can_execute(self) -> bool:
        with self._lock:
            if self._state == 'OPEN':
                if time.time() - self._last_failure_time > self.recovery_timeout:
                    self._state = 'HALF_OPEN'
                    self._successes = 0
                    return True
                return False
            return True

    def record_success(self):
        with self._lock:
            if self._state == 'HALF_OPEN':
                self._successes += 1
                if self._successes >= self.success_threshold:
                    self._state = 'CLOSED'
                    self._failures = 0
                    self._successes = 0
            else:
                self._failures = max(0, self._failures - 1)

    def record_failure(self):
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.time()

            if self._state == 'CLOSED' and self._failures >= self.failure_threshold:
                self._state = 'OPEN'
            elif self._state == 'HALF_OPEN':
                self._state = 'OPEN'

    def get_state(self) -> str:
        with self._lock:
            return self._state

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            return {
                'state': self._state,
                'failures': self._failures,
                'successes': self._successes,
                'last_failure_time': self._last_failure_time,
                'failure_threshold': self.failure_threshold,
                'recovery_timeout': self.recovery_timeout
            }


class TaskQueue:
    def __init__(self):
        self._lock = Lock()
        self._queues: Dict[TaskPriority, Queue] = {
            TaskPriority.URGENT: Queue(),
            TaskPriority.HIGH: Queue(),
            TaskPriority.NORMAL: Queue(),
            TaskPriority.LOW: Queue(),
        }
        self._tasks: Dict[str, TaskInfo] = {}
        self._running: bool = False
        self._worker_threads: List[Thread] = []
        self._executor: Optional[ThreadPoolExecutor] = None
        self._circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._spider_circuit_breaker: CircuitBreaker = CircuitBreaker(
            failure_threshold=TASK_QUEUE.get('circuit_breaker', {}).get('failure_threshold', 5),
            recovery_timeout=TASK_QUEUE.get('circuit_breaker', {}).get('recovery_timeout', 60),
        )
        self._init_db_source()

    def _init_db_source(self):
        with db_service.get_session() as session:
            source = db_service.get_source_by_name(session, '任务队列')
            if not source:
                db_service.create_source(session, '任务队列', 'internal://task-queue', '内部任务队列管理')

    def start(self, num_workers: int = None):
        if num_workers is None:
            num_workers = TASK_QUEUE.get('worker_count', 4)

        self._executor = ThreadPoolExecutor(max_workers=num_workers)
        self._running = True

        for i in range(num_workers):
            t = Thread(target=self._worker_loop, args=(i,), daemon=True)
            t.start()
            self._worker_threads.append(t)

        print(f"[TaskQueue] Started with {num_workers} workers")

    def stop(self):
        self._running = False
        if self._executor:
            self._executor.shutdown(wait=False)
        print("[TaskQueue] Stopped")

    def _worker_loop(self, worker_id: int):
        while self._running:
            try:
                task = self._get_next_task(timeout=1.0)
                if task:
                    self._execute_task(task, worker_id)
            except Exception as e:
                print(f"[TaskQueue] Worker {worker_id} error: {e}")

    def _get_next_task(self, timeout: float = 1.0) -> Optional[TaskInfo]:
        for priority in [TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW]:
            try:
                task = self._queues[priority].get(timeout=0.1)
                return task
            except Empty:
                continue
        return None

    def _execute_task(self, task: TaskInfo, worker_id: int):
        with self._lock:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now()

        print(f"[TaskQueue] Worker {worker_id} executing task {task.task_id} ({task.task_type})")

        try:
            if not self._spider_circuit_breaker.can_execute():
                raise Exception(f"Circuit breaker is {self._spider_circuit_breaker.get_state()}")

            future = self._executor.submit(
                self._run_task_handler,
                task
            )

            try:
                result = future.result(timeout=task.timeout)
                task.result = result
                task.status = TaskStatus.COMPLETED
                task.progress = 1.0
                self._spider_circuit_breaker.record_success()
                print(f"[TaskQueue] Task {task.task_id} completed successfully")
            except FutureTimeoutError:
                task.status = TaskStatus.TIMEOUT
                task.error_message = f"Task timed out after {task.timeout} seconds"
                self._spider_circuit_breaker.record_failure()
                print(f"[TaskQueue] Task {task.task_id} timeout")
            except Exception as e:
                task.error_message = str(e)
                if task.retries < task.max_retries:
                    task.retries += 1
                    task.status = TaskStatus.PENDING
                    self._queues[task.priority].put(task)
                    print(f"[TaskQueue] Task {task.task_id} retry {task.retries}/{task.max_retries}")
                    return
                task.status = TaskStatus.FAILED
                self._spider_circuit_breaker.record_failure()
                print(f"[TaskQueue] Task {task.task_id} failed: {e}")

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            self._spider_circuit_breaker.record_failure()
            print(f"[TaskQueue] Task {task.task_id} execution error: {e}")

        finally:
            with self._lock:
                task.completed_at = datetime.now()
            self._update_db_task_status(task)

    def _run_task_handler(self, task: TaskInfo) -> Any:
        return task.handler(**task.kwargs)

    def _update_db_task_status(self, task: TaskInfo):
        try:
            with db_service.get_session() as session:
                if task._db_task_id:
                    db_task = db_service.get_crawl_task(session, task._db_task_id)
                    if db_task:
                        status_map = {
                            TaskStatus.PENDING: 'pending',
                            TaskStatus.QUEUED: 'queued',
                            TaskStatus.RUNNING: 'running',
                            TaskStatus.COMPLETED: 'completed',
                            TaskStatus.FAILED: 'failed',
                            TaskStatus.TIMEOUT: 'failed',
                            TaskStatus.CANCELLED: 'cancelled',
                        }
                        db_service.update_crawl_task(
                            session,
                            db_task,
                            status=status_map.get(task.status, 'unknown'),
                            progress=int(task.progress * 100),
                            error_message=task.error_message
                        )
        except Exception as e:
            print(f"[TaskQueue] Failed to update DB task: {e}")

    def submit_task(
        self,
        task_type: str,
        handler: Callable,
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: float = None,
        max_retries: int = None,
        **kwargs
    ) -> str:
        task_id = str(uuid.uuid4())

        if timeout is None:
            timeout = TASK_QUEUE.get('task_timeout', 300)
        if max_retries is None:
            max_retries = TASK_QUEUE.get('max_retries', 3)

        task = TaskInfo(
            task_id=task_id,
            task_type=task_type,
            handler=handler,
            priority=priority,
            timeout=timeout,
            max_retries=max_retries,
            kwargs=kwargs
        )

        with db_service.get_session() as session:
            source = db_service.get_source_by_name(session, '任务队列')
            db_task = db_service.create_crawl_task(
                session,
                task_type=task_type,
                source_id=source.id if source else None,
                keyword=kwargs.get('keyword', '')
            )
            task._db_task_id = db_task.id

        with self._lock:
            self._tasks[task_id] = task
            task.status = TaskStatus.QUEUED

        self._queues[priority].put(task)

        print(f"[TaskQueue] Submitted task {task_id} ({task_type}) with priority {priority.value}")
        return task_id

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                return task.to_dict()
        return None

    def get_recent_tasks(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self._lock:
            sorted_tasks = sorted(
                self._tasks.values(),
                key=lambda t: t.created_at,
                reverse=True
            )
            return [t.to_dict() for t in sorted_tasks[:limit]]

    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        return {
            'spider': self._spider_circuit_breaker.get_metrics(),
        }

    def is_healthy(self) -> bool:
        return self._running and self._spider_circuit_breaker.get_state() != 'OPEN'


task_queue = TaskQueue()
