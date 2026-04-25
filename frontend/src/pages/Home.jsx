import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  BarChart3,
  LayoutDashboard,
  Heart,
  GitCompare,
  TrendingUp,
  MapPin,
  Briefcase,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useSearchContext } from '../contexts/SearchContext';
import { useAppContext } from '../contexts/AppContext';
import { analysisApi } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const { searchQuery, updateSearchQuery, performSearch } = useSearchContext();
  const { showToast, filterOptions } = useAppContext();

  const [searchInput, setSearchInput] = useState(searchQuery.keyword || '');
  const [selectedCity, setSelectedCity] = useState(searchQuery.city || '');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await analysisApi.getDashboard();
        if (response.success) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      }
    };
    fetchDashboard();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearchQuery({
      keyword: searchInput,
      city: selectedCity,
    });
    performSearch();
    navigate('/search');
  };

  const hotKeywords = ['Python开发', 'Java开发', '前端开发', '产品经理', '数据分析', '算法工程师'];

  const features = [
    {
      icon: <Search className="w-8 h-8 text-primary-600" />,
      title: '智能搜索',
      description: '多条件组合筛选，精准定位目标职位',
      path: '/search',
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary-600" />,
      title: '数据分析',
      description: '技能词云、薪资趋势、地区热力图',
      path: '/analysis',
    },
    {
      icon: <LayoutDashboard className="w-8 h-8 text-primary-600" />,
      title: '实时看板',
      description: '每日新增岗位、市场动态追踪',
      path: '/dashboard',
    },
    {
      icon: <Heart className="w-8 h-8 text-primary-600" />,
      title: '职位收藏',
      description: '收藏心仪职位，随时查看对比',
      path: '/favorites',
    },
    {
      icon: <GitCompare className="w-8 h-8 text-primary-600" />,
      title: '职位对比',
      description: '多维度对比分析，做出最优选择',
      path: '/comparison',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary-600" />,
      title: '薪资预测',
      description: '基于市场数据，智能评估薪资水平',
      path: '/analysis',
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>汇聚多平台招聘信息</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            找到理想工作，
            <span className="text-gradient">从这里开始</span>
          </h1>

          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            智能搜索、数据分析、职位对比，全方位助您把握就业市场动态，
            做出更明智的职业决策。
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center">
                <Search className="w-5 h-5 text-gray-400 ml-4" />
                <input
                  type="text"
                  placeholder="搜索职位、公司、技能关键词..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">所有城市</option>
                {filterOptions.cities.slice(0, 10).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary px-8 py-3 text-base"
              >
                搜索职位
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="text-sm text-gray-500">热门搜索：</span>
            {hotKeywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => {
                  setSearchInput(keyword);
                  updateSearchQuery({ keyword });
                  performSearch();
                  navigate('/search');
                }}
                className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dashboardData && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">总职位数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.metrics?.total_jobs?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">今日新增</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{dashboardData.metrics?.today_new_jobs || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">覆盖城市</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filterOptions.cities.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">平均薪资</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {dashboardData.metrics?.avg_salary
                      ? `${(dashboardData.metrics.avg_salary / 1000).toFixed(1)}K`
                      : '面议'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            为什么选择我们
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            全方位的招聘数据分析平台，助您洞察市场趋势，把握职业机会
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.path}
              className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                {feature.title}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好开始您的职业探索之旅了吗？
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            立即搜索职位，发现更多机会。我们的数据将帮助您做出更明智的选择。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              搜索职位
            </Link>
            <Link
              to="/analysis"
              className="px-8 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors border border-primary-500"
            >
              查看分析
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
