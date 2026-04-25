import sys
import os
import re
import math
from typing import Dict, Any, Optional, List, Tuple, Set
from collections import Counter
import difflib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import DATA_PROCESSING


class CompanyNormalizer:
    COMPANY_SUFFIXES = [
        '集团', '股份有限公司', '有限责任公司', '有限公司', '股份公司',
        '科技有限公司', '信息科技有限公司', '网络科技有限公司',
        '软件有限公司', '技术有限公司', '电子有限公司',
        '咨询有限公司', '管理咨询有限公司',
        '投资有限公司', '投资管理有限公司',
        '贸易有限公司', '商贸有限公司',
        '实业有限公司', '发展有限公司',
        '控股有限公司', '企业管理有限公司',
        '服务有限公司', '物业服务有限公司',
        '文化传媒有限公司', '文化传播有限公司',
        '广告有限公司', '公关策划有限公司',
        '设计有限公司', '装饰工程有限公司',
        '建设工程有限公司', '建筑工程有限公司',
        '房地产开发有限公司', '置业有限公司',
        '物流有限公司', '供应链管理有限公司',
        '科技股份有限公司', '技术股份有限公司',
        '信息技术有限公司', '互联网科技有限公司',
        '数据技术有限公司', '人工智能科技有限公司',
        '云计算有限公司', '大数据有限公司',
        '智能科技有限公司', '自动化科技有限公司',
        '半导体有限公司', '微电子有限公司',
        '通信技术有限公司', '通讯设备有限公司',
        '有限公司', '公司', '集团有限公司',
        '(集团)', '（集团）',
    ]

    REGION_PREFIXES = [
        '北京', '上海', '深圳', '广州', '杭州', '成都', '武汉',
        '南京', '苏州', '西安', '重庆', '天津', '青岛', '大连',
        '郑州', '长沙', '合肥', '济南', '沈阳', '厦门', '宁波',
        '无锡', '佛山', '东莞', '珠海', '惠州', '中山',
        '北京市', '上海市', '深圳市', '广州市', '杭州市',
        '成都市', '武汉市', '南京市', '苏州市', '西安市',
        '重庆市', '天津市', '青岛市', '大连市',
        '中国', '中华人民共和国', '国内',
    ]

    INDUSTRY_TAGS = [
        '科技', '信息', '网络', '互联网', '软件', '技术', '电子',
        '数据', '智能', '自动化', '通信', '通讯', '半导体',
        '微电', '云计算', '大数据', '人工智能', '数字',
        '传媒', '文化', '广告', '公关', '策划', '设计',
        '装饰', '建设', '建筑', '工程', '房地产', '置业',
        '物流', '供应链', '贸易', '商贸', '实业', '发展',
        '控股', '企业管理', '服务', '物业', '投资', '咨询',
    ]

    COMPANY_ABBREVIATIONS = {
        '阿里巴巴集团': '阿里巴巴',
        '阿里巴巴网络技术有限公司': '阿里巴巴',
        '阿里巴巴(中国)有限公司': '阿里巴巴',
        '腾讯科技(深圳)有限公司': '腾讯',
        '腾讯科技(北京)有限公司': '腾讯',
        '腾讯科技有限公司': '腾讯',
        '腾讯控股有限公司': '腾讯',
        '字节跳动有限公司': '字节跳动',
        '北京字节跳动科技有限公司': '字节跳动',
        '字节跳动科技有限公司': '字节跳动',
        '百度在线网络技术(北京)有限公司': '百度',
        '百度在线网络技术有限公司': '百度',
        '北京百度网讯科技有限公司': '百度',
        '百度公司': '百度',
        '华为技术有限公司': '华为',
        '华为投资控股有限公司': '华为',
        '华为终端有限公司': '华为',
        '小米科技有限责任公司': '小米',
        '北京小米科技有限责任公司': '小米',
        '小米通讯技术有限公司': '小米',
        '京东集团股份有限公司': '京东',
        '北京京东世纪贸易有限公司': '京东',
        '京东科技控股股份有限公司': '京东',
        '美团股份有限公司': '美团',
        '北京三快在线科技有限公司': '美团',
        '北京三快科技有限公司': '美团',
        '滴滴出行科技有限公司': '滴滴',
        '滴滴出行': '滴滴',
        '北京小桔科技有限公司': '滴滴',
        '网易(杭州)网络有限公司': '网易',
        '网易公司': '网易',
        '广州网易计算机系统有限公司': '网易',
        '蚂蚁科技集团股份有限公司': '蚂蚁集团',
        '蚂蚁科技集团有限公司': '蚂蚁集团',
        '上海寻梦信息技术有限公司': '拼多多',
        '拼多多': '拼多多',
        '快手科技有限公司': '快手',
        '北京快手科技有限公司': '快手',
        '携程旅行网': '携程',
        '携程旅游信息技术(上海)有限公司': '携程',
        '携程计算机技术(上海)有限公司': '携程',
        '哔哩哔哩科技有限公司': '哔哩哔哩',
        '上海幻电信息科技有限公司': '哔哩哔哩',
        'B站': '哔哩哔哩',
    }

    def __init__(self):
        self._suffix_patterns = self._compile_suffix_patterns()

    def _compile_suffix_patterns(self) -> List[re.Pattern]:
        escaped_suffixes = [re.escape(suffix) for suffix in sorted(self.COMPANY_SUFFIXES, key=len, reverse=True)]
        return [
            re.compile(rf'({suffix})$'),
            re.compile(rf'({suffix})')
        ]

    def normalize(self, company_name: str) -> Tuple[str, str, Set[str]]:
        if not company_name or not isinstance(company_name, str):
            return '', '', set()

        original = company_name.strip()
        name = original

        for abbreviation, short_name in self.COMPANY_ABBREVIATIONS.items():
            if abbreviation in name:
                return short_name, original, {short_name}

        name = self._remove_region_prefix(name)

        name = self._remove_company_suffix(name)

        name = self._remove_industry_tags(name)

        name = self._clean_special_chars(name)

        name = name.strip()

        name_tokens = self._tokenize(name)
        original_tokens = self._tokenize(original)
        all_tokens = name_tokens.union(original_tokens)

        return name, original, all_tokens

    def _remove_region_prefix(self, name: str) -> str:
        sorted_prefixes = sorted(self.REGION_PREFIXES, key=len, reverse=True)
        for prefix in sorted_prefixes:
            if name.startswith(prefix):
                name = name[len(prefix):].strip()
        return name

    def _remove_company_suffix(self, name: str) -> str:
        sorted_suffixes = sorted(self.COMPANY_SUFFIXES, key=len, reverse=True)
        for suffix in sorted_suffixes:
            name = name.replace(suffix, '')
        return name

    def _remove_industry_tags(self, name: str) -> str:
        sorted_tags = sorted(self.INDUSTRY_TAGS, key=len, reverse=True)
        for tag in sorted_tags:
            name = name.replace(tag, '')
        return name

    def _clean_special_chars(self, name: str) -> str:
        name = re.sub(r'[()（）【】\[\]《》""''""、，·\-—_]', '', name)
        name = re.sub(r'\s+', '', name)
        return name

    def _tokenize(self, name: str) -> Set[str]:
        if not name:
            return set()

        tokens = set()
        name = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', name)

        if len(name) <= 4:
            tokens.add(name)
            return tokens

        for i in range(len(name) - 1):
            tokens.add(name[i:i + 2])

        for i in range(len(name) - 2):
            tokens.add(name[i:i + 3])

        tokens.add(name[:2])
        tokens.add(name[-2:])

        if len(name) >= 4:
            tokens.add(name[:4])

        return tokens

    def calculate_similarity(self, name1: str, name2: str) -> float:
        if not name1 or not name2:
            return 0.0

        norm1, orig1, tokens1 = self.normalize(name1)
        norm2, orig2, tokens2 = self.normalize(name2)

        if norm1 == norm2 and norm1:
            return 1.0

        if orig1 == orig2:
            return 0.95

        if norm1 in orig2 or norm2 in orig1:
            return 0.85

        if tokens1 and tokens2:
            intersection = tokens1.intersection(tokens2)
            union = tokens1.union(tokens2)
            if union:
                jaccard = len(intersection) / len(union)
                if jaccard > 0.5:
                    return jaccard * 0.9

        seq_ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
        orig_ratio = difflib.SequenceMatcher(None, orig1, orig2).ratio()

        return max(seq_ratio, orig_ratio) * 0.9


class JobTitleNormalizer:
    JOB_LEVELS = {
        '初级': 1, '入门': 1, '实习': 1, '应届生': 1, '助理': 1,
        '中级': 2, '普通': 2, '资深': 3, '高级': 3, '专家': 4,
        '主管': 4, '资深专家': 5, '技术专家': 5, '首席': 5,
        '经理': 5, '总监': 6, '高级经理': 6, '技术总监': 6,
        '副总裁': 7, 'CTO': 7, 'CEO': 7, '总裁': 7,
    }

    JOB_TYPES = {
        '开发工程师': '开发工程师',
        '软件开发工程师': '开发工程师',
        '软件工程师': '开发工程师',
        '后端开发工程师': '后端开发工程师',
        '后端工程师': '后端开发工程师',
        '前端开发工程师': '前端开发工程师',
        '前端工程师': '前端开发工程师',
        '全栈开发工程师': '全栈开发工程师',
        '全栈工程师': '全栈开发工程师',
        'Java开发工程师': 'Java开发工程师',
        'Python开发工程师': 'Python开发工程师',
        '算法工程师': '算法工程师',
        '数据工程师': '数据工程师',
        '数据分析师': '数据分析师',
        '产品经理': '产品经理',
        '产品专员': '产品专员',
        'UI设计师': 'UI设计师',
        'UX设计师': 'UX设计师',
        '视觉设计师': '视觉设计师',
        '交互设计师': '交互设计师',
        '运维工程师': '运维工程师',
        'DevOps工程师': 'DevOps工程师',
        '测试工程师': '测试工程师',
        '测试开发工程师': '测试开发工程师',
        '架构师': '架构师',
        '技术架构师': '技术架构师',
        '解决方案架构师': '解决方案架构师',
    }

    SKILL_KEYWORDS = [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Golang',
        'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'Kotlin', 'Swift',
        'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
        'Spring', 'SpringBoot', 'Django', 'Flask', 'FastAPI',
        'Express', 'Node.js', 'Nodejs',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Oracle', 'SQLServer', 'ClickHouse', 'Hive', 'HBase',
        'Docker', 'Kubernetes', 'K8s', '容器', '微服务',
        'AWS', '阿里云', '腾讯云', '华为云', 'Azure', 'GCP',
        '机器学习', '深度学习', '人工智能', 'AI', '数据挖掘',
        '数据分析', '大数据', '数据仓库', 'ETL',
        'Git', 'Linux', 'Unix', 'Shell', 'Bash',
        '分布式', '高并发', '高可用', '性能优化',
        'API', 'RESTful', 'GraphQL', 'WebSocket',
        '测试', '自动化测试', '接口测试', '单元测试',
        '产品设计', '需求分析', '用户研究', '原型设计',
    ]

    def __init__(self):
        self._level_patterns = self._compile_level_patterns()

    def _compile_level_patterns(self) -> List[Tuple[re.Pattern, str, int]]:
        patterns = []
        for level, weight in sorted(self.JOB_LEVELS.items(), key=lambda x: -len(x[0])):
            pattern = re.compile(rf'({level})')
            patterns.append((pattern, level, weight))
        return patterns

    def normalize(self, title: str) -> Tuple[str, int, str, Set[str]]:
        if not title or not isinstance(title, str):
            return '', 0, '', set()

        original = title.strip()
        title_clean = original

        level = 0
        detected_level = ''
        for pattern, level_text, weight in self._level_patterns:
            if pattern.search(title_clean):
                if weight > level:
                    level = weight
                    detected_level = level_text
                title_clean = pattern.sub('', title_clean)

        job_type = self._identify_job_type(title_clean)

        skill_keywords = self._extract_skill_keywords(original)

        core_keywords = self._extract_core_keywords(title_clean)

        title_clean = self._clean_title(title_clean)

        return title_clean, level, job_type, skill_keywords.union(core_keywords)

    def _identify_job_type(self, title: str) -> str:
        if not title:
            return ''

        sorted_types = sorted(self.JOB_TYPES.keys(), key=len, reverse=True)

        for job_type in sorted_types:
            if job_type in title:
                return self.JOB_TYPES[job_type]

        return title.strip()

    def _extract_skill_keywords(self, title: str) -> Set[str]:
        keywords = set()
        title_lower = title.lower()

        for skill in self.SKILL_KEYWORDS:
            skill_lower = skill.lower()
            if skill_lower in title_lower:
                keywords.add(skill)

        return keywords

    def _extract_core_keywords(self, title: str) -> Set[str]:
        keywords = set()
        if not title:
            return keywords

        title = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', title)

        if len(title) <= 4:
            keywords.add(title)
            return keywords

        for i in range(len(title) - 1):
            token = title[i:i + 2]
            if len(token) >= 2:
                keywords.add(token)

        return keywords

    def _clean_title(self, title: str) -> str:
        title = re.sub(r'[()（）【】\[\]《》""''""、，·\-—_/]', ' ', title)
        title = re.sub(r'\s+', ' ', title)
        return title.strip()

    def calculate_similarity(self, title1: str, title2: str) -> Tuple[float, bool, bool]:
        if not title1 or not title2:
            return 0.0, False, False

        norm1, level1, type1, keywords1 = self.normalize(title1)
        norm2, level2, type2, keywords2 = self.normalize(title2)

        same_type = False
        if type1 and type2:
            if type1 == type2:
                same_type = True
            elif type1 in type2 or type2 in type1:
                same_type = True

        same_level = (level1 == level2)

        if same_type and same_level and norm1 == norm2:
            return 1.0, same_type, same_level

        if same_type and keywords1 and keywords2:
            intersection = keywords1.intersection(keywords2)
            union = keywords1.union(keywords2)
            if union:
                keyword_similarity = len(intersection) / len(union)
                if keyword_similarity >= 0.7:
                    base_score = 0.9 if same_type else 0.7
                    level_factor = 0.95 if same_level else 0.75
                    return base_score * level_factor * keyword_similarity, same_type, same_level

        seq_ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
        orig_ratio = difflib.SequenceMatcher(None, title1, title2).ratio()

        base_score = max(seq_ratio, orig_ratio)

        level_factor = 1.0 if same_level else 0.7
        type_factor = 1.0 if same_type else 0.7

        return base_score * level_factor * type_factor, same_type, same_level


class LocationMatcher:
    CITY_ALIASES = {
        '京城': '北京', '帝都': '北京',
        '沪': '上海', '申城': '上海', '魔都': '上海',
        '鹏城': '深圳',
        '花城': '广州', '羊城': '广州',
        '杭城': '杭州', '临安': '杭州',
        '蓉城': '成都', '锦城': '成都',
        '江城': '武汉',
        '金陵': '南京', '宁': '南京',
        '姑苏': '苏州', '吴': '苏州',
        '长安': '西安', '镐京': '西安',
        '渝': '重庆', '山城': '重庆', '雾都': '重庆',
        '津': '天津', '津门': '天津',
        '岛城': '青岛', '胶澳': '青岛',
        '滨城': '大连',
        '商都': '郑州',
        '星城': '长沙',
        '庐州': '合肥',
        '泉城': '济南',
        '奉天': '沈阳',
        '鹭岛': '厦门',
        '甬城': '宁波',
    }

    def __init__(self):
        pass

    def normalize(self, location: str) -> Tuple[str, str, Set[str]]:
        if not location or not isinstance(location, str):
            return '', '', set()

        original = location.strip()
        loc = original

        for alias, city in self.CITY_ALIASES.items():
            if alias == loc:
                return city, original, {city}

        loc = re.sub(r'[市区县区省]', '', loc)
        loc = re.sub(r'\s+', '', loc)

        tokens = set()
        tokens.add(loc)

        for i in range(len(loc) - 1):
            tokens.add(loc[i:i + 2])

        return loc, original, tokens

    def calculate_similarity(self, loc1: str, loc2: str) -> float:
        if not loc1 or not loc2:
            return 0.5

        norm1, orig1, tokens1 = self.normalize(loc1)
        norm2, orig2, tokens2 = self.normalize(loc2)

        if norm1 == norm2 and norm1:
            return 1.0

        if orig1 == orig2:
            return 0.95

        if norm1 in orig2 or norm2 in orig1:
            return 0.8

        if tokens1 and tokens2:
            intersection = tokens1.intersection(tokens2)
            if intersection:
                return 0.6

        return 0.0


class SalaryMatcher:
    def __init__(self):
        pass

    def normalize_range(self, salary_min: float, salary_max: float) -> Tuple[float, float]:
        if salary_min is None:
            salary_min = 0
        if salary_max is None:
            salary_max = float('inf')

        return salary_min, salary_max

    def calculate_overlap(self, min1: float, max1: float, min2: float, max2: float) -> float:
        if min1 is None and max1 is None:
            return 0.5
        if min2 is None and max2 is None:
            return 0.5

        min1, max1 = self.normalize_range(min1, max1)
        min2, max2 = self.normalize_range(min2, max2)

        if max1 <= min2 or max2 <= min1:
            return 0.0

        overlap_min = max(min1, min2)
        overlap_max = min(max1, max2)

        total_min = min(min1, min2)
        total_max = max(max1, max2)

        if total_max == total_min:
            return 1.0

        overlap_ratio = (overlap_max - overlap_min) / (total_max - total_min)

        if overlap_ratio >= 0.8:
            return 1.0
        elif overlap_ratio >= 0.5:
            return 0.9
        elif overlap_ratio >= 0.3:
            return 0.7
        elif overlap_ratio > 0:
            return 0.5

        return 0.0

    def calculate_similarity(self, min1: float, max1: float, min2: float, max2: float) -> float:
        if min1 is None and max1 is None and min2 is None and max2 is None:
            return 0.5

        return self.calculate_overlap(min1, max1, min2, max2)


class DuplicateDetector:
    WEIGHTS = {
        'company': 0.35,
        'title_type': 0.25,
        'title_keyword': 0.15,
        'location': 0.15,
        'salary': 0.10,
    }

    THRESHOLDS = {
        'high_confidence': 0.85,
        'medium_confidence': 0.70,
        'low_confidence': 0.55,
    }

    def __init__(self):
        self.company_normalizer = CompanyNormalizer()
        self.title_normalizer = JobTitleNormalizer()
        self.location_matcher = LocationMatcher()
        self.salary_matcher = SalaryMatcher()

    def detect(self, job1: Dict[str, Any], job2: Dict[str, Any]) -> Tuple[bool, float, Dict[str, float]]:
        scores = {}

        company_similarity = self.company_normalizer.calculate_similarity(
            job1.get('company_name', ''),
            job2.get('company_name', '')
        )
        scores['company'] = company_similarity

        title_similarity, same_type, same_level = self.title_normalizer.calculate_similarity(
            job1.get('title', ''),
            job2.get('title', '')
        )

        scores['title_type'] = 1.0 if same_type else 0.0
        scores['title_keyword'] = title_similarity

        location_similarity = self.location_matcher.calculate_similarity(
            job1.get('city', ''),
            job2.get('city', '')
        )
        scores['location'] = location_similarity

        salary_similarity = self.salary_matcher.calculate_similarity(
            job1.get('salary_min'),
            job1.get('salary_max'),
            job2.get('salary_min'),
            job2.get('salary_max')
        )
        scores['salary'] = salary_similarity

        total_score = 0.0
        for key, weight in self.WEIGHTS.items():
            total_score += scores[key] * weight

        if company_similarity >= 0.9:
            if same_type and location_similarity >= 0.8:
                total_score = max(total_score, 0.9)
            elif same_type:
                total_score = max(total_score, 0.8)

        if company_similarity >= 0.7:
            if same_type and same_level and location_similarity >= 0.7 and salary_similarity >= 0.7:
                total_score = max(total_score, 0.85)

        is_duplicate = total_score >= self.THRESHOLDS['medium_confidence']

        return is_duplicate, total_score, scores

    def detect_with_existing(self, new_job: Dict[str, Any], existing_jobs: List[Dict[str, Any]]) -> Tuple[bool, Optional[int], float, Dict[str, Any]]:
        best_match = None
        best_score = 0.0
        best_scores = {}
        best_dup_id = None

        for existing in existing_jobs:
            is_dup, score, scores = self.detect(new_job, existing)

            if score > best_score:
                best_score = score
                best_match = existing
                best_scores = scores
                best_dup_id = existing.get('id')

            if is_dup:
                return True, existing.get('id'), score, scores

        if best_score >= self.THRESHOLDS['low_confidence']:
            return best_score >= self.THRESHOLDS['medium_confidence'], best_dup_id, best_score, best_scores

        return False, None, 0.0, {}


company_normalizer = CompanyNormalizer()
job_title_normalizer = JobTitleNormalizer()
location_matcher = LocationMatcher()
salary_matcher = SalaryMatcher()
duplicate_detector = DuplicateDetector()
