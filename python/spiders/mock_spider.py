import sys
import os
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from spiders.base_spider import BaseSpider

class MockSpider(BaseSpider):
    source_name = '模拟招聘网'
    base_url = 'https://mock-job-site.example.com'

    JOB_TITLES = [
        'Python开发工程师', '高级Python工程师', 'Python后端开发',
        'Java开发工程师', '高级Java工程师', 'Java后端开发',
        '前端开发工程师', '高级前端工程师', 'React开发工程师', 'Vue开发工程师',
        '全栈开发工程师', '架构师', '技术负责人',
        '数据分析师', '数据工程师', '算法工程师',
        '运维工程师', 'DevOps工程师', '测试工程师',
        '产品经理', 'UI设计师', '产品运营'
    ]

    COMPANIES = [
        {'name': '阿里巴巴集团', 'industry': '互联网/电子商务', 'size': '10000人以上', 'type': '上市公司'},
        {'name': '腾讯科技', 'industry': '互联网/游戏', 'size': '10000人以上', 'type': '上市公司'},
        {'name': '字节跳动', 'industry': '互联网/移动互联网', 'size': '10000人以上', 'type': '私营企业'},
        {'name': '百度', 'industry': '互联网/搜索', 'size': '10000人以上', 'type': '上市公司'},
        {'name': '美团', 'industry': '互联网/O2O', 'size': '10000人以上', 'type': '上市公司'},
        {'name': '京东', 'industry': '互联网/电子商务', 'size': '10000人以上', 'type': '上市公司'},
        {'name': '小米科技', 'industry': '硬件/消费电子', 'size': '5000-10000人', 'type': '上市公司'},
        {'name': '华为技术', 'industry': '通信/电信设备', 'size': '10000人以上', 'type': '私营企业'},
        {'name': '网易', 'industry': '互联网/游戏', 'size': '5000-10000人', 'type': '上市公司'},
        {'name': '滴滴出行', 'industry': '互联网/出行', 'size': '1000-5000人', 'type': '私营企业'},
        {'name': '拼多多', 'industry': '互联网/电子商务', 'size': '5000-10000人', 'type': '上市公司'},
        {'name': '快手科技', 'industry': '互联网/短视频', 'size': '1000-5000人', 'type': '上市公司'},
        {'name': '携程旅行', 'industry': '互联网/旅游', 'size': '1000-5000人', 'type': '上市公司'},
        {'name': '哔哩哔哩', 'industry': '互联网/视频', 'size': '1000-5000人', 'type': '上市公司'},
        {'name': '蚂蚁集团', 'industry': '互联网/金融科技', 'size': '5000-10000人', 'type': '私营企业'},
    ]

    CITIES = ['北京', '上海', '深圳', '杭州', '广州', '成都', '武汉', '南京', '苏州', '西安', '重庆', '厦门']

    EDUCATIONS = ['本科', '硕士', '大专', '不限', '博士']

    EXPERIENCES = ['1-3年', '3-5年', '5-10年', '不限', '应届生', '1年以内', '10年以上']

    SALARY_RANGES = [
        '15K-25K', '20K-35K', '25K-40K', '30K-50K', '40K-60K',
        '10K-18K', '8K-15K', '50K-80K', '80K-120K', '35K-55K'
    ]

    JOB_TYPES = ['全职', '实习', '兼职']

    BENEFITS = [
        '五险一金', '补充医疗保险', '定期体检', '年终奖', '股票期权',
        '带薪年假', '弹性工作', '免费班车', '员工旅游', '节日福利',
        '零食下午茶', '健身房', '团建活动', '绩效奖金', '项目奖金'
    ]

    SKILLS_BY_ROLE = {
        'Python': ['Python', 'Django', 'Flask', 'FastAPI', 'MySQL', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Git', 'Linux'],
        'Java': ['Java', 'Spring', 'Spring Boot', 'MySQL', 'Oracle', 'Redis', 'Docker', 'Kubernetes', 'Git', 'Linux', '微服务'],
        '前端': ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 'Next.js', 'Webpack', 'CSS', 'HTML', 'Git', 'npm'],
        '全栈': ['Python', 'Java', 'JavaScript', 'React', 'Vue', 'Node.js', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'Git'],
        '数据': ['Python', 'SQL', '机器学习', '深度学习', '数据分析', '数据挖掘', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch'],
        '运维': ['Linux', 'Docker', 'Kubernetes', 'Python', 'Shell', 'AWS', '阿里云', '监控', '自动化', 'Git'],
        '产品': ['产品设计', '需求分析', '用户研究', '数据分析', 'Axure', '原型设计', '项目管理', '市场分析'],
    }

    def __init__(self, task_id: int = None):
        super().__init__(task_id)
        self.generated_ids = set()

    def generate_job_id(self) -> str:
        import hashlib
        import time
        job_id = hashlib.md5(f"{random.randint(1, 1000000)}{time.time()}".encode()).hexdigest()[:12]
        while job_id in self.generated_ids:
            job_id = hashlib.md5(f"{random.randint(1, 1000000)}{time.time()}".encode()).hexdigest()[:12]
        self.generated_ids.add(job_id)
        return job_id

    def generate_description(self, job_title: str) -> str:
        descriptions = {
            'Python': [
                '负责公司核心业务系统的后端开发和维护工作，参与系统架构设计和技术选型。',
                '独立完成功能模块的需求分析、设计、编码和测试工作，确保代码质量和系统稳定性。',
                '与产品经理、前端工程师、测试工程师紧密合作，推动项目顺利进行。',
                '参与技术文档编写和代码审查，分享技术经验，提升团队整体技术水平。'
            ],
            'Java': [
                '负责Java后端服务的设计、开发和维护，参与系统架构优化。',
                '独立完成核心模块的开发，解决复杂的技术问题。',
                '与产品团队紧密合作，理解业务需求并转化为技术方案。',
                '持续优化系统性能，提升用户体验。'
            ],
            '前端': [
                '负责Web前端开发工作，实现高质量的用户界面和交互效果。',
                '与产品和设计团队紧密合作，参与产品体验优化。',
                '参与前端技术栈的选型和升级，推动前端工程化建设。',
                '编写高质量、可维护的代码，确保代码规范。'
            ],
            '全栈': [
                '负责产品的全栈开发，包括前端和后端功能实现。',
                '参与技术架构设计，确保系统的可扩展性和稳定性。',
                '独立完成功能模块的开发和调试工作。',
                '与产品团队紧密合作，快速迭代产品。'
            ],
            '数据': [
                '负责数据分析和挖掘工作，为业务决策提供数据支持。',
                '设计和实现数据处理流程，构建数据模型。',
                '使用机器学习和统计分析方法，发现业务洞察。',
                '编写数据可视化报告，向业务团队展示分析结果。'
            ],
            '运维': [
                '负责公司基础设施的维护和优化，确保系统稳定运行。',
                '设计和实现自动化运维工具和脚本。',
                '参与CI/CD流程的建设和优化。',
                '处理线上故障，确保系统高可用性。'
            ],
            '产品': [
                '负责产品规划和需求分析，制定产品路线图。',
                '与研发团队紧密合作，推动产品功能实现。',
                '进行用户研究和市场分析，优化产品体验。',
                '跟踪产品数据，持续迭代优化产品。'
            ],
        }

        role_category = 'Python'
        if 'Java' in job_title:
            role_category = 'Java'
        elif '前端' in job_title or 'React' in job_title or 'Vue' in job_title:
            role_category = '前端'
        elif '全栈' in job_title:
            role_category = '全栈'
        elif '数据' in job_title or '算法' in job_title:
            role_category = '数据'
        elif '运维' in job_title or 'DevOps' in job_title:
            role_category = '运维'
        elif '产品' in job_title:
            role_category = '产品'

        desc_list = descriptions.get(role_category, descriptions['Python'])
        return '\n'.join(random.sample(desc_list, k=min(3, len(desc_list))))

    def generate_requirements(self, job_title: str) -> str:
        requirements = [
            '计算机相关专业本科及以上学历，3年以上相关工作经验。',
            '扎实的编程基础，良好的代码风格和文档习惯。',
            '熟悉常用的数据结构和算法，具备良好的系统设计能力。',
            '有较强的沟通能力和团队协作精神，能够承受一定的工作压力。',
            '具有良好的学习能力，能够快速掌握新技术。',
        ]
        
        role_reqs = []
        if 'Python' in job_title:
            role_reqs = [
                '熟练掌握Python语言，熟悉Django/Flask/FastAPI等框架。',
                '熟悉MySQL/PostgreSQL等关系型数据库，了解Redis等缓存技术。',
                '有分布式系统开发经验者优先。',
            ]
        elif 'Java' in job_title:
            role_reqs = [
                '熟练掌握Java语言，熟悉Spring/Spring Boot等框架。',
                '熟悉MySQL/Oracle等关系型数据库，了解Redis等缓存技术。',
                '有微服务架构开发经验者优先。',
            ]
        elif '前端' in job_title or 'React' in job_title or 'Vue' in job_title:
            role_reqs = [
                '熟练掌握HTML/CSS/JavaScript，熟悉TypeScript。',
                '精通React/Vue等主流前端框架，了解其原理。',
                '熟悉前端工程化，了解Webpack/Vite等构建工具。',
            ]
        
        all_reqs = requirements[:3] + role_reqs + requirements[3:]
        return '\n'.join(all_reqs[:6])

    def generate_mock_job(self, keyword: str = None, city: str = None) -> Dict[str, Any]:
        if keyword and random.random() > 0.3:
            matching_titles = [t for t in self.JOB_TITLES if keyword.lower() in t.lower()]
            if matching_titles:
                title = random.choice(matching_titles)
            else:
                title = random.choice(self.JOB_TITLES)
        else:
            title = random.choice(self.JOB_TITLES)

        company = random.choice(self.COMPANIES)
        
        job_city = city if city else random.choice(self.CITIES)
        
        salary = random.choice(self.SALARY_RANGES)
        
        num_benefits = random.randint(3, 7)
        benefits = random.sample(self.BENEFITS, num_benefits)

        role_category = 'Python'
        if 'Java' in title:
            role_category = 'Java'
        elif '前端' in title or 'React' in title or 'Vue' in title:
            role_category = '前端'
        elif '全栈' in title:
            role_category = '全栈'
        elif '数据' in title or '算法' in title:
            role_category = '数据'
        elif '运维' in title or 'DevOps' in title:
            role_category = '运维'
        elif '产品' in title:
            role_category = '产品'

        num_skills = random.randint(4, 8)
        skills = random.sample(self.SKILLS_BY_ROLE[role_category], min(num_skills, len(self.SKILLS_BY_ROLE[role_category])))

        days_ago = random.randint(0, 30)
        publish_date = datetime.now() - timedelta(days=days_ago)

        districts = {
            '北京': ['朝阳区', '海淀区', '西城区', '东城区', '丰台区', '大兴区'],
            '上海': ['浦东新区', '黄浦区', '静安区', '徐汇区', '杨浦区', '闵行区'],
            '深圳': ['南山区', '福田区', '罗湖区', '宝安区', '龙岗区'],
            '杭州': ['西湖区', '余杭区', '滨江区', '上城区', '钱塘区'],
            '广州': ['天河区', '越秀区', '海珠区', '白云区', '番禺区'],
            '成都': ['高新区', '武侯区', '锦江区', '青羊区', '成华区'],
            '武汉': ['洪山区', '东湖高新区', '江汉区', '武昌区', '江岸区'],
            '南京': ['建邺区', '鼓楼区', '玄武区', '雨花台区', '江宁区'],
            '苏州': ['工业园区', '姑苏区', '虎丘区', '吴中区', '相城区'],
            '西安': ['高新区', '雁塔区', '未央区', '长安区', '莲湖区'],
            '重庆': ['渝北区', '江北区', '渝中区', '沙坪坝区', '九龙坡区'],
            '厦门': ['思明区', '湖里区', '集美区', '海沧区', '同安区'],
        }

        job_id = self.generate_job_id()
        
        return {
            'title': title,
            'company_name': company['name'],
            'company_industry': company['industry'],
            'company_size': company['size'],
            'company_type': company['type'],
            'salary': salary,
            'city': job_city,
            'district': random.choice(districts.get(job_city, ['市中心'])),
            'address': f"{job_city}市{random.choice(districts.get(job_city, ['市中心']))}某某大厦{random.randint(1, 50)}层",
            'education': random.choice(self.EDUCATIONS),
            'experience': random.choice(self.EXPERIENCES),
            'job_type': random.choice(self.JOB_TYPES),
            'description': self.generate_description(title),
            'requirements': self.generate_requirements(title),
            'benefits': ','.join(benefits),
            'skills': skills,
            'publish_date': publish_date.strftime('%Y-%m-%d'),
            'source_job_id': job_id,
            'source_url': f"{self.base_url}/job/{job_id}",
        }

    async def fetch(self, url: str, params: Dict = None) -> Optional[str]:
        return None

    async def parse_list_page(self, html: str) -> List[Dict[str, Any]]:
        return []

    async def parse_detail_page(self, html: str) -> Dict[str, Any]:
        return {}

    async def search_jobs(self, keyword: str = None, city: str = None, page: int = 1) -> List[Dict[str, Any]]:
        num_jobs = random.randint(8, 20)
        jobs = []
        
        for _ in range(num_jobs):
            job = self.generate_mock_job(keyword, city)
            jobs.append(job)
        
        return jobs

    async def run(self, keyword: str = None, city: str = None, max_pages: int = 5):
        self.log('info', f'Starting mock spider for {self.source_name}', details=f'keyword: {keyword}, city: {city}')
        
        all_jobs = []
        for page in range(1, max_pages + 1):
            jobs = await self.search_jobs(keyword, city, page)
            if not jobs:
                break
            all_jobs.extend(jobs)
        
        self.stats['total'] = len(all_jobs)
        self.log('info', f'Generated {len(all_jobs)} mock jobs')
        
        for raw_job in all_jobs:
            try:
                processed = self.process_raw_job(raw_job)
                self.save_job(processed)
                
                progress = int((self.stats['processed'] / max(self.stats['total'], 1)) * 100)
                self.update_task_progress(
                    progress=progress,
                    total=self.stats['total'],
                    processed=self.stats['processed'],
                    new=self.stats['new'],
                    duplicate=self.stats['duplicate']
                )
                
            except Exception as e:
                self.log('error', f'Error processing job: {str(e)}', details=str(raw_job))
                self.stats['failed'] += 1
        
        self.log('info', f'Mock spider completed. Stats: {self.stats}')
        
        return self.stats
