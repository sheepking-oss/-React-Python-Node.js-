import sys
import os
import re
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple, Set
from datetime import datetime
import difflib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_PROCESSING, DEDUP_CONFIG
from services.dedup_service import (
    company_normalizer,
    job_title_normalizer,
    location_matcher,
    salary_matcher,
    duplicate_detector,
    CompanyNormalizer,
    JobTitleNormalizer,
)


class DataProcessor:
    EDUCATION_MAP = {
        '不限': '不限', '无要求': '不限', '学历不限': '不限',
        '高中': '高中', '中专': '中专', '技校': '技校', '高中及以上': '高中',
        '大专': '大专', '专科': '大专', '大专及以上': '大专',
        '本科': '本科', '二本': '本科', '一本': '本科', '本科及以上': '本科',
        '硕士': '硕士', '研究生': '硕士', '硕士及以上': '硕士',
        '博士': '博士', '博士及以上': '博士'
    }

    EXPERIENCE_MAP = {
        '不限': '不限', '无要求': '不限', '经验不限': '不限',
        '应届生': '应届生', '应届毕业生': '应届生', '毕业生': '应届生',
        '1年以内': '1年以内', '1年以下': '1年以内', '0-1年': '1年以内',
        '1-3年': '1-3年', '1到3年': '1-3年', '1年至3年': '1-3年',
        '3-5年': '3-5年', '3到5年': '3-5年', '3年至5年': '3-5年',
        '5-10年': '5-10年', '5到10年': '5-10年', '5年至10年': '5-10年',
        '10年以上': '10年以上', '10年及以上': '10年以上', '十年以上': '10年以上'
    }

    JOB_TYPE_MAP = {
        '全职': '全职', 'full-time': '全职',
        '兼职': '兼职', 'part-time': '兼职',
        '实习': '实习', 'intern': '实习', '实习生': '实习',
        '临时': '临时', '临时工': '临时'
    }

    def __init__(self):
        self.company_normalizer = company_normalizer
        self.title_normalizer = job_title_normalizer
        self.location_matcher = location_matcher
        self.salary_matcher = salary_matcher
        self.duplicate_detector = duplicate_detector

    def normalize_company_name(self, company_name: str) -> Tuple[str, str, Set[str]]:
        return self.company_normalizer.normalize(company_name)

    def normalize_job_title(self, title: str) -> Tuple[str, int, str, Set[str]]:
        return self.title_normalizer.normalize(title)

    def generate_unique_key(self, title: str, company_name: str, city: str = None, salary_original: str = None) -> str:
        norm_title, _, _, _ = self.normalize_job_title(title)
        norm_company, _, _ = self.normalize_company_name(company_name)
        norm_city = self.normalize_city(city) if city else ''

        base_str = f"{norm_title}|{norm_company}"
        if norm_city:
            base_str += f"|{norm_city}"

        return hashlib.md5(base_str.encode('utf-8')).hexdigest()

    def generate_advanced_unique_key(self, job_data: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        title = job_data.get('title', '')
        company_name = job_data.get('company_name', '')
        city = job_data.get('city', '')
        salary_min = job_data.get('salary_min')
        salary_max = job_data.get('salary_max')

        norm_title, title_level, title_type, title_keywords = self.normalize_job_title(title)
        norm_company, orig_company, company_tokens = self.normalize_company_name(company_name)
        norm_city, orig_city, city_tokens = self.location_matcher.normalize(city)

        key_components = [
            norm_company,
            title_type if title_type else norm_title,
            norm_city
        ]
        key_components = [k for k in key_components if k]

        base_key = '|'.join(key_components)
        unique_key = hashlib.md5(base_key.encode('utf-8')).hexdigest()

        meta = {
            'norm_company': norm_company,
            'orig_company': orig_company,
            'company_tokens': list(company_tokens),
            'norm_title': norm_title,
            'title_level': title_level,
            'title_type': title_type,
            'title_keywords': list(title_keywords),
            'norm_city': norm_city,
            'orig_city': orig_city,
            'city_tokens': list(city_tokens),
            'salary_min': salary_min,
            'salary_max': salary_max,
        }

        return unique_key, meta

    def parse_salary(self, salary_str: str) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        if not salary_str or not isinstance(salary_str, str):
            return (None, None, None)

        salary_str = salary_str.strip()

        monthly_match = re.search(r'(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*K?\s*(\/月|/月|每月)?', salary_str, re.IGNORECASE)
        if monthly_match:
            min_val = float(monthly_match.group(1))
            max_val = float(monthly_match.group(2))
            unit = 'k' if 'k' in salary_str.lower() or 'K' in salary_str else 'original'

            if unit == 'k' or min_val < 100:
                min_val *= 1000
                max_val *= 1000

            avg_val = (min_val + max_val) / 2

            if (min_val < DATA_PROCESSING['min_salary'] or max_val > DATA_PROCESSING['max_salary']):
                return (None, None, None)

            return (min_val, max_val, avg_val)

        annual_match = re.search(r'(\d+\.?\d*)\s*[-~至]\s*(\d+\.?\d*)\s*K?\s*(\/年|/年|每年|年薪)', salary_str, re.IGNORECASE)
        if annual_match:
            min_val = float(annual_match.group(1))
            max_val = float(annual_match.group(2))
            unit = 'k' if 'k' in salary_str.lower() or 'K' in salary_str else 'original'

            if unit == 'k' or min_val < 100:
                min_val *= 1000
                max_val *= 1000

            min_val = min_val / 12
            max_val = max_val / 12
            avg_val = (min_val + max_val) / 2

            return (min_val, max_val, avg_val)

        single_match = re.search(r'(\d+\.?\d*)\s*K?\s*(\/月|/月|每月)?', salary_str, re.IGNORECASE)
        if single_match:
            val = float(single_match.group(1))
            unit = 'k' if 'k' in salary_str.lower() or 'K' in salary_str else 'original'

            if unit == 'k' or val < 100:
                val *= 1000

            if val < DATA_PROCESSING['min_salary'] or val > DATA_PROCESSING['max_salary']:
                return (None, None, None)

            return (val, val, val)

        return (None, None, None)

    def normalize_education(self, education_str: str) -> str:
        if not education_str:
            return None

        education_str = str(education_str).strip()

        for key, value in self.EDUCATION_MAP.items():
            if key in education_str:
                return value

        return education_str

    def normalize_experience(self, experience_str: str) -> str:
        if not experience_str:
            return None

        experience_str = str(experience_str).strip()

        for key, value in self.EXPERIENCE_MAP.items():
            if key in experience_str:
                return value

        return experience_str

    def normalize_job_type(self, job_type_str: str) -> str:
        if not job_type_str:
            return None

        job_type_str = str(job_type_str).strip()

        for key, value in self.JOB_TYPE_MAP.items():
            if key.lower() in job_type_str.lower():
                return value

        return job_type_str

    def normalize_city(self, city_str: str) -> str:
        if not city_str:
            return None

        city_str = str(city_str).strip()

        city_match = re.match(r'^([^市省县区]+?)(?:[市省县区]|地区|经济技术开发区)?', city_str)
        if city_match:
            return city_match.group(1)

        return city_str

    def extract_skills(self, text: str) -> List[str]:
        if not text:
            return []

        text = str(text).lower()
        found_skills = []

        for skill in DATA_PROCESSING['skills_list']:
            skill_lower = skill.lower()
            if skill_lower in text:
                found_skills.append(skill)

        return list(set(found_skills))

    def extract_keywords(self, text: str, max_keywords: int = 20) -> List[str]:
        if not text:
            return []

        text = str(text)

        clean_text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', ' ', text)
        words = re.split(r'\s+', clean_text)
        words = [w for w in words if len(w) >= 2]

        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1

        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:max_keywords]]

    def calculate_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0

        return difflib.SequenceMatcher(None, text1, text2).ratio()

    def calculate_company_similarity(self, company1: str, company2: str) -> float:
        return self.company_normalizer.calculate_similarity(company1, company2)

    def calculate_title_similarity(self, title1: str, title2: str) -> Tuple[float, bool, bool]:
        return self.title_normalizer.calculate_similarity(title1, title2)

    def calculate_location_similarity(self, loc1: str, loc2: str) -> float:
        return self.location_matcher.calculate_similarity(loc1, loc2)

    def calculate_salary_overlap(self, min1: float, max1: float, min2: float, max2: float) -> float:
        return self.salary_matcher.calculate_overlap(min1, max1, min2, max2)

    def check_duplicate_advanced(
        self,
        job_data: Dict[str, Any],
        existing_jobs: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[int], float, Dict[str, Any]]:
        """
        高级去重检测 - 多维度联合判定
        返回: (是否重复, 重复的职位ID, 综合相似度分数, 各维度分数详情)
        """
        if not existing_jobs:
            return False, None, 0.0, {}

        thresholds = DEDUP_CONFIG.get('thresholds', {})
        high_conf = thresholds.get('high_confidence', 0.85)
        medium_conf = thresholds.get('medium_confidence', 0.70)

        new_unique_key, new_meta = self.generate_advanced_unique_key(job_data)

        best_match = None
        best_score = 0.0
        best_scores = {}
        best_dup_id = None

        for existing in existing_jobs:
            ex_title = existing.get('title', '')
            ex_company = existing.get('company_name', '')
            ex_city = existing.get('city', '')
            ex_salary_min = existing.get('salary_min')
            ex_salary_max = existing.get('salary_max')

            ex_unique_key, ex_meta = self.generate_advanced_unique_key(existing)

            if new_unique_key == ex_unique_key:
                if new_meta['salary_min'] and ex_meta['salary_min']:
                    salary_overlap = self.salary_matcher.calculate_overlap(
                        new_meta['salary_min'], new_meta['salary_max'],
                        ex_meta['salary_min'], ex_meta['salary_max']
                    )
                    if salary_overlap >= 0.5:
                        return True, existing.get('id'), 0.95, {'reason': 'unique_key_match'}
                else:
                    return True, existing.get('id'), 0.90, {'reason': 'unique_key_match_no_salary'}

            is_dup, total_score, scores = self.duplicate_detector.detect(
                job_data, existing
            )

            if total_score > best_score:
                best_score = total_score
                best_match = existing
                best_scores = scores
                best_dup_id = existing.get('id')

            if is_dup:
                return True, existing.get('id'), total_score, scores

        if best_score >= medium_conf:
            return best_score >= high_conf, best_dup_id, best_score, best_scores

        return False, None, 0.0, {}

    def check_duplicate(self, job_data: Dict[str, Any], existing_jobs: List[Dict[str, Any]]) -> Tuple[bool, Optional[int], float]:
        """
        简化版去重检测 - 兼容旧接口
        返回: (是否重复, 重复的职位ID, 相似度分数)
        """
        is_dup, dup_id, score, _ = self.check_duplicate_advanced(job_data, existing_jobs)
        return is_dup, dup_id, score

    def check_duplicate_batch(
        self,
        job_data: Dict[str, Any],
        existing_jobs: List[Dict[str, Any]],
        threshold: float = None
    ) -> List[Tuple[int, float, Dict[str, Any]]]:
        """
        批量去重检测 - 找出所有可能的重复项
        返回: [(重复职位ID, 相似度分数, 各维度分数详情), ...]
        """
        if threshold is None:
            threshold = DEDUP_CONFIG['thresholds'].get('low_confidence', 0.55)

        duplicates = []

        for existing in existing_jobs:
            is_dup, total_score, scores = self.duplicate_detector.detect(
                job_data, existing
            )

            if total_score >= threshold:
                duplicates.append((existing.get('id'), total_score, scores))

        duplicates.sort(key=lambda x: x[1], reverse=True)
        return duplicates

    def get_deduplication_report(
        self,
        job_data: Dict[str, Any],
        existing_jobs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        生成去重检测报告
        用于调试和日志记录
        """
        if not existing_jobs:
            return {
                'new_job': {
                    'title': job_data.get('title'),
                    'company': job_data.get('company_name'),
                    'city': job_data.get('city'),
                    'normalized': self.generate_advanced_unique_key(job_data)[1]
                },
                'is_duplicate': False,
                'matches': []
            }

        unique_key, meta = self.generate_advanced_unique_key(job_data)

        all_matches = []
        for existing in existing_jobs:
            is_dup, score, scores = self.duplicate_detector.detect(job_data, existing)
            ex_unique_key, ex_meta = self.generate_advanced_unique_key(existing)

            match_info = {
                'job_id': existing.get('id'),
                'title': existing.get('title'),
                'company': existing.get('company_name'),
                'city': existing.get('city'),
                'similarity_score': score,
                'dimension_scores': scores,
                'unique_key_match': unique_key == ex_unique_key,
                'normalized': ex_meta
            }
            all_matches.append(match_info)

        all_matches.sort(key=lambda x: x['similarity_score'], reverse=True)

        top_match = all_matches[0] if all_matches else None
        is_duplicate = top_match and top_match['similarity_score'] >= DEDUP_CONFIG['thresholds']['medium_confidence']

        report = {
            'new_job': {
                'title': job_data.get('title'),
                'company': job_data.get('company_name'),
                'city': job_data.get('city'),
                'salary_min': job_data.get('salary_min'),
                'salary_max': job_data.get('salary_max'),
                'unique_key': unique_key,
                'normalized': meta
            },
            'is_duplicate': is_duplicate,
            'thresholds': DEDUP_CONFIG['thresholds'],
            'top_match': top_match,
            'all_matches': all_matches[:5],
            'total_compared': len(existing_jobs)
        }

        return report

    def parse_company_size(self, size_str: str) -> str:
        if not size_str:
            return None

        size_str = str(size_str).strip()

        if '少于' in size_str or '小于' in size_str or '50人以下' in size_str:
            return '少于50人'
        elif '50-99' in size_str or '50-100' in size_str:
            return '50-99人'
        elif '100-499' in size_str:
            return '100-499人'
        elif '500-999' in size_str:
            return '500-999人'
        elif '1000-9999' in size_str:
            return '1000-9999人'
        elif '10000' in size_str or '万人' in size_str:
            return '10000人以上'

        return size_str

    def clean_text(self, text: str) -> str:
        if not text:
            return None

        text = str(text)
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text if text else None

    def process_job_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        processed = {}

        processed['title'] = self.clean_text(raw_data.get('title', ''))

        title_norm, title_level, title_type, title_keywords = self.normalize_job_title(
            processed['title'] or ''
        )
        processed['title_normalized'] = title_norm
        processed['title_level'] = title_level
        processed['title_type'] = title_type
        processed['title_keywords'] = json.dumps(list(title_keywords), ensure_ascii=False) if title_keywords else None

        processed['company_name'] = self.clean_text(raw_data.get('company_name', ''))
        company_norm, company_orig, company_tokens = self.normalize_company_name(
            processed['company_name'] or ''
        )
        processed['company_normalized'] = company_norm
        processed['company_tokens'] = json.dumps(list(company_tokens), ensure_ascii=False) if company_tokens else None

        processed['company_size'] = self.parse_company_size(raw_data.get('company_size', ''))
        processed['company_industry'] = self.clean_text(raw_data.get('company_industry', ''))
        processed['company_type'] = self.clean_text(raw_data.get('company_type', ''))

        salary_original = raw_data.get('salary', '')
        processed['salary_original'] = salary_original
        salary_min, salary_max, salary_avg = self.parse_salary(salary_original)
        processed['salary_min'] = salary_min
        processed['salary_max'] = salary_max
        processed['salary_avg'] = salary_avg

        processed['city'] = self.normalize_city(raw_data.get('city', ''))
        city_norm, city_orig, city_tokens = self.location_matcher.normalize(processed['city'] or '')
        processed['city_normalized'] = city_norm
        processed['city_tokens'] = json.dumps(list(city_tokens), ensure_ascii=False) if city_tokens else None

        processed['district'] = self.clean_text(raw_data.get('district', ''))
        processed['address'] = self.clean_text(raw_data.get('address', ''))

        processed['education'] = self.normalize_education(raw_data.get('education', ''))
        processed['experience'] = self.normalize_experience(raw_data.get('experience', ''))
        processed['job_type'] = self.normalize_job_type(raw_data.get('job_type', ''))

        processed['description'] = self.clean_text(raw_data.get('description', ''))
        processed['requirements'] = self.clean_text(raw_data.get('requirements', ''))
        processed['benefits'] = self.clean_text(raw_data.get('benefits', ''))

        all_text = ' '.join([
            processed['title'] or '',
            processed['description'] or '',
            processed['requirements'] or ''
        ])
        skills = self.extract_skills(all_text)
        processed['skills'] = json.dumps(skills, ensure_ascii=False) if skills else None
        processed['keywords'] = json.dumps(self.extract_keywords(all_text), ensure_ascii=False)

        publish_date = raw_data.get('publish_date')
        if publish_date:
            if isinstance(publish_date, str):
                try:
                    processed['publish_date'] = datetime.strptime(publish_date, '%Y-%m-%d')
                except:
                    processed['publish_date'] = datetime.now()
            else:
                processed['publish_date'] = publish_date
        else:
            processed['publish_date'] = datetime.now()

        processed['source_job_id'] = raw_data.get('source_job_id', '')
        processed['source_url'] = raw_data.get('source_url', '')

        processed['unique_key'] = self.generate_unique_key(
            processed['title'],
            processed['company_name'],
            processed['city'],
            processed['salary_original']
        )

        processed['advanced_unique_key'], advanced_meta = self.generate_advanced_unique_key(processed)
        processed['dedup_meta'] = json.dumps(advanced_meta, ensure_ascii=False)

        return processed


data_processor = DataProcessor()
