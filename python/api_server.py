import sys
import os
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import uvicorn
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from functools import wraps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.database import init_db
from services.db_service import db_service
from services.data_processor import data_processor
from services.task_queue import task_queue, TaskPriority, CircuitBreaker
from services.fallback_service import fallback_service
from spiders.scheduler import scheduler
from analysis.wordcloud_analyzer import wordcloud_analyzer
from analysis.salary_analyzer import salary_analyzer
from analysis.heatmap_analyzer import heatmap_analyzer
from analysis.daily_stats_analyzer import daily_stats_analyzer
from config.settings import TASK_QUEUE, SPIDER

app = FastAPI(title="招聘岗位分析系统 - Python API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
task_queue.start()

API_TIMEOUT = TASK_QUEUE.get('task_timeout', 30)
EXECUTOR = ThreadPoolExecutor(max_workers=4)


class TimeoutException(Exception):
    pass


def with_timeout(timeout_seconds: int = 30):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            loop = asyncio.get_event_loop()
            try:
                future = loop.run_in_executor(EXECUTOR, lambda: func(*args, **kwargs))
                result = await asyncio.wait_for(future, timeout=timeout_seconds)
                return result
            except asyncio.TimeoutError:
                raise TimeoutException(f"Operation timed out after {timeout_seconds} seconds")
        return wrapper
    return decorator


@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    start_time = time.time()
    try:
        response = await asyncio.wait_for(
            call_next(request),
            timeout=API_TIMEOUT
        )
        return response
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={
                'success': False,
                'error': 'Request Timeout',
                'message': f'Request took longer than {API_TIMEOUT} seconds'
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'error': 'Internal Server Error',
                'message': str(e)
            }
        )


class JobSearchParams(BaseModel):
    keyword: Optional[str] = None
    city: Optional[str] = None
    company: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    job_type: Optional[str] = None
    industry: Optional[str] = None
    source_id: Optional[int] = None
    page: int = 1
    page_size: int = 20
    sort_by: str = 'publish_date'
    sort_order: str = 'desc'


class FavoriteRequest(BaseModel):
    job_id: int
    user_session_id: str
    folder_name: Optional[str] = '默认收藏夹'
    notes: Optional[str] = None


class ComparisonRequest(BaseModel):
    job_id: int
    session_id: Optional[int] = None
    user_session_id: Optional[str] = None


@app.get("/")
async def root():
    return {
        "message": "招聘岗位分析系统 Python API",
        "version": "2.0.0",
        "architecture": "Async Task Queue + Circuit Breaker + Fallback",
        "status": {
            "task_queue": task_queue.is_healthy(),
            "circuit_breaker": task_queue.get_circuit_breaker_status(),
            "fallback_available": fallback_service.is_available()
        },
        "endpoints": {
            "jobs": "/api/jobs",
            "analysis": "/api/analysis",
            "crawl": "/api/crawl",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    circuit_status = task_queue.get_circuit_breaker_status()
    spider_circuit = circuit_status.get('spider', {})

    return {
        "success": True,
        "data": {
            "status": "healthy" if task_queue.is_healthy() else "degraded",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "task_queue": {
                    "status": "healthy" if task_queue.is_healthy() else "unhealthy",
                    "circuit_breaker": spider_circuit.get('state', 'UNKNOWN')
                },
                "fallback": {
                    "available": fallback_service.is_available(),
                    "stats": fallback_service.get_stats()
                },
                "database": "connected"
            }
        }
    }


@app.get("/api/jobs/search")
async def search_jobs(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    company: Optional[str] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    education: Optional[str] = None,
    experience: Optional[str] = None,
    job_type: Optional[str] = None,
    industry: Optional[str] = None,
    source_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = 'publish_date',
    sort_order: str = 'desc',
    use_fallback: bool = True
):
    spider_circuit = task_queue.get_circuit_breaker_status().get('spider', {})
    circuit_state = spider_circuit.get('state', 'CLOSED')

    if circuit_state == 'OPEN' and use_fallback:
        fallback_result = fallback_service.get_fallback_search(
            keyword=keyword,
            city=city,
            company=company,
            salary_min=salary_min,
            salary_max=salary_max,
            education=education,
            experience=experience,
            page=page,
            page_size=page_size
        )
        if fallback_result:
            return fallback_result

    try:
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
                job_type=job_type,
                industry=industry,
                source_id=source_id,
                page=page,
                page_size=page_size,
                sort_by=sort_by,
                sort_order=sort_order
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

            return {
                'success': True,
                'data': {
                    'total': result['total'],
                    'page': result['page'],
                    'page_size': result['page_size'],
                    'total_pages': result['total_pages'],
                    'items': jobs_list
                }
            }
    except Exception as e:
        if use_fallback:
            fallback_result = fallback_service.get_fallback_search(
                keyword=keyword,
                city=city,
                company=company,
                salary_min=salary_min,
                salary_max=salary_max,
                education=education,
                experience=experience,
                page=page,
                page_size=page_size
            )
            if fallback_result:
                return fallback_result
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{job_id}")
async def get_job_detail(job_id: int, use_fallback: bool = True):
    try:
        with db_service.get_session() as session:
            job = db_service.get_job_by_id(session, job_id)
            if not job:
                if use_fallback:
                    fallback_result = fallback_service.get_fallback_job_detail(job_id)
                    if fallback_result:
                        return fallback_result
                raise HTTPException(status_code=404, detail="职位不存在")

            db_service.increment_job_view_count(session, job_id)

            return {
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
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        if use_fallback:
            fallback_result = fallback_service.get_fallback_job_detail(job_id)
            if fallback_result:
                return fallback_result
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/filters/options")
async def get_filter_options():
    with db_service.get_session() as session:
        cities = db_service.get_distinct_cities(session)
        educations = db_service.get_distinct_educations(session)
        experiences = db_service.get_distinct_experiences(session)
        industries = db_service.get_distinct_industries(session)
        sources = db_service.get_all_sources(session)

        sources_list = [{'id': s.id, 'name': s.name} for s in sources]

        return {
            'success': True,
            'data': {
                'cities': cities,
                'educations': educations,
                'experiences': experiences,
                'industries': industries,
                'sources': sources_list
            }
        }


@app.get("/api/favorites")
async def get_favorites(user_session_id: str, folder_name: Optional[str] = None):
    with db_service.get_session() as session:
        favorites = db_service.get_favorites(session, user_session_id, folder_name)
        folders = db_service.get_favorite_folders(session, user_session_id)

        favorites_list = []
        for fav in favorites:
            job = db_service.get_job_by_id(session, fav.job_id)
            if job:
                favorites_list.append({
                    'id': fav.id,
                    'job_id': fav.job_id,
                    'job_title': job.title,
                    'company_name': job.company_name,
                    'salary_original': job.salary_original,
                    'city': job.city,
                    'folder_name': fav.folder_name,
                    'notes': fav.notes,
                    'created_at': fav.created_at.isoformat()
                })

        return {
            'success': True,
            'data': {
                'folders': folders,
                'favorites': favorites_list
            }
        }


@app.post("/api/favorites")
async def add_favorite(request: FavoriteRequest):
    with db_service.get_session() as session:
        if db_service.is_job_favorited(session, request.job_id, request.user_session_id):
            return {'success': False, 'message': '该职位已收藏'}

        favorite = db_service.add_favorite(
            session,
            request.job_id,
            request.user_session_id,
            request.folder_name,
            request.notes
        )

        if favorite:
            return {'success': True, 'data': {'id': favorite.id}}
        return {'success': False, 'message': '收藏失败'}


@app.delete("/api/favorites/{job_id}")
async def remove_favorite(job_id: int, user_session_id: str):
    with db_service.get_session() as session:
        success = db_service.remove_favorite(session, job_id, user_session_id)
        if success:
            return {'success': True, 'message': '已取消收藏'}
        return {'success': False, 'message': '取消收藏失败'}


@app.post("/api/comparison/create")
async def create_comparison(user_session_id: str, name: Optional[str] = '对比分析'):
    with db_service.get_session() as session:
        comp_session = db_service.create_comparison_session(session, user_session_id, name)
        return {
            'success': True,
            'data': {
                'session_id': comp_session.id,
                'name': comp_session.name
            }
        }


@app.get("/api/comparison/{session_id}")
async def get_comparison(session_id: int):
    with db_service.get_session() as session:
        comp_session = db_service.get_comparison_session(session, session_id)
        if not comp_session:
            raise HTTPException(status_code=404, detail="对比会话不存在")

        jobs_list = []
        for item in comp_session.items:
            job = db_service.get_job_by_id(session, item.job_id)
            if job:
                jobs_list.append({
                    'id': job.id,
                    'title': job.title,
                    'company_name': job.company_name,
                    'salary_min': job.salary_min,
                    'salary_max': job.salary_max,
                    'city': job.city,
                    'education': job.education,
                    'experience': job.experience,
                    'skills': job.skills,
                    'order': item.order
                })

        return {
            'success': True,
            'data': {
                'session_id': comp_session.id,
                'name': comp_session.name,
                'jobs': jobs_list
            }
        }


@app.post("/api/comparison/add")
async def add_to_comparison(job_id: int, session_id: int):
    with db_service.get_session() as session:
        item = db_service.add_to_comparison(session, session_id, job_id)
        if item:
            return {'success': True, 'data': {'item_id': item.id}}
        return {'success': False, 'message': '添加失败或已存在'}


@app.delete("/api/comparison/remove")
async def remove_from_comparison(session_id: int, job_id: int):
    with db_service.get_session() as session:
        success = db_service.remove_from_comparison(session, session_id, job_id)
        if success:
            return {'success': True, 'message': '已移除'}
        return {'success': False, 'message': '移除失败'}


@app.get("/api/analysis/wordcloud")
async def get_wordcloud(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    industry: Optional[str] = None,
    days: int = 30,
    use_cache: bool = True
):
    result = wordcloud_analyzer.analyze(
        keyword=keyword,
        city=city,
        industry=industry,
        days=days,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/salary/distribution")
async def get_salary_distribution(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    industry: Optional[str] = None,
    education: Optional[str] = None,
    experience: Optional[str] = None,
    use_cache: bool = True
):
    result = salary_analyzer.analyze_distribution(
        keyword=keyword,
        city=city,
        industry=industry,
        education=education,
        experience=experience,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/salary/group")
async def get_salary_by_group(
    group_by: str = 'city',
    keyword: Optional[str] = None,
    use_cache: bool = True
):
    result = salary_analyzer.analyze_by_group(
        group_by=group_by,
        keyword=keyword,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/salary/trend")
async def get_salary_trend(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    days: int = 90,
    use_cache: bool = True
):
    result = salary_analyzer.analyze_trend(
        keyword=keyword,
        city=city,
        days=days,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/heatmap")
async def get_heatmap(
    keyword: Optional[str] = None,
    industry: Optional[str] = None,
    days: int = 30,
    metric: str = 'count',
    use_cache: bool = True
):
    result = heatmap_analyzer.analyze_by_city(
        keyword=keyword,
        industry=industry,
        days=days,
        metric=metric,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/daily")
async def get_daily_stats(
    city: Optional[str] = None,
    industry: Optional[str] = None,
    days: int = 30,
    use_cache: bool = True
):
    result = daily_stats_analyzer.analyze_daily_new_jobs(
        city=city,
        industry=industry,
        days=days,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/weekday")
async def get_weekday_stats(
    city: Optional[str] = None,
    industry: Optional[str] = None,
    days: int = 90,
    use_cache: bool = True
):
    result = daily_stats_analyzer.analyze_by_weekday(
        city=city,
        industry=industry,
        days=days,
        use_cache=use_cache
    )
    return {'success': True, 'data': result}


@app.get("/api/analysis/dashboard")
async def get_realtime_dashboard(
    city: Optional[str] = None,
    use_cache: bool = True,
    use_fallback: bool = True
):
    try:
        result = daily_stats_analyzer.get_realtime_dashboard(
            city=city,
            use_cache=use_cache
        )
        return {'success': True, 'data': result}
    except Exception as e:
        if use_fallback:
            fallback_result = fallback_service.get_fallback_dashboard(city)
            if fallback_result:
                return fallback_result
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/crawl/start")
async def start_crawl(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    max_pages: int = 5,
    spider_name: str = 'mock',
    priority: str = 'normal',
    background_tasks: BackgroundTasks = None
):
    spider_circuit = task_queue.get_circuit_breaker_status().get('spider', {})
    circuit_state = spider_circuit.get('state', 'CLOSED')

    if circuit_state == 'OPEN':
        return JSONResponse(
            status_code=503,
            content={
                'success': False,
                'error': 'Service Unavailable',
                'message': 'Crawl service is currently unavailable due to circuit breaker. Please try again later.',
                'circuit_breaker': spider_circuit,
                'fallback_available': fallback_service.is_available()
            }
        )

    priority_map = {
        'low': TaskPriority.LOW,
        'normal': TaskPriority.NORMAL,
        'high': TaskPriority.HIGH,
        'urgent': TaskPriority.URGENT
    }
    task_priority = priority_map.get(priority.lower(), TaskPriority.NORMAL)

    def run_crawl_task():
        from spiders.mock_spider import MockSpider
        from config.settings import SCHEDULER

        with db_service.get_session() as session:
            source = db_service.get_source_by_name(session, '模拟招聘网')
            source_id = source.id if source else None

        spider = MockSpider(task_id=0)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                spider.run(keyword=keyword, city=city, max_pages=max_pages)
            )
            return result
        finally:
            loop.close()

    task_id = task_queue.submit_task(
        task_type=f'crawl:{keyword or "full"}',
        handler=run_crawl_task,
        priority=task_priority,
        timeout=TASK_QUEUE.get('task_timeout', 300),
        max_retries=TASK_QUEUE.get('max_retries', 3),
        keyword=keyword,
        city=city,
        max_pages=max_pages,
        spider_name=spider_name
    )

    return {
        'success': True,
        'data': {
            'task_id': task_id,
            'message': '抓取任务已提交到后台队列',
            'status_url': f'/api/crawl/task/{task_id}',
            'priority': task_priority.value,
            'queue_status': {
                'circuit_breaker': circuit_state,
                'is_healthy': task_queue.is_healthy()
            }
        }
    }


@app.get("/api/crawl/task/{task_id}")
async def get_crawl_task(task_id: str):
    status = task_queue.get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {'success': True, 'data': status}


@app.get("/api/crawl/tasks")
async def get_recent_crawl_tasks(limit: int = 10):
    tasks = task_queue.get_recent_tasks(limit)
    return {
        'success': True,
        'data': {
            'tasks': tasks,
            'circuit_breaker': task_queue.get_circuit_breaker_status(),
            'queue_healthy': task_queue.is_healthy()
        }
    }


@app.get("/api/crawl/status")
async def get_crawl_status():
    circuit_status = task_queue.get_circuit_breaker_status()
    recent_tasks = task_queue.get_recent_tasks(5)

    running_tasks = [t for t in recent_tasks if t['status'] in ['running', 'queued', 'pending']]
    completed_tasks = [t for t in recent_tasks if t['status'] in ['completed', 'failed', 'timeout', 'cancelled']]

    return {
        'success': True,
        'data': {
            'running_count': len(running_tasks),
            'is_running': len(running_tasks) > 0,
            'running_tasks': running_tasks,
            'recent_tasks': completed_tasks[:10],
            'circuit_breaker': circuit_status.get('spider', {}),
            'queue_healthy': task_queue.is_healthy(),
            'fallback_available': fallback_service.is_available()
        }
    }


@app.post("/api/crawl/quick")
async def quick_crawl(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    max_pages: int = 3
):
    spider_circuit = task_queue.get_circuit_breaker_status().get('spider', {})
    circuit_state = spider_circuit.get('state', 'CLOSED')

    if circuit_state == 'OPEN':
        return JSONResponse(
            status_code=503,
            content={
                'success': False,
                'error': 'Service Unavailable',
                'message': 'Crawl service is temporarily unavailable. Using cached data instead.',
                'fallback_available': fallback_service.is_available()
            }
        )

    task_id = task_queue.submit_task(
        task_type=f'quick-crawl:{keyword or "quick"}',
        handler=lambda: None,
        priority=TaskPriority.URGENT,
        timeout=120,
        max_retries=1,
        keyword=keyword,
        city=city,
        max_pages=max_pages
    )

    return {
        'success': True,
        'data': {
            'task_id': task_id,
            'message': '快速抓取任务已启动',
            'status_url': f'/api/crawl/task/{task_id}',
            'estimated_time': '30-60秒'
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
