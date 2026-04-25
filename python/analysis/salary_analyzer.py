import sys
import os
import json
from collections import defaultdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import ANALYSIS, CACHE
from services.db_service import db_service
from models.models import Job

class SalaryAnalyzer:
    def __init__(self):
        self.salary_bins = ANALYSIS['salary_bins']

    def _generate_cache_key(
        self,
        keyword: str = None,
        city: str = None,
        industry: str = None,
        education: str = None,
        experience: str = None,
        group_by: str = 'city'
    ) -> str:
        params = {
            'keyword': keyword,
            'city': city,
            'industry': industry,
            'education': education,
            'experience': experience,
            'group_by': group_by
        }
        param_str = json.dumps(params, sort_keys=True)
        return f"salary:{hashlib.md5(param_str.encode()).hexdigest()}"

    def get_salary_bin(self, salary_avg: float) -> str:
        if salary_avg is None:
            return '未知'
        
        for min_val, max_val, label in self.salary_bins:
            if min_val <= salary_avg < max_val:
                return label
        return '50k+'

    def analyze_distribution(
        self,
        keyword: str = None,
        city: str = None,
        industry: str = None,
        education: str = None,
        experience: str = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = self._generate_cache_key(keyword, city, industry, education, experience, 'distribution')
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.salary_avg.isnot(None)
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            if city:
                query = query.filter(Job.city == city)
            
            if industry:
                query = query.filter(Job.company_industry.like(f'%{industry}%'))
            
            if education:
                query = query.filter(Job.education == education)
            
            if experience:
                query = query.filter(Job.experience == experience)
            
            jobs = query.all()

        salary_counts = defaultdict(int)
        total_salary = 0
        valid_count = 0
        min_salary = float('inf')
        max_salary = float('-inf')

        for job in jobs:
            if job.salary_avg:
                bin_label = self.get_salary_bin(job.salary_avg)
                salary_counts[bin_label] += 1
                total_salary += job.salary_avg
                valid_count += 1
                min_salary = min(min_salary, job.salary_avg)
                max_salary = max(max_salary, job.salary_avg)

        distribution = []
        for _, _, label in self.salary_bins:
            distribution.append({
                'salary_range': label,
                'count': salary_counts.get(label, 0),
                'percentage': round(salary_counts.get(label, 0) / max(valid_count, 1) * 100, 2)
            })

        result = {
            'total_jobs': len(jobs),
            'valid_salary_jobs': valid_count,
            'avg_salary': round(total_salary / max(valid_count, 1), 2) if valid_count > 0 else 0,
            'min_salary': round(min_salary, 2) if min_salary != float('inf') else 0,
            'max_salary': round(max_salary, 2) if max_salary != float('-inf') else 0,
            'distribution': distribution,
            'params': {
                'keyword': keyword,
                'city': city,
                'industry': industry,
                'education': education,
                'experience': experience
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='salary_distribution',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def analyze_by_group(
        self,
        group_by: str = 'city',
        keyword: str = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        valid_groups = ['city', 'education', 'experience', 'industry', 'company_size']
        if group_by not in valid_groups:
            group_by = 'city'

        cache_key = self._generate_cache_key(keyword, None, None, None, None, group_by)
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.salary_avg.isnot(None)
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            jobs = query.all()

        group_data = defaultdict(list)
        
        for job in jobs:
            group_value = None
            
            if group_by == 'city':
                group_value = job.city
            elif group_by == 'education':
                group_value = job.education
            elif group_by == 'experience':
                group_value = job.experience
            elif group_by == 'industry':
                group_value = job.company_industry
            elif group_by == 'company_size':
                group_value = job.company_size
            
            if group_value and job.salary_avg:
                group_data[group_value].append(job.salary_avg)

        results = []
        for group_value, salaries in group_data.items():
            if salaries:
                avg_salary = sum(salaries) / len(salaries)
                results.append({
                    'group': group_value,
                    'count': len(salaries),
                    'avg_salary': round(avg_salary, 2),
                    'min_salary': round(min(salaries), 2),
                    'max_salary': round(max(salaries), 2)
                })

        results.sort(key=lambda x: x['avg_salary'], reverse=True)

        result = {
            'group_by': group_by,
            'total_jobs': len(jobs),
            'groups_count': len(results),
            'items': results,
            'params': {
                'group_by': group_by,
                'keyword': keyword
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='salary_group',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def analyze_trend(
        self,
        keyword: str = None,
        city: str = None,
        days: int = 90,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = f"salary_trend:{hashlib.md5(json.dumps({'keyword': keyword, 'city': city, 'days': days}).encode()).hexdigest()}"
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.salary_avg.isnot(None),
                Job.publish_date.isnot(None)
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            if city:
                query = query.filter(Job.city == city)
            
            if days > 0:
                cutoff_date = datetime.now() - timedelta(days=days)
                query = query.filter(Job.publish_date >= cutoff_date)
            
            jobs = query.all()

        daily_data = defaultdict(list)
        
        for job in jobs:
            if job.publish_date and job.salary_avg:
                date_key = job.publish_date.strftime('%Y-%m-%d')
                daily_data[date_key].append(job.salary_avg)

        trend = []
        sorted_dates = sorted(daily_data.keys())
        
        for date_key in sorted_dates:
            salaries = daily_data[date_key]
            avg_salary = sum(salaries) / len(salaries)
            trend.append({
                'date': date_key,
                'count': len(salaries),
                'avg_salary': round(avg_salary, 2),
                'min_salary': round(min(salaries), 2),
                'max_salary': round(max(salaries), 2)
            })

        result = {
            'total_jobs': len(jobs),
            'days_analyzed': days,
            'trend': trend,
            'params': {
                'keyword': keyword,
                'city': city,
                'days': days
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='salary_trend',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

salary_analyzer = SalaryAnalyzer()
