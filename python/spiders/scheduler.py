import sys
import os
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from threading import Thread
import schedule
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import SCHEDULER
from services.db_service import db_service
from models.models import CrawlTask

class Scheduler:
    def __init__(self):
        self.running_tasks: Dict[int, Any] = {}
        self.spiders = {}
        self._register_spiders()

    def _register_spiders(self):
        from spiders.mock_spider import MockSpider
        self.spiders['mock'] = MockSpider

    async def run_spider(self, spider_name: str, task_id: int, keyword: str = None, city: str = None, max_pages: int = 5):
        SpiderClass = self.spiders.get(spider_name)
        if not SpiderClass:
            raise ValueError(f"Unknown spider: {spider_name}")

        spider = SpiderClass(task_id=task_id)
        
        with db_service.get_session() as session:
            task = db_service.get_crawl_task(session, task_id)
            if task:
                db_service.update_crawl_task(session, task, status='running', started_at=datetime.now())

        try:
            stats = await spider.run(keyword=keyword, city=city, max_pages=max_pages)
            
            with db_service.get_session() as session:
                task = db_service.get_crawl_task(session, task_id)
                if task:
                    db_service.update_crawl_task(
                        session,
                        task,
                        status='completed',
                        completed_at=datetime.now(),
                        total_items=stats['total'],
                        processed_items=stats['processed'],
                        new_items=stats['new'],
                        duplicate_items=stats['duplicate']
                    )
            
            if task_id in self.running_tasks:
                del self.running_tasks[task_id]
            
            return stats

        except Exception as e:
            with db_service.get_session() as session:
                task = db_service.get_crawl_task(session, task_id)
                if task:
                    db_service.update_crawl_task(
                        session,
                        task,
                        status='failed',
                        completed_at=datetime.now(),
                        error_message=str(e)
                    )
                db_service.create_crawl_log(
                    session,
                    level='error',
                    message=f'Spider task failed: {str(e)}',
                    task_id=task_id
                )
            
            if task_id in self.running_tasks:
                del self.running_tasks[task_id]
            
            raise

    def start_task(self, task_type: str, spider_name: str = 'mock', keyword: str = None, city: str = None, max_pages: int = 5) -> int:
        with db_service.get_session() as session:
            source = db_service.get_source_by_name(session, '模拟招聘网')
            source_id = source.id if source else None
            
            task = db_service.create_crawl_task(
                session,
                task_type=task_type,
                source_id=source_id,
                keyword=keyword
            )
            task_id = task.id

        async def run_task():
            await self.run_spider(
                spider_name=spider_name,
                task_id=task_id,
                keyword=keyword,
                city=city,
                max_pages=max_pages
            )

        def start_async_task():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(run_task())
            finally:
                loop.close()

        thread = Thread(target=start_async_task, daemon=True)
        thread.start()
        
        self.running_tasks[task_id] = thread
        
        return task_id

    def get_task_status(self, task_id: int) -> Optional[Dict[str, Any]]:
        with db_service.get_session() as session:
            task = db_service.get_crawl_task(session, task_id)
            if not task:
                return None
            
            return {
                'id': task.id,
                'task_type': task.task_type,
                'status': task.status,
                'progress': task.progress,
                'total_items': task.total_items,
                'processed_items': task.processed_items,
                'new_items': task.new_items,
                'duplicate_items': task.duplicate_items,
                'error_message': task.error_message,
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'is_running': task_id in self.running_tasks
            }

    def get_recent_tasks(self, limit: int = 10) -> List[Dict[str, Any]]:
        with db_service.get_session() as session:
            tasks = db_service.get_recent_crawl_tasks(session, limit)
            return [
                {
                    'id': task.id,
                    'task_type': task.task_type,
                    'status': task.status,
                    'progress': task.progress,
                    'total_items': task.total_items,
                    'new_items': task.new_items,
                    'started_at': task.started_at.isoformat() if task.started_at else None,
                    'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                }
                for task in tasks
            ]

    def schedule_daily_crawl(self):
        def daily_task():
            print(f"[{datetime.now()}] Running daily crawl task...")
            self.start_task(task_type='full', keyword='', max_pages=10)

        schedule.every().day.at(SCHEDULER['daily_crawl_time']).do(daily_task)
        
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)

        thread = Thread(target=run_scheduler, daemon=True)
        thread.start()
        
        print(f"Scheduler started. Daily crawl scheduled at {SCHEDULER['daily_crawl_time']}")

scheduler = Scheduler()
