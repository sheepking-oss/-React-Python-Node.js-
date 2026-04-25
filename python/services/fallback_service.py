import sys
import os
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from threading import Lock
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import FALLBACK, API
from services.db_service import db_service
from models.database import SessionLocal
from models.models import Job, DailyNewJobStats, CrawlTask


class FallbackCache:
    def __init__(self, ttl_seconds: int = None):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = Lock()
        self._ttl_seconds = ttl_seconds or FALLBACK.get('cache_ttl_seconds', 300)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache:
                value, expires_at = self._cache[key]
                if time.time() < expires_at:
                    return value
                else:
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = None):
        ttl = ttl_seconds or self._ttl_seconds
        with self._lock:
            self._cache[key] = (value, time.time() + ttl)

    def delete(self, key: str):
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self):
        with self._lock:
            self._cache.clear()


class FallbackService:
    def __init__(self):
        self._enabled = FALLBACK.get('enabled', True)
        self._max_data_age_hours = FALLBACK.get('max_data_age_hours', 24)
        self._min_jobs_required = FALLBACK.get('min_jobs_required', 10)
        self._cache = FallbackCache()
        self._stats = {
            'fallback_used': 0,
            'fallback_successful': 0,
            'fallback_failed': 0,
            'last_fallback_time': None,
        }

    def is_available(self) -> bool:
        if not self._enabled:
            return False

        with db_service.get_session() as session:
            total_jobs = session.query(Job).filter(Job.is_valid == True).count()
            if total_jobs < self._min_jobs_required:
                return False

            latest_job = session.query(Job).filter(
                Job.is_valid == True
            ).order_by(Job.created_at.desc()).first()

            if latest_job:
                age_hours = (datetime.now() - latest_job.created_at).total_seconds() / 3600
                if age_hours > self._max_data_age_hours:
                    return False

        return True

    def get_fallback_search(
        self,
        keyword: str = None,
        city: str = None,
        company: str = None,
        salary_min: float = None,
        salary_max: float = None,
        education: str = None,
        experience: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Optional[Dict[str, Any]]:
        try:
            if not self.is_available():
                return None

            cache_key = f"search:{keyword}:{city}:{company}:{salary_min}:{salary_max}:{education}:{experience}:{page}:{page_size}"
            cached = self._cache.get(cache_key)
            if cached:
                self._stats['fallback_used'] += 1
                self._stats['fallback_successful'] += 1
                self._stats['last_fallback_time'] = datetime.now().isoformat()
                return cached

            with db_service.get_session() as session:
                result = db_service.search_jobs(
                    session=session,
                    keyword=keyword,
                    city=city,
                    company=company,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    education=education,
                    experience=experience,
                    page=page,
                    page_size=page_size,
                    sort_by='publish_date',
                    sort_order='desc'
                )

                jobs_list = []
                for job in result['items']:
                    jobs_list.append({
                        'id': job.id,
                        'title': job.title,
                        'company_name': job.company_name,
                        'company_industry': job.company_industry,
                        'company_size': job.company_size,
                        'salary_min': job.salary_min,
                        'salary_max': job.salary_max,
                        'salary_avg': job.salary_avg,
                        'salary_original': job.salary_original,
                        'city': job.city,
                        'district': job.district,
                        'education': job.education,
                        'experience': job.experience,
                        'job_type': job.job_type,
                        'skills': job.skills,
                        'keywords': job.keywords,
                        'publish_date': job.publish_date.isoformat() if job.publish_date else None,
                        'view_count': job.view_count,
                        'favorite_count': job.favorite_count,
                        'source_name': job.source.name if job.source else None,
                        'source_url': job.source_url
                    })

                fallback_data = {
                    'success': True,
                    'data': {
                        'total': result['total'],
                        'page': result['page'],
                        'page_size': result['page_size'],
                        'total_pages': result['total_pages'],
                        'items': jobs_list
                    },
                    'fallback': True,
                    'fallback_message': 'Using cached data (service under maintenance)'
                }

                self._cache.set(cache_key, fallback_data)
                self._stats['fallback_used'] += 1
                self._stats['fallback_successful'] += 1
                self._stats['last_fallback_time'] = datetime.now().isoformat()

                return fallback_data

        except Exception as e:
            self._stats['fallback_failed'] += 1
            print(f"[FallbackService] Search fallback failed: {e}")
            return None

    def get_fallback_job_detail(self, job_id: int) -> Optional[Dict[str, Any]]:
        try:
            if not self.is_available():
                return None

            cache_key = f"job:{job_id}"
            cached = self._cache.get(cache_key)
            if cached:
                return cached

            with db_service.get_session() as session:
                job = db_service.get_job_by_id(session, job_id)
                if not job:
                    return None

                fallback_data = {
                    'success': True,
                    'data': {
                        'id': job.id,
                        'title': job.title,
                        'company_name': job.company_name,
                        'company_industry': job.company_industry,
                        'company_size': job.company_size,
                        'company_type': job.company_type,
                        'salary_min': job.salary_min,
                        'salary_max': job.salary_max,
                        'salary_avg': job.salary_avg,
                        'salary_original': job.salary_original,
                        'city': job.city,
                        'district': job.district,
                        'address': job.address,
                        'education': job.education,
                        'experience': job.experience,
                        'job_type': job.job_type,
                        'description': job.description,
                        'requirements': job.requirements,
                        'benefits': job.benefits,
                        'skills': job.skills,
                        'keywords': job.keywords,
                        'publish_date': job.publish_date.isoformat() if job.publish_date else None,
                        'crawl_date': job.crawl_date.isoformat() if job.crawl_date else None,
                        'view_count': job.view_count,
                        'favorite_count': job.favorite_count,
                        'source_name': job.source.name if job.source else None,
                        'source_url': job.source_url
                    },
                    'fallback': True
                }

                self._cache.set(cache_key, fallback_data)
                return fallback_data

        except Exception as e:
            print(f"[FallbackService] Job detail fallback failed: {e}")
            return None

    def get_fallback_dashboard(self, city: str = None) -> Optional[Dict[str, Any]]:
        try:
            if not self.is_available():
                return None

            cache_key = f"dashboard:{city}"
            cached = self._cache.get(cache_key)
            if cached:
                return cached

            with db_service.get_session() as session:
                total_jobs = session.query(Job).filter(Job.is_valid == True).count()

                today = datetime.now().date()
                today_start = datetime.combine(today, datetime.min.time())
                new_jobs_today = session.query(Job).filter(
                    Job.is_valid == True,
                    Job.created_at >= today_start
                ).count()

                total_salary = session.query(
                    db_service.get_session().query(Job.salary_avg).filter(
                        Job.is_valid == True,
                        Job.salary_avg.isnot(None)
                    ).scalar()
                )

                avg_salary = 0.0
                salary_jobs = session.query(Job).filter(
                    Job.is_valid == True,
                    Job.salary_avg.isnot(None)
                )
                salary_count = salary_jobs.count()
                if salary_count > 0:
                    from sqlalchemy import func
                    avg_result = session.query(func.avg(Job.salary_avg)).filter(
                        Job.is_valid == True,
                        Job.salary_avg.isnot(None)
                    ).scalar()
                    avg_salary = float(avg_result) if avg_result else 0.0

                cities = session.query(Job.city).filter(
                    Job.is_valid == True,
                    Job.city.isnot(None)
                ).distinct().count()

                fallback_data = {
                    'success': True,
                    'data': {
                        'summary': {
                            'total_jobs': total_jobs,
                            'new_today': new_jobs_today,
                            'avg_salary': round(avg_salary, 2) if avg_salary else 0,
                            'cities_covered': cities,
                        },
                        'daily_trend': self._get_daily_trend_fallback(session),
                        'weekday_distribution': self._get_weekday_fallback(session),
                        'crawl_status': self._get_crawl_status_fallback(session)
                    },
                    'fallback': True
                }

                self._cache.set(cache_key, fallback_data, ttl_seconds=60)
                return fallback_data

        except Exception as e:
            print(f"[FallbackService] Dashboard fallback failed: {e}")
            return None

    def _get_daily_trend_fallback(self, session) -> List[Dict[str, Any]]:
        try:
            from sqlalchemy import func
            from models.models import DailyNewJobStats

            days_ago_14 = datetime.now() - timedelta(days=14)
            stats = session.query(DailyNewJobStats).filter(
                DailyNewJobStats.date >= days_ago_14
            ).order_by(DailyNewJobStats.date).all()

            return [
                {
                    'date': stat.date.isoformat() if hasattr(stat, 'date') and stat.date else None,
                    'new_jobs': stat.new_jobs if hasattr(stat, 'new_jobs') else 0,
                    'total_jobs': stat.total_jobs if hasattr(stat, 'total_jobs') else 0
                }
                for stat in stats
            ]
        except:
            return []

    def _get_weekday_fallback(self, session) -> List[Dict[str, Any]]:
        try:
            weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            weekday_names_cn = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            return [
                {'weekday': weekday_names_cn[i], 'name': weekdays[i], 'count': 0}
                for i in range(7)
            ]
        except:
            return []

    def _get_crawl_status_fallback(self, session) -> Dict[str, Any]:
        try:
            from models.models import CrawlTask
            from sqlalchemy import desc

            recent_tasks = session.query(CrawlTask).order_by(
                desc(CrawlTask.created_at)
            ).limit(5).all()

            tasks_list = []
            running_count = 0
            completed_count = 0
            failed_count = 0

            for task in recent_tasks:
                tasks_list.append({
                    'id': task.id,
                    'status': task.status,
                    'new_items': task.new_items or 0,
                    'total_items': task.total_items or 0,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                    'completed_at': task.completed_at.isoformat() if task.completed_at else None
                })
                if task.status == 'running':
                    running_count += 1
                elif task.status == 'completed':
                    completed_count += 1
                elif task.status == 'failed':
                    failed_count += 1

            return {
                'is_running': running_count > 0,
                'running_count': running_count,
                'completed_count': completed_count,
                'failed_count': failed_count,
                'recent_tasks': tasks_list
            }
        except:
            return {
                'is_running': False,
                'running_count': 0,
                'completed_count': 0,
                'failed_count': 0,
                'recent_tasks': []
            }

    def get_stats(self) -> Dict[str, Any]:
        return {
            **self._stats,
            'cache_size': len(self._cache._cache),
            'enabled': self._enabled
        }

    def clear_cache(self):
        self._cache.clear()


fallback_service = FallbackService()
