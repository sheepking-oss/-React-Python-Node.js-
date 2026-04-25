import sys
import os
from contextlib import contextmanager
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.database import SessionLocal, init_db
from models.models import (
    Job, JobSource, Favorite,
    ComparisonSession, ComparisonItem,
    CrawlTask, CrawlLog, AnalysisCache,
    DailyNewJobStats, SkillKeyword
)
from config.settings import API

class DatabaseService:
    def __init__(self):
        init_db()

    @contextmanager
    def get_session(self):
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_source_by_name(self, session: Session, name: str) -> Optional[JobSource]:
        return session.query(JobSource).filter(JobSource.name == name).first()

    def create_source(self, session: Session, name: str, base_url: str, description: str = None) -> JobSource:
        source = JobSource(
            name=name,
            base_url=base_url,
            description=description
        )
        session.add(source)
        session.flush()
        return source

    def get_or_create_source(self, session: Session, name: str, base_url: str) -> JobSource:
        source = self.get_source_by_name(session, name)
        if not source:
            source = self.create_source(session, name, base_url)
        return source

    def job_exists_by_unique_key(self, session: Session, unique_key: str) -> bool:
        return session.query(Job).filter(Job.unique_key == unique_key).first() is not None

    def get_job_by_unique_key(self, session: Session, unique_key: str) -> Optional[Job]:
        return session.query(Job).filter(Job.unique_key == unique_key).first()

    def create_job(self, session: Session, job_data: Dict[str, Any]) -> Job:
        job = Job(**job_data)
        session.add(job)
        session.flush()
        return job

    def update_job(self, session: Session, job: Job, job_data: Dict[str, Any]) -> Job:
        for key, value in job_data.items():
            if hasattr(job, key) and value is not None:
                setattr(job, key, value)
        job.updated_at = datetime.now()
        return job

    def search_jobs(
        self,
        session: Session,
        keyword: str = None,
        city: str = None,
        company: str = None,
        salary_min: float = None,
        salary_max: float = None,
        education: str = None,
        experience: str = None,
        job_type: str = None,
        industry: str = None,
        source_id: int = None,
        page: int = 1,
        page_size: int = None,
        sort_by: str = 'publish_date',
        sort_order: str = 'desc'
    ) -> Dict[str, Any]:
        query = session.query(Job).filter(Job.is_valid == True)

        if keyword:
            keyword_pattern = f'%{keyword}%'
            query = query.filter(
                or_(
                    Job.title.like(keyword_pattern),
                    Job.company_name.like(keyword_pattern),
                    Job.description.like(keyword_pattern),
                    Job.skills.like(keyword_pattern)
                )
            )

        if city:
            query = query.filter(Job.city == city)

        if company:
            query = query.filter(Job.company_name.like(f'%{company}%'))

        if salary_min is not None:
            query = query.filter(Job.salary_avg >= salary_min)

        if salary_max is not None:
            query = query.filter(Job.salary_avg <= salary_max)

        if education:
            query = query.filter(Job.education == education)

        if experience:
            query = query.filter(Job.experience == experience)

        if job_type:
            query = query.filter(Job.job_type == job_type)

        if industry:
            query = query.filter(Job.company_industry.like(f'%{industry}%'))

        if source_id:
            query = query.filter(Job.source_id == source_id)

        total = query.count()

        sort_column = getattr(Job, sort_by, Job.publish_date)
        if sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        page_size = page_size or API['default_page_size']
        offset = (page - 1) * page_size
        jobs = query.offset(offset).limit(page_size).all()

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'items': jobs
        }

    def get_job_by_id(self, session: Session, job_id: int) -> Optional[Job]:
        return session.query(Job).filter(Job.id == job_id).first()

    def increment_job_view_count(self, session: Session, job_id: int):
        job = self.get_job_by_id(session, job_id)
        if job:
            job.view_count += 1

    def get_distinct_cities(self, session: Session) -> List[str]:
        results = session.query(Job.city).filter(
            Job.city.isnot(None),
            Job.city != ''
        ).distinct().order_by(Job.city).all()
        return [r[0] for r in results]

    def get_distinct_educations(self, session: Session) -> List[str]:
        results = session.query(Job.education).filter(
            Job.education.isnot(None),
            Job.education != ''
        ).distinct().all()
        return [r[0] for r in results]

    def get_distinct_experiences(self, session: Session) -> List[str]:
        results = session.query(Job.experience).filter(
            Job.experience.isnot(None),
            Job.experience != ''
        ).distinct().all()
        return [r[0] for r in results]

    def get_distinct_industries(self, session: Session) -> List[str]:
        results = session.query(Job.company_industry).filter(
            Job.company_industry.isnot(None),
            Job.company_industry != ''
        ).distinct().all()
        return [r[0] for r in results]

    def get_favorites(self, session: Session, user_session_id: str, folder_name: str = None) -> List[Favorite]:
        query = session.query(Favorite).filter(
            Favorite.user_session_id == user_session_id
        )
        if folder_name:
            query = query.filter(Favorite.folder_name == folder_name)
        return query.order_by(desc(Favorite.created_at)).all()

    def get_favorite_folders(self, session: Session, user_session_id: str) -> List[str]:
        results = session.query(Favorite.folder_name).filter(
            Favorite.user_session_id == user_session_id
        ).distinct().all()
        return [r[0] for r in results]

    def is_job_favorited(self, session: Session, job_id: int, user_session_id: str) -> bool:
        return session.query(Favorite).filter(
            Favorite.job_id == job_id,
            Favorite.user_session_id == user_session_id
        ).first() is not None

    def add_favorite(self, session: Session, job_id: int, user_session_id: str, folder_name: str = None, notes: str = None) -> Optional[Favorite]:
        if self.is_job_favorited(session, job_id, user_session_id):
            return None

        favorite = Favorite(
            job_id=job_id,
            user_session_id=user_session_id,
            folder_name=folder_name or '默认收藏夹',
            notes=notes
        )
        session.add(favorite)

        job = self.get_job_by_id(session, job_id)
        if job:
            job.favorite_count += 1

        session.flush()
        return favorite

    def remove_favorite(self, session: Session, job_id: int, user_session_id: str) -> bool:
        favorite = session.query(Favorite).filter(
            Favorite.job_id == job_id,
            Favorite.user_session_id == user_session_id
        ).first()

        if not favorite:
            return False

        job = self.get_job_by_id(session, job_id)
        if job and job.favorite_count > 0:
            job.favorite_count -= 1

        session.delete(favorite)
        return True

    def create_comparison_session(self, session: Session, user_session_id: str, name: str = None) -> ComparisonSession:
        comp_session = ComparisonSession(
            user_session_id=user_session_id,
            name=name or '对比分析'
        )
        session.add(comp_session)
        session.flush()
        return comp_session

    def get_comparison_session(self, session: Session, session_id: int, user_session_id: str = None) -> Optional[ComparisonSession]:
        query = session.query(ComparisonSession).filter(
            ComparisonSession.id == session_id
        )
        if user_session_id:
            query = query.filter(ComparisonSession.user_session_id == user_session_id)
        return query.first()

    def add_to_comparison(self, session: Session, session_id: int, job_id: int) -> Optional[ComparisonItem]:
        existing = session.query(ComparisonItem).filter(
            ComparisonItem.session_id == session_id,
            ComparisonItem.job_id == job_id
        ).first()

        if existing:
            return existing

        max_order = session.query(func.max(ComparisonItem.order)).filter(
            ComparisonItem.session_id == session_id
        ).scalar() or 0

        item = ComparisonItem(
            session_id=session_id,
            job_id=job_id,
            order=max_order + 1
        )
        session.add(item)
        session.flush()
        return item

    def remove_from_comparison(self, session: Session, session_id: int, job_id: int) -> bool:
        item = session.query(ComparisonItem).filter(
            ComparisonItem.session_id == session_id,
            ComparisonItem.job_id == job_id
        ).first()

        if not item:
            return False

        session.delete(item)
        return True

    def create_crawl_task(self, session: Session, task_type: str, source_id: int = None, keyword: str = None) -> CrawlTask:
        task = CrawlTask(
            task_type=task_type,
            source_id=source_id,
            keyword=keyword,
            status='pending'
        )
        session.add(task)
        session.flush()
        return task

    def get_crawl_task(self, session: Session, task_id: int) -> Optional[CrawlTask]:
        return session.query(CrawlTask).filter(CrawlTask.id == task_id).first()

    def update_crawl_task(self, session: Session, task: CrawlTask, **kwargs) -> CrawlTask:
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        return task

    def create_crawl_log(self, session: Session, level: str, message: str, task_id: int = None, source_id: int = None, details: str = None, url: str = None) -> CrawlLog:
        log = CrawlLog(
            task_id=task_id,
            source_id=source_id,
            level=level,
            message=message,
            details=details,
            url=url
        )
        session.add(log)
        session.flush()
        return log

    def get_analysis_cache(self, session: Session, cache_key: str) -> Optional[Dict[str, Any]]:
        cache = session.query(AnalysisCache).filter(
            AnalysisCache.cache_key == cache_key,
            AnalysisCache.expires_at > datetime.now()
        ).first()

        if cache:
            return {
                'data': json.loads(cache.data),
                'query_params': json.loads(cache.query_params) if cache.query_params else None,
                'created_at': cache.created_at
            }
        return None

    def set_analysis_cache(self, session: Session, cache_key: str, cache_type: str, data: Any, query_params: Dict = None, ttl_hours: int = 2):
        existing = session.query(AnalysisCache).filter(
            AnalysisCache.cache_key == cache_key
        ).first()

        if existing:
            existing.data = json.dumps(data, ensure_ascii=False)
            existing.query_params = json.dumps(query_params, ensure_ascii=False) if query_params else None
            existing.expires_at = datetime.now() + timedelta(hours=ttl_hours)
        else:
            cache = AnalysisCache(
                cache_key=cache_key,
                cache_type=cache_type,
                data=json.dumps(data, ensure_ascii=False),
                query_params=json.dumps(query_params, ensure_ascii=False) if query_params else None,
                expires_at=datetime.now() + timedelta(hours=ttl_hours)
            )
            session.add(cache)

    def record_daily_new_job(self, session: Session, date: datetime, source_id: int = None, city: str = None, industry: str = None, job_count: int = 0, avg_salary: float = None):
        existing = session.query(DailyNewJobStats).filter(
            DailyNewJobStats.date == date,
            DailyNewJobStats.source_id == source_id,
            DailyNewJobStats.city == city,
            DailyNewJobStats.industry == industry
        ).first()

        if existing:
            existing.job_count = job_count
            existing.avg_salary = avg_salary
        else:
            stat = DailyNewJobStats(
                date=date,
                source_id=source_id,
                city=city,
                industry=industry,
                job_count=job_count,
                avg_salary=avg_salary
            )
            session.add(stat)

    def get_daily_stats(self, session: Session, start_date: datetime = None, end_date: datetime = None, city: str = None, industry: str = None, source_id: int = None) -> List[DailyNewJobStats]:
        query = session.query(DailyNewJobStats)

        if start_date:
            query = query.filter(DailyNewJobStats.date >= start_date)
        if end_date:
            query = query.filter(DailyNewJobStats.date <= end_date)
        if city:
            query = query.filter(DailyNewJobStats.city == city)
        if industry:
            query = query.filter(DailyNewJobStats.industry == industry)
        if source_id:
            query = query.filter(DailyNewJobStats.source_id == source_id)

        return query.order_by(DailyNewJobStats.date).all()

    def get_recent_crawl_tasks(self, session: Session, limit: int = 10) -> List[CrawlTask]:
        return session.query(CrawlTask).order_by(desc(CrawlTask.created_at)).limit(limit).all()

    def get_all_sources(self, session: Session) -> List[JobSource]:
        return session.query(JobSource).filter(JobSource.is_active == True).all()

db_service = DatabaseService()
