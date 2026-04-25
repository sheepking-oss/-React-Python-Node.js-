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
from models.models import Job

class HeatmapAnalyzer:
    def __init__(self):
        self.city_coords = {
            '北京': {'lat': 39.9042, 'lng': 116.4074},
            '上海': {'lat': 31.2304, 'lng': 121.4737},
            '深圳': {'lat': 22.5431, 'lng': 114.0579},
            '杭州': {'lat': 30.2741, 'lng': 120.1551},
            '广州': {'lat': 23.1291, 'lng': 113.2644},
            '成都': {'lat': 30.5728, 'lng': 104.0668},
            '武汉': {'lat': 30.5928, 'lng': 114.3055},
            '南京': {'lat': 32.0603, 'lng': 118.7969},
            '苏州': {'lat': 31.2990, 'lng': 120.5853},
            '西安': {'lat': 34.3416, 'lng': 108.9398},
            '重庆': {'lat': 29.4316, 'lng': 106.9123},
            '厦门': {'lat': 24.4798, 'lng': 118.0894},
            '天津': {'lat': 39.0842, 'lng': 117.2009},
            '青岛': {'lat': 36.0671, 'lng': 120.3826},
            '大连': {'lat': 38.9140, 'lng': 121.6147},
            '郑州': {'lat': 34.7466, 'lng': 113.6254},
            '长沙': {'lat': 28.2282, 'lng': 112.9388},
            '合肥': {'lat': 31.8206, 'lng': 117.2272},
            '济南': {'lat': 36.6512, 'lng': 117.1201},
            '沈阳': {'lat': 41.8057, 'lng': 123.4315},
        }

    def _generate_cache_key(
        self,
        keyword: str = None,
        industry: str = None,
        days: int = 30,
        metric: str = 'count'
    ) -> str:
        params = {
            'keyword': keyword,
            'industry': industry,
            'days': days,
            'metric': metric
        }
        param_str = json.dumps(params, sort_keys=True)
        return f"heatmap:{hashlib.md5(param_str.encode()).hexdigest()}"

    def analyze_by_city(
        self,
        keyword: str = None,
        industry: str = None,
        days: int = 30,
        metric: str = 'count',
        use_cache: bool = True
    ) -> Dict[str, Any]:
        valid_metrics = ['count', 'avg_salary', 'salary_growth']
        if metric not in valid_metrics:
            metric = 'count'

        cache_key = self._generate_cache_key(keyword, industry, days, metric)
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.city.isnot(None),
                Job.city != ''
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            if industry:
                query = query.filter(Job.company_industry.like(f'%{industry}%'))
            
            if days > 0:
                cutoff_date = datetime.now() - timedelta(days=days)
                query = query.filter(Job.publish_date >= cutoff_date)
            
            jobs = query.all()

        city_data = defaultdict(list)
        
        for job in jobs:
            if job.city:
                city_data[job.city].append(job)

        heatmap_data = []
        total_jobs = 0
        total_salary_sum = 0
        valid_salary_count = 0

        for city, city_jobs in city_data.items():
            count = len(city_jobs)
            total_jobs += count
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in city_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
                    total_salary_sum += job.salary_avg
                    valid_salary_count += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            coords = self.city_coords.get(city, {'lat': 0, 'lng': 0})
            
            if metric == 'count':
                value = count
            elif metric == 'avg_salary':
                value = avg_salary
            else:
                value = count
            
            heatmap_data.append({
                'city': city,
                'count': count,
                'avg_salary': avg_salary,
                'value': value,
                'lat': coords['lat'],
                'lng': coords['lng']
            })

        heatmap_data.sort(key=lambda x: x['value'], reverse=True)

        result = {
            'total_jobs': total_jobs,
            'cities_count': len(heatmap_data),
            'overall_avg_salary': round(total_salary_sum / max(valid_salary_count, 1), 2) if valid_salary_count > 0 else 0,
            'metric': metric,
            'days_analyzed': days,
            'heatmap': heatmap_data,
            'top_cities': heatmap_data[:15],
            'params': {
                'keyword': keyword,
                'industry': industry,
                'days': days,
                'metric': metric
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='heatmap',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def analyze_district_detail(
        self,
        city: str,
        keyword: str = None,
        days: int = 30,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = f"district:{hashlib.md5(json.dumps({'city': city, 'keyword': keyword, 'days': days}).encode()).hexdigest()}"
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.city == city
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            if days > 0:
                cutoff_date = datetime.now() - timedelta(days=days)
                query = query.filter(Job.publish_date >= cutoff_date)
            
            jobs = query.all()

        district_data = defaultdict(list)
        
        for job in jobs:
            if job.district:
                district_data[job.district].append(job)

        district_stats = []
        
        for district, district_jobs in district_data.items():
            count = len(district_jobs)
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in district_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            district_stats.append({
                'district': district,
                'count': count,
                'avg_salary': avg_salary,
                'percentage': round(count / max(len(jobs), 1) * 100, 2)
            })

        district_stats.sort(key=lambda x: x['count'], reverse=True)

        result = {
            'city': city,
            'total_jobs': len(jobs),
            'districts_count': len(district_stats),
            'districts': district_stats,
            'params': {
                'city': city,
                'keyword': keyword,
                'days': days
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='district_detail',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

    def compare_cities(
        self,
        cities: List[str],
        keyword: str = None,
        days: int = 30,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = f"compare_cities:{hashlib.md5(json.dumps({'cities': cities, 'keyword': keyword, 'days': days}).encode()).hexdigest()}"
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(
                Job.is_valid == True,
                Job.city.in_(cities)
            )
            
            if keyword:
                keyword_pattern = f'%{keyword}%'
                query = query.filter(
                    Job.title.like(keyword_pattern) |
                    Job.description.like(keyword_pattern)
                )
            
            if days > 0:
                cutoff_date = datetime.now() - timedelta(days=days)
                query = query.filter(Job.publish_date >= cutoff_date)
            
            jobs = query.all()

        comparison = []
        
        for city in cities:
            city_jobs = [j for j in jobs if j.city == city]
            count = len(city_jobs)
            
            salary_sum = 0
            valid_salary_jobs = 0
            
            for job in city_jobs:
                if job.salary_avg:
                    salary_sum += job.salary_avg
                    valid_salary_jobs += 1
            
            avg_salary = round(salary_sum / valid_salary_jobs, 2) if valid_salary_jobs > 0 else 0
            
            unique_companies = len(set(j.company_name for j in city_jobs if j.company_name))
            
            comparison.append({
                'city': city,
                'job_count': count,
                'avg_salary': avg_salary,
                'unique_companies': unique_companies,
                'job_percentage': round(count / max(len(jobs), 1) * 100, 2)
            })

        result = {
            'cities': cities,
            'total_jobs': len(jobs),
            'comparison': comparison,
            'params': {
                'cities': cities,
                'keyword': keyword,
                'days': days
            },
            'generated_at': datetime.now().isoformat()
        }

        with db_service.get_session() as session:
            db_service.set_analysis_cache(
                session,
                cache_key=cache_key,
                cache_type='city_comparison',
                data=result,
                query_params=result['params'],
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

heatmap_analyzer = HeatmapAnalyzer()
