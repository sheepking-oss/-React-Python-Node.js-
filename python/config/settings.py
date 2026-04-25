import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE = {
    'type': 'sqlite',
    'path': os.path.join(BASE_DIR, 'data', 'jobs.db'),
    'url': 'sqlite:///' + os.path.join(BASE_DIR, 'data', 'jobs.db')
}

REDIS = {
    'host': 'localhost',
    'port': 6379,
    'db': 0,
    'decode_responses': True
}

CACHE = {
    'default_ttl': timedelta(hours=1),
    'analysis_ttl': timedelta(hours=2),
    'jobs_list_ttl': timedelta(minutes=30)
}

SPIDER = {
    'max_retry': 3,
    'retry_delay': 5,
    'timeout': 30,
    'concurrent_requests': 5,
    'user_agents': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ]
}

SCHEDULER = {
    'daily_crawl_time': '02:00',
    'incremental_crawl_interval': timedelta(hours=4),
    'max_jobs_per_source': 1000
}

DATA_PROCESSING = {
    'similarity_threshold': 0.85,
    'min_salary': 1000,
    'max_salary': 1000000,
    'skills_list': [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby',
        'React', 'Vue', 'Angular', 'Node.js', 'Next.js', 'Nuxt',
        'Spring', 'Django', 'Flask', 'FastAPI', 'Express',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Docker', 'Kubernetes', 'AWS', '阿里云', '腾讯云',
        '机器学习', '深度学习', '人工智能', '数据挖掘', '数据分析',
        'Git', 'Linux', '微服务', '分布式', '高并发'
    ]
}

DEDUP_CONFIG = {
    'thresholds': {
        'high_confidence': 0.85,
        'medium_confidence': 0.70,
        'low_confidence': 0.55,
        'exact_match': 0.95,
    },
    'weights': {
        'company': 0.35,
        'title_type': 0.25,
        'title_keyword': 0.15,
        'location': 0.15,
        'salary': 0.10,
    },
    'company_normalization': {
        'remove_region_prefix': True,
        'remove_suffix': True,
        'remove_industry_tags': True,
        'abbreviation_enabled': True,
    },
    'title_normalization': {
        'extract_level': True,
        'extract_type': True,
        'extract_keywords': True,
    },
    'salary_matching': {
        'overlap_threshold': 0.5,
        'tolerance_percent': 0.3,
    },
    'location_matching': {
        'use_alias': True,
        'fuzzy_match': True,
    },
    'deduplication_strategy': {
        'merge_duplicates': True,
        'keep_latest': True,
        'merge_sources': True,
        'log_duplicates': True,
    }
}

ANALYSIS = {
    'wordcloud_stopwords': [
        '的', '和', '是', '在', '了', '与', '及', '或', '等', '有',
        '要求', '负责', '参与', '协助', '完成', '进行', '相关', '工作',
        '岗位', '职位', '招聘', '经验', '学历', '优先', '熟悉', '掌握', '了解'
    ],
    'salary_bins': [
        (0, 5000, '0-5k'),
        (5000, 10000, '5k-10k'),
        (10000, 15000, '10k-15k'),
        (15000, 20000, '15k-20k'),
        (20000, 30000, '20k-30k'),
        (30000, 50000, '30k-50k'),
        (50000, float('inf'), '50k+')
    ]
}

API = {
    'default_page_size': 20,
    'max_page_size': 100
}

TASK_QUEUE = {
    'worker_count': 4,
    'task_timeout': 300,
    'max_retries': 3,
    'queue_timeout': 5.0,
    'circuit_breaker': {
        'failure_threshold': 5,
        'recovery_timeout': 60,
        'success_threshold': 3,
    }
}

FALLBACK = {
    'enabled': True,
    'max_data_age_hours': 24,
    'min_jobs_required': 10,
    'cache_ttl_seconds': 300,
}
