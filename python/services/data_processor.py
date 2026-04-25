import sys
import os
import re
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import difflib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_PROCESSING

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

    def generate_unique_key(self, title: str, company_name: str, city: str = None, salary_original: str = None) -> str:
        base_str = f"{title.strip()}|{company_name.strip()}"
        if city:
            base_str += f"|{city.strip()}"
        if salary_original:
            base_str += f"|{salary_original.strip()}"
        
        return hashlib.md5(base_str.encode('utf-8')).hexdigest()

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

    def check_duplicate(self, job_data: Dict[str, Any], existing_jobs: List[Dict[str, Any]]) -> Tuple[bool, Optional[int], float]:
        """
        检查职位是否重复
        返回: (是否重复, 重复的职位ID, 相似度分数)
        """
        title = job_data.get('title', '')
        company_name = job_data.get('company_name', '')
        city = job_data.get('city', '')
        salary_min = job_data.get('salary_min')

        for existing in existing_jobs:
            ex_title = existing.get('title', '')
            ex_company = existing.get('company_name', '')
            ex_city = existing.get('city', '')
            ex_salary_min = existing.get('salary_min')

            if company_name != ex_company:
                continue

            title_similarity = self.calculate_similarity(title, ex_title)

            if title_similarity >= 0.9:
                if city == ex_city:
                    return True, existing.get('id'), title_similarity
                if salary_min == ex_salary_min:
                    return True, existing.get('id'), title_similarity

            if title_similarity >= DATA_PROCESSING['similarity_threshold']:
                if city == ex_city and salary_min == ex_salary_min:
                    return True, existing.get('id'), title_similarity

        return False, None, 0.0

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

        processed['company_name'] = self.clean_text(raw_data.get('company_name', ''))
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

        return processed

data_processor = DataProcessor()
