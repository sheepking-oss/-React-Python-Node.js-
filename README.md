# 招聘岗位聚合分析系统

一个面向求职场景的岗位信息聚合平台，采用 React + Node.js + Python 三层架构，实现岗位抓取、数据清洗、智能分析和可视化展示。

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                         React 前端层                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ 首页    │ 搜索页  │ 详情页  │ 收藏页  │ 对比页  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────┬──────────┬──────────┐                       │
│  │ 分析页  │ 看板页  │ 组件库  │                       │
│  └──────────┴──────────┴──────────┘                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Node.js 接口层                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Jobs    │ Favorites│Comparison│ Analysis │  Crawl   │  │
│  │ 路由    │ 路由     │ 路由     │ 路由     │ 路由    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              错误处理、日志记录、限流中间件             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Python 数据层                          │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │   爬虫模块    │   数据处理    │   分析模块    │          │
│  │  (Spiders)   │  (Services)  │  (Analysis)  │          │
│  └──────────────┴──────────────┴──────────────┘          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              数据模型、任务调度、缓存管理               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 核心功能

### 职位管理
- **职位搜索**：关键词搜索、多条件组合筛选
- **多条件筛选**：城市、薪资、学历、经验、工作类型、行业
- **职位详情**：完整职位信息展示、公司信息、任职要求
- **分页查询**：支持分页浏览、自定义每页数量

### 收藏与对比
- **职位收藏**：支持多收藏夹管理、备注功能
- **对比面板**：最多 5 个职位同时对比
- **对比报告**：多维度对比分析报告
- **批量操作**：批量添加对比、批量取消收藏

### 数据分析
- **技能词云**：职位技能关键词热度分析
- **薪资分布**：薪资区间分布统计
- **薪资趋势**：历史薪资变化趋势
- **地区热力图**：各城市职位数量和薪资分布
- **每日新增**：每日新增岗位统计看板

### 任务管理
- **抓取任务**：任务调度、定时抓取
- **异常记录**：抓取日志、错误追踪
- **任务进度**：实时查看抓取进度和状态

## 技术栈

### 前端 (React)
- **框架**: React 18 + React Router 6
- **构建工具**: Vite 5
- **状态管理**: React Context API
- **样式**: Tailwind CSS 3
- **可视化**: Recharts
- **HTTP 客户端**: Axios
- **工具库**: Day.js, Lucide React

### 后端 (Node.js)
- **框架**: Express 4
- **HTTP 客户端**: Axios
- **日志**: Winston + Morgan
- **安全**: Helmet + CORS + Rate Limit
- **工具**: Dotenv, UUID

### 数据层 (Python)
- **Web 框架**: FastAPI
- **数据库 ORM**: SQLAlchemy
- **HTTP 客户端**: Aiohttp
- **任务调度**: Schedule
- **数据处理**: 内置分词、相似度计算

## 项目结构

```
招聘岗位聚合分析系统/
├── frontend/                # React 前端
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── JobCard.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   └── Pagination.jsx
│   │   ├── contexts/       # 状态管理
│   │   │   ├── AppContext.jsx
│   │   │   ├── SearchContext.jsx
│   │   │   ├── FavoriteContext.jsx
│   │   │   └── ComparisonContext.jsx
│   │   ├── pages/          # 页面组件
│   │   │   ├── Home.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── JobDetail.jsx
│   │   │   ├── Favorites.jsx
│   │   │   ├── Comparison.jsx
│   │   │   ├── Analysis.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── services/       # API 服务
│   │   │   └── api.js
│   │   ├── utils/          # 工具函数
│   │   │   └── formatters.js
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.svg
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                 # Node.js 接口层
│   ├── config/             # 配置文件
│   │   └── config.js
│   ├── controllers/        # 控制器
│   │   ├── jobController.js
│   │   ├── favoriteController.js
│   │   ├── comparisonController.js
│   │   ├── analysisController.js
│   │   └── crawlController.js
│   ├── middleware/         # 中间件
│   │   └── errorHandler.js
│   ├── routes/             # 路由
│   │   ├── index.js
│   │   ├── jobs.js
│   │   ├── favorites.js
│   │   ├── comparisons.js
│   │   ├── analysis.js
│   │   └── crawl.js
│   ├── services/           # 服务
│   │   └── pythonApiService.js
│   ├── utils/              # 工具
│   │   └── logger.js
│   ├── app.js
│   └── package.json
│
├── python/                  # Python 数据层
│   ├── analysis/           # 分析模块
│   │   ├── __init__.py
│   │   ├── wordcloud_analyzer.py
│   │   ├── salary_analyzer.py
│   │   ├── heatmap_analyzer.py
│   │   └── daily_stats_analyzer.py
│   ├── config/             # 配置
│   │   └── settings.py
│   ├── models/             # 数据模型
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── models.py
│   ├── services/           # 服务层
│   │   ├── __init__.py
│   │   ├── db_service.py
│   │   └── data_processor.py
│   ├── spiders/            # 爬虫模块
│   │   ├── __init__.py
│   │   ├── base_spider.py
│   │   ├── mock_spider.py
│   │   └── scheduler.py
│   ├── api_server.py
│   └── requirements.txt
│
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- Python >= 3.8
- npm 或 yarn

### 安装依赖

**1. 安装 Python 依赖**
```bash
cd python
pip install -r requirements.txt
```

**2. 安装 Node.js 依赖**
```bash
cd backend
npm install
```

**3. 安装前端依赖**
```bash
cd frontend
npm install
```

### 启动服务

**1. 启动 Python API 服务**
```bash
cd python
python api_server.py
```
服务地址: http://localhost:8001

**2. 启动 Node.js 接口层**
```bash
cd backend
npm run dev
```
服务地址: http://localhost:3001

**3. 启动前端开发服务器**
```bash
cd frontend
npm run dev
```
服务地址: http://localhost:3000

### 初始化数据

系统内置了模拟爬虫，可以生成测试数据：

1. 访问 Python API: http://localhost:8001
2. 调用抓取接口生成测试数据：
```bash
curl -X POST "http://localhost:8001/api/crawl/start?keyword=Python&max_pages=5"
```

或者通过前端看板页面的快速抓取功能生成数据。

## API 接口

### Node.js API (端口: 3001)

#### 职位相关
- `GET /api/jobs/search` - 搜索职位
- `GET /api/jobs/:id` - 获取职位详情
- `GET /api/jobs/filters/options` - 获取筛选选项

#### 收藏相关
- `GET /api/favorites` - 获取收藏列表
- `POST /api/favorites` - 添加收藏
- `DELETE /api/favorites/:job_id` - 取消收藏

#### 对比相关
- `POST /api/comparisons/create` - 创建对比会话
- `GET /api/comparisons/:session_id` - 获取对比内容
- `POST /api/comparisons/add` - 添加到对比
- `DELETE /api/comparisons/remove` - 从对比中移除

#### 分析相关
- `GET /api/analysis/wordcloud` - 技能词云
- `GET /api/analysis/salary/distribution` - 薪资分布
- `GET /api/analysis/salary/trend` - 薪资趋势
- `GET /api/analysis/heatmap` - 地区热力图
- `GET /api/analysis/daily` - 每日统计
- `GET /api/analysis/dashboard` - 实时看板

#### 抓取相关
- `POST /api/crawl/start` - 启动抓取任务
- `GET /api/crawl/task/:task_id` - 获取任务状态
- `GET /api/crawl/status` - 获取抓取状态

## 核心设计

### 职位唯一性判断
```python
# 通过以下组合生成唯一标识
unique_key = md5(title + company_name + city + salary_original)

# 相似度计算
similarity = SequenceMatcher(None, text1, text2).ratio()
```

### 薪资解析
- 支持多格式：`15K-25K/月`、`20-35万/年`、`25K以上`
- 自动转换为月薪单位
- 异常值过滤（低于 1000 或高于 100万）

### 分析结果缓存
- 使用数据库缓存层存储分析结果
- 可配置缓存过期时间
- 支持强制刷新

### 分页设计
- 默认每页 20 条
- 最大支持 100 条/页
- 支持按发布时间、薪资、热度排序

## 主流程设计

```
┌─────────────────────────────────────────────────────────────┐
│                     搜索—分析—收藏—对比 主流程                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  │  搜索   │───▶│  分析   │───▶│  收藏   │───▶│  对比   │ │
│  │  Search │    │Analysis │    │Favorite │    │Comparison│ │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
│       │              │              │              │         │
│       ▼              ▼              ▼              ▼         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              统一的 Context 状态管理                   │   │
│  │  SearchContext | FavoriteContext | ComparisonContext │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 前端 Context 设计
- **AppContext**: 全局配置、Toast 提示、主题切换
- **SearchContext**: 搜索条件、搜索结果、分页信息
- **FavoriteContext**: 收藏列表、收藏夹管理、收藏状态
- **ComparisonContext**: 对比列表、对比会话、对比报告

### 后端路由设计
- 按功能模块划分路由
- 统一的错误处理中间件
- 请求限流和安全保护

## 扩展开发

### 添加新的爬虫源
1. 继承 `BaseSpider` 类
2. 实现 `search_jobs` 和 `fetch` 方法
3. 在 `scheduler.py` 中注册新爬虫

### 添加新的分析指标
1. 在 `analysis/` 目录创建新的分析器
2. 继承基础分析模式
3. 在 Python API 中添加新接口
4. 在前端添加新的图表组件

## License

MIT License
