import sys
import os
import random
import time
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import SPIDER
from services.db_service import db_service
from services.data_processor import data_processor
from models.models import JobSource

class BaseSpider(ABC):
    source_name: str = None
    base_url: str = None

    def __init__(self, task_id: int = None):
        self.task_id = task_id
        self.session = None
        self.headers = self._get_headers()
        self.stats = {
            'total': 0,
            'processed': 0,
            'new': 0,
            'duplicate': 0,
            'failed': 0
        }

    def _get_headers(self) -> Dict[str, str]:
        return {
            'User-Agent': random.choice(SPIDER['user_agents']),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }

    def _random_delay(self, min_delay: float = 1.0, max_delay: float = 3.0):
        delay = random.uniform(min_delay, max_delay)
        time.sleep(delay)

    async def _async_random_delay(self, min_delay: float = 1.0, max_delay: float = 3.0):
        delay = random.uniform(min_delay, max_delay)
        await asyncio.sleep(delay)

    def log(self, level: str, message: str, details: str = None, url: str = None):
        with db_service.get_session() as session:
            source = db_service.get_source_by_name(session, self.source_name)
            source_id = source.id if source else None
            
            db_service.create_crawl_log(
                session,
                level=level,
                message=message,
                task_id=self.task_id,
                source_id=source_id,
                details=details,
                url=url
            )

    def update_task_progress(self, progress: int, total: int = None, processed: int = None, new: int = None, duplicate: int = None):
        if not self.task_id:
            return
        
        with db_service.get_session() as session:
            task = db_service.get_crawl_task(session, self.task_id)
            if task:
                kwargs = {'progress': progress}
                if total is not None:
                    kwargs['total_items'] = total
                if processed is not None:
                    kwargs['processed_items'] = processed
                if new is not None:
                    kwargs['new_items'] = new
                if duplicate is not None:
                    kwargs['duplicate_items'] = duplicate
                
                db_service.update_crawl_task(session, task, **kwargs)

    @abstractmethod
    async def fetch(self, url: str, params: Dict = None) -> Optional[str]:
        pass

    @abstractmethod
    async def parse_list_page(self, html: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def parse_detail_page(self, html: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def search_jobs(self, keyword: str, city: str = None, page: int = 1) -> List[Dict[str, Any]]:
        pass

    def process_raw_job(self, raw_job: Dict[str, Any]) -> Dict[str, Any]:
        return data_processor.process_job_data(raw_job)

    def save_job(self, processed_job: Dict[str, Any]) -> bool:
        with db_service.get_session() as session:
            source = db_service.get_or_create_source(session, self.source_name, self.base_url)
            processed_job['source_id'] = source.id

            existing = db_service.get_job_by_unique_key(session, processed_job['unique_key'])
            
            if existing:
                existing_jobs = [{
                    'id': existing.id,
                    'title': existing.title,
                    'company_name': existing.company_name,
                    'city': existing.city,
                    'salary_min': existing.salary_min
                }]
                
                is_dup, dup_id, similarity = data_processor.check_duplicate(processed_job, existing_jobs)
                
                if is_dup:
                    self.stats['duplicate'] += 1
                    existing.is_duplicate = True
                    existing.duplicate_of = dup_id
                    existing.similarity_score = similarity
                    existing.last_update_date = datetime.now()
                    self.log('info', f'Duplicate job found: {processed_job.get("title")} at {processed_job.get("company_name")}')
                    return False
                else:
                    processed_job['last_update_date'] = datetime.now()
                    db_service.update_job(session, existing, processed_job)
                    self.stats['processed'] += 1
                    return True
            else:
                try:
                    db_service.create_job(session, processed_job)
                    self.stats['new'] += 1
                    self.stats['processed'] += 1
                    return True
                except Exception as e:
                    self.log('error', f'Failed to save job: {str(e)}', details=str(processed_job))
                    self.stats['failed'] += 1
                    return False

    async def start_session(self):
        timeout = aiohttp.ClientTimeout(total=SPIDER['timeout'])
        self.session = aiohttp.ClientSession(timeout=timeout, headers=self.headers)

    async def close_session(self):
        if self.session:
            await self.session.close()

    async def run(self, keyword: str = None, city: str = None, max_pages: int = 5):
        await self.start_session()
        
        self.log('info', f'Starting {self.source_name} spider', details=f'keyword: {keyword}, city: {city}')
        
        try:
            all_jobs = []
            for page in range(1, max_pages + 1):
                jobs = await self.search_jobs(keyword, city, page)
                if not jobs:
                    break
                all_jobs.extend(jobs)
                self._random_delay(1, 2)
            
            self.stats['total'] = len(all_jobs)
            
            for raw_job in all_jobs:
                try:
                    processed = self.process_raw_job(raw_job)
                    self.save_job(processed)
                    
                    self.update_task_progress(
                        progress=int((self.stats['processed'] / max(self.stats['total'], 1)) * 100),
                        total=self.stats['total'],
                        processed=self.stats['processed'],
                        new=self.stats['new'],
                        duplicate=self.stats['duplicate']
                    )
                    
                except Exception as e:
                    self.log('error', f'Error processing job: {str(e)}', details=str(raw_job))
                    self.stats['failed'] += 1
            
            self.log('info', f'Spider completed. Stats: {self.stats}')
            
        except Exception as e:
            self.log('error', f'Spider failed: {str(e)}')
            raise
        finally:
            await self.close_session()
        
        return self.stats
