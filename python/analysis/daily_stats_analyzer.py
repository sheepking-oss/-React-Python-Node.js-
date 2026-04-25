import sys
import os
import json
from collections import defaultdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import CACHE
from services.db_service import db_service
from models.models import Job, DailyNewJobStats

class DailyStatsAnalyzer:
    def __init__(self):
        pass

    def _generate_cache_key(
        self,
        city: str = None,
        industry: str = None,
        days: int = 30,
        group_by: str = 'date'
    ) -> str:
        params = {
            'city': city,
            'industry': industry,
            'days': days,
            'group_by': group_by
        }
        param_str = json.dumps(params, sort_keys=True)
        return f"daily_stats:{hashlib.md5(param_str.encode()).hexdigest()}"

    def analyze_daily_new_jobs(
        self,
        city: str = None,
        industry: str = None,
        days: int = 30,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = self._generate_cache_key(city, industry, days, 'date')
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=days - 1)

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.first_crawl_date >= start_date
            )
            
            if city:
                query = query.filter(Job.city == city)
            
            if industry:
                query = query.filter(Job.company_industry.like(f'%{industry}%'))
            
            jobs = query.all()

        daily_data = defaultdict(list)
        
        for job in jobs:
            if job.first_crawl_date:
                date_key = job.first_crawl_date.strftime('%Y-%m-%d')
                daily_data[date_key].append(job)

        daily_stats = []
        total_jobs = 0
        total_salary_sum = 0
        valid_salary_count = 0

        for i in range(days):
            date = start_date + timedelta(days=i)
            date_key = date.strftime('%Y-%m-%d')
            
            day_jobs = daily_data.get(date_key, [])
            count = len(day_jobs)
            total_jobs += count
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in day_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
                    total_salary_sum += job.salary_avg
                    valid_salary_count += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            daily_stats.append({
                'date': date_key,
                'day_of_week': date.strftime('%A'),
                'new_jobs': count,
                'avg_salary': avg_salary,
                'weekday': date.weekday()
            })

        stats = {
            'total_new_jobs': total_jobs,
            'avg_daily_new_jobs': round(total_jobs / max(days, 1), 2),
            'max_daily_new_jobs': max(day['new_jobs'] for day in daily_stats) if daily_stats else 0,
            'min_daily_new_jobs': min(day['new_jobs'] for day in daily_stats) if daily_stats else 0,
            'overall_avg_salary': round(total_salary_sum / max(valid_salary_count, 1), 2) if valid_salary_count > 0 else 0,
        }

        result = {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'days_analyzed': days,
            'summary': stats,
            'daily_stats': daily_stats,
            'params': {
                'city': city,
                'industry': industry,
                'days': days
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='daily_new',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def analyze_by_weekday(
        self,
        city: str = None,
        industry: str = None,
        days: int = 90,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = self._generate_cache_key(city, industry, days, 'weekday')
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=days - 1)

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.first_crawl_date >= start_date
            )
            
            if city:
                query = query.filter(Job.city == city)
            
            if industry:
                query = query.filter(Job.company_industry.like(f'%{industry}%'))
            
            jobs = query.all()

        weekday_data = defaultdict(list)
        weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        for job in jobs:
            if job.first_crawl_date:
                weekday = job.first_crawl_date.weekday()
                weekday_data[weekday].append(job)

        weekday_stats = []
        for i in range(7):
            day_jobs = weekday_data.get(i, [])
            count = len(day_jobs)
            
            weeks_covered = days // 7
            avg_per_week = round(count / max(weeks_covered, 1), 2)
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in day_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            weekday_stats.append({
                'weekday': i,
                'weekday_name': weekday_names[i],
                'total_jobs': count,
                'avg_per_week': avg_per_week,
                'avg_salary': avg_salary
            })

        result = {
            'days_analyzed': days,
            'weeks_covered': days // 7,
            'weekday_stats': weekday_stats,
            'busiest_day': max(weekday_stats, key=lambda x: x['total_jobs'])['weekday_name'] if weekday_stats else None,
            'quietest_day': min(weekday_stats, key=lambda x: x['total_jobs'])['weekday_name'] if weekday_stats else None,
            'params': {
                'city': city,
                'industry': industry,
                'days': days
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='weekday_analysis',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def analyze_industry_trend(
        self,
        city: str = None,
        days: int = 30,
        top_n: int = 10,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = f"industry_trend:{hashlib.md5(json.dumps({'city': city, 'days': days, 'top_n': top_n}).encode()).hexdigest()}"
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=days - 1)

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.first_crawl_date >= start_date,
                Job.company_industry.isnot(None),
                Job.company_industry != ''
            )
            
            if city:
                query = query.filter(Job.city == city)
            
            jobs = query.all()

        industry_data = defaultdict(list)
        
        for job in jobs:
            if job.company_industry:
                industries = [i.strip() for i in job.company_industry.replace('/', ',').split(',')]
                for industry in industries:
                    if industry:
                        industry_data[industry].append(job)

        industry_stats = []
        
        for industry, industry_jobs in industry_data.items():
            count = len(industry_jobs)
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in industry_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            industry_stats.append({
                'industry': industry,
                'job_count': count,
                'avg_salary': avg_salary,
                'percentage': round(count / max(len(jobs), 1) * 100, 2)
            })

        industry_stats.sort(key=lambda x: x['job_count'], reverse=True)

        result = {
            'days_analyzed': days,
            'total_industries': len(industry_stats),
            'top_industries': industry_stats[:top_n],
            'all_industries': industry_stats,
            'params': {
                'city': city,
                'days': days,
                'top_n': top_n
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='industry_trend',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def get_realtime_dashboard(
        self,
        city: str = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = f"realtime_dashboard:{hashlib.md5(json.dumps({'city': city}).encode()).hexdigest()}"
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        with db_service.get_session() as session:
            from sqlalchemy import func, and_
            
            base_query = session.query(Job).filter(Job.is_valid == True)
            if city:
                base_query = base_query.filter(Job.city == city)
            
            total_jobs = base_query.count()
            
            today_jobs = base_query.filter(
                Job.first_crawl_date >= today
            ).count()
            
            yesterday_jobs = base_query.filter(
                Job.first_crawl_date >= yesterday,
                Job.first_crawl_date < today
            ).count()
            
            this_week_jobs = base_query.filter(
                Job.first_crawl_date >= week_ago
            ).count()
            
            this_month_jobs = base_query.filter(
                Job.first_crawl_date >= month_ago
            ).count()
            
            avg_salary = session.query(func.avg(Job.salary_avg)).filter(
                Job.is_valid == True,
                Job.salary_avg.isnot(None)
            ).scalar()

        growth_from_yesterday = 0
        if yesterday_jobs > 0:
            growth_from_yesterday = round((today_jobs - yesterday_jobs) / yesterday_jobs * 100, 2)

        result = {
            'today': today.strftime('%Y-%m-%d'),
            'metrics': {
                'total_jobs': total_jobs,
                'today_new_jobs': today_jobs,
                'yesterday_new_jobs': yesterday_jobs,
                'this_week_new_jobs': this_week_jobs,
                'this_month_new_jobs': this_month_jobs,
                'avg_salary': round(avg_salary, 2) if avg_salary else 0,
                'growth_from_yesterday': growth_from_yesterday
            },
            'city': city,
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='realtime_dashboard',
                data=result,
                query_params={'city': city},
                ttl_hours=1
            )

        return result

daily_stats_analyzer = DailyStatsAnalyzer()
