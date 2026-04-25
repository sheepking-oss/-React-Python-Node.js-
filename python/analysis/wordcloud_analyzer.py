import sys
import os
import json
import re
from collections import Counter
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import ANALYSIS, CACHE
from services.db_service import db_service
from models.models import Job

class WordCloudAnalyzer:
    def __init__(self):
        self.stopwords = set(ANALYSIS['wordcloud_stopwords'])

    def _generate_cache_key(self, keyword: str = None, city: str = None, industry: str = None, days: int = 30) -> str:
        params = {
            'keyword': keyword,
            'city': city,
            'industry': industry,
            'days': days
        }
        param_str = json.dumps(params, sort_keys=True)
        return f"wordcloud:{hashlib.md5(param_str.encode()).hexdigest()}"

    def extract_words_from_text(self, text: str) -> List[str]:
        if not text:
            return []
        
        text = text.lower()
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', ' ', text)
        
        chinese_chars = re.findall(r'[\u4e00-\u9fa5]+', text)
        english_words = re.findall(r'[a-zA-Z]+', text)
        
        words = []
        for char_seq in chinese_chars:
            if len(char_seq) >= 2:
                words.append(char_seq)
        
        for word in english_words:
            if len(word) >= 2 and word not in self.stopwords:
                words.append(word)
        
        return words

    def extract_skills_from_jobs(self, jobs: List[Job]) -> Counter:
        skill_counter = Counter()
        
        for job in jobs:
            if job.skills:
                try:
                    skills = json.loads(job.skills)
                    for skill in skills:
                        skill_counter[skill] += 1
                except:
                    pass
            
            all_text = ' '.join([
                job.title or '',
                job.description or '',
                job.requirements or ''
            ])
            
            words = self.extract_words_from_text(all_text)
            for word in words:
                if word not in self.stopwords:
                    skill_counter[word] += 1
        
        return skill_counter

    def analyze(
        self,
        keyword: str = None,
        city: str = None,
        industry: str = None,
        days: int = 30,
        top_n: int = 100,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        cache_key = self._generate_cache_key(keyword, city, industry, days)
        
        if use_cache:
            with db_service.get_session() as session:
                cached = db_service.get_analysis_cache(session, cache_key)
                if cached:
                    return cached['data']

        with db_service.get_session() as session:
            query = session.query(Job).filter(Job.is_valid == True)
            
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
            
            if days > 0:
                cutoff_date = datetime.now() - timedelta(days=days)
                query = query.filter(Job.publish_date >= cutoff_date)
            
            jobs = query.all()

        skill_counter = self.extract_skills_from_jobs(jobs)
        
        top_skills = skill_counter.most_common(top_n)
        
        wordcloud_data = [
            {'word': word, 'count': count, 'weight': count}
            for word, count in top_skills
            if count > 0
        ]
        
        result = {
            'total_jobs': len(jobs),
            'unique_words': len(skill_counter),
            'wordcloud': wordcloud_data,
            'top_skills': [{'skill': w, 'count': c} for w, c in top_skills[:20]],
            'params': {
                'keyword': keyword,
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
                cache_type='wordcloud',
                data=result,
                query_params={'keyword': keyword, 'city': city, 'industry': industry, 'days': days},
                ttl_hours=CACHE['analysis_ttl'].seconds // 3600
            )

        return result

wordcloud_analyzer = WordCloudAnalyzer()
