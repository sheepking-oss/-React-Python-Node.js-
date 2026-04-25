from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class JobSource(Base):
    __tablename__ = 'job_sources'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True, comment='来源名称，如：智联、BOSS直聘、猎聘')
    description = Column(String(200), nullable=True, comment='来源描述')
    base_url = Column(String(255), nullable=False, comment='基础URL')
    is_active = Column(Boolean, default=True, comment='是否启用')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    jobs = relationship('Job', back_populates='source')

class Job(Base):
    __tablename__ = 'jobs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    unique_key = Column(String(64), nullable=False, unique=True, comment='职位唯一标识，用于去重')
    source_id = Column(Integer, ForeignKey('job_sources.id'), nullable=False, comment='来源ID')
    source_job_id = Column(String(100), nullable=False, comment='来源平台的职位ID')
    source_url = Column(String(500), nullable=True, comment='原职位链接')

    title = Column(String(200), nullable=False, comment='职位名称')
    company_name = Column(String(200), nullable=False, comment='公司名称')
    company_size = Column(String(50), nullable=True, comment='公司规模')
    company_industry = Column(String(100), nullable=True, comment='公司行业')
    company_type = Column(String(50), nullable=True, comment='公司类型')

    salary_min = Column(Float, nullable=True, comment='最低薪资（月薪）')
    salary_max = Column(Float, nullable=True, comment='最高薪资（月薪）')
    salary_avg = Column(Float, nullable=True, comment='平均薪资')
    salary_original = Column(String(100), nullable=True, comment='原始薪资字符串')

    city = Column(String(50), nullable=True, comment='城市')
    district = Column(String(50), nullable=True, comment='行政区')
    address = Column(String(500), nullable=True, comment='详细地址')

    education = Column(String(50), nullable=True, comment='学历要求')
    experience = Column(String(50), nullable=True, comment='经验要求')
    job_type = Column(String(50), nullable=True, comment='工作类型：全职/兼职/实习')

    description = Column(Text, nullable=True, comment='职位描述')
    requirements = Column(Text, nullable=True, comment='任职要求')
    benefits = Column(String(500), nullable=True, comment='福利待遇')

    skills = Column(Text, nullable=True, comment='技能标签，JSON格式')
    keywords = Column(Text, nullable=True, comment='关键词，JSON格式')

    publish_date = Column(DateTime, nullable=True, comment='发布日期')
    last_update_date = Column(DateTime, nullable=True, comment='最后更新日期')
    crawl_date = Column(DateTime, default=datetime.now, comment='抓取日期')
    first_crawl_date = Column(DateTime, default=datetime.now, comment='首次抓取日期')

    is_valid = Column(Boolean, default=True, comment='是否有效')
    is_duplicate = Column(Boolean, default=False, comment='是否重复')
    duplicate_of = Column(Integer, nullable=True, comment='重复指向的职位ID')
    similarity_score = Column(Float, nullable=True, comment='重复相似度')

    view_count = Column(Integer, default=0, comment='查看次数')
    favorite_count = Column(Integer, default=0, comment='收藏次数')

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    source = relationship('JobSource', back_populates='jobs')
    favorites = relationship('Favorite', back_populates='job')
    comparisons = relationship('ComparisonItem', back_populates='job')

    __table_args__ = (
        Index('ix_jobs_title', 'title'),
        Index('ix_jobs_company_name', 'company_name'),
        Index('ix_jobs_city', 'city'),
        Index('ix_jobs_salary_avg', 'salary_avg'),
        Index('ix_jobs_publish_date', 'publish_date'),
        Index('ix_jobs_crawl_date', 'crawl_date'),
        Index('ix_jobs_unique_key', 'unique_key', unique=True),
    )

class Favorite(Base):
    __tablename__ = 'favorites'

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey('jobs.id'), nullable=False)
    user_session_id = Column(String(64), nullable=False, comment='用户会话ID')
    folder_name = Column(String(100), nullable=True, default='默认收藏夹', comment='收藏夹名称')
    notes = Column(String(500), nullable=True, comment='备注')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    job = relationship('Job', back_populates='favorites')

    __table_args__ = (
        UniqueConstraint('job_id', 'user_session_id', name='uq_favorite_job_user'),
        Index('ix_favorites_user_session_id', 'user_session_id'),
    )

class ComparisonSession(Base):
    __tablename__ = 'comparison_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_session_id = Column(String(64), nullable=False, comment='用户会话ID')
    name = Column(String(100), nullable=True, default='对比分析', comment='对比名称')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    items = relationship('ComparisonItem', back_populates='session', cascade='all, delete-orphan')

class ComparisonItem(Base):
    __tablename__ = 'comparison_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('comparison_sessions.id'), nullable=False)
    job_id = Column(Integer, ForeignKey('jobs.id'), nullable=False)
    order = Column(Integer, default=0, comment='排序')
    created_at = Column(DateTime, default=datetime.now)

    session = relationship('ComparisonSession', back_populates='items')
    job = relationship('Job', back_populates='comparisons')

    __table_args__ = (
        UniqueConstraint('session_id', 'job_id', name='uq_comparison_session_job'),
    )

class CrawlTask(Base):
    __tablename__ = 'crawl_tasks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_type = Column(String(50), nullable=False, comment='任务类型：full/incremental/keyword')
    source_id = Column(Integer, ForeignKey('job_sources.id'), nullable=True)
    keyword = Column(String(200), nullable=True, comment='搜索关键词')
    status = Column(String(20), default='pending', comment='状态：pending/running/completed/failed/cancelled')
    progress = Column(Integer, default=0, comment='进度百分比')
    total_items = Column(Integer, default=0, comment='总数')
    processed_items = Column(Integer, default=0, comment='已处理数')
    new_items = Column(Integer, default=0, comment='新增数')
    duplicate_items = Column(Integer, default=0, comment='重复数')
    error_message = Column(Text, nullable=True, comment='错误信息')
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class CrawlLog(Base):
    __tablename__ = 'crawl_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey('crawl_tasks.id'), nullable=True)
    source_id = Column(Integer, ForeignKey('job_sources.id'), nullable=True)
    level = Column(String(20), default='info', comment='日志级别：debug/info/warning/error')
    message = Column(Text, nullable=False, comment='日志消息')
    details = Column(Text, nullable=True, comment='详细信息')
    url = Column(String(500), nullable=True, comment='相关URL')
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (
        Index('ix_crawl_logs_created_at', 'created_at'),
        Index('ix_crawl_logs_level', 'level'),
    )

class AnalysisCache(Base):
    __tablename__ = 'analysis_cache'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(128), nullable=False, unique=True, comment='缓存键')
    cache_type = Column(String(50), nullable=False, comment='缓存类型：wordcloud/salary_trend/heatmap/daily_new')
    data = Column(Text, nullable=False, comment='缓存数据，JSON格式')
    query_params = Column(Text, nullable=True, comment='查询参数，JSON格式')
    expires_at = Column(DateTime, nullable=False, comment='过期时间')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index('ix_analysis_cache_cache_key', 'cache_key', unique=True),
        Index('ix_analysis_cache_cache_type', 'cache_type'),
        Index('ix_analysis_cache_expires_at', 'expires_at'),
    )

class DailyNewJobStats(Base):
    __tablename__ = 'daily_new_job_stats'

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, nullable=False, comment='统计日期')
    source_id = Column(Integer, ForeignKey('job_sources.id'), nullable=True)
    city = Column(String(50), nullable=True, comment='城市')
    industry = Column(String(100), nullable=True, comment='行业')
    job_count = Column(Integer, default=0, comment='新增岗位数量')
    avg_salary = Column(Float, nullable=True, comment='平均薪资')
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint('date', 'source_id', 'city', 'industry', name='uq_daily_stats_composite'),
        Index('ix_daily_stats_date', 'date'),
    )

class SkillKeyword(Base):
    __tablename__ = 'skill_keywords'

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String(100), nullable=False, unique=True, comment='关键词')
    category = Column(String(50), nullable=True, comment='分类：编程语言/框架/数据库/工具/其他')
    aliases = Column(Text, nullable=True, comment='别名，JSON格式')
    frequency = Column(Integer, default=0, comment='出现频率')
    is_active = Column(Boolean, default=True, comment='是否启用')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
