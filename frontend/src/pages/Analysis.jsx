import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Cloud,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { analysisApi } from '../services/api';
import { formatSalaryAvg, formatNumber, formatPercentage } from '../utils/formatters';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];

const Analysis = () => {
  const { filterOptions, showToast } = useAppContext();

  const [activeTab, setActiveTab] = useState('wordcloud');
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [days, setDays] = useState(30);

  const [wordcloudData, setWordcloudData] = useState(null);
  const [salaryDistribution, setSalaryDistribution] = useState(null);
  const [salaryByGroup, setSalaryByGroup] = useState(null);
  const [salaryTrend, setSalaryTrend] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);

  const tabs = [
    { id: 'wordcloud', label: '技能词云', icon: <Cloud className="w-4 h-4" /> },
    { id: 'salary', label: '薪资分析', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'trend', label: '薪资趋势', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'heatmap', label: '地区分布', icon: <MapPin className="w-4 h-4" /> },
  ];

  const fetchWordCloud = async () => {
    setLoading(true);
    try {
      const response = await analysisApi.getWordCloud({
        keyword: keyword || undefined,
        city: selectedCity || undefined,
        industry: selectedIndustry || undefined,
        days,
      });
      if (response.success) {
        setWordcloudData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch wordcloud:', error);
      showToast('获取词云数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryAnalysis = async () => {
    setLoading(true);
    try {
      const [distRes, groupRes] = await Promise.all([
        analysisApi.getSalaryDistribution({
          keyword: keyword || undefined,
          city: selectedCity || undefined,
          industry: selectedIndustry || undefined,
        }),
        analysisApi.getSalaryByGroup('city', keyword || undefined),
      ]);
      if (distRes.success) setSalaryDistribution(distRes.data);
      if (groupRes.success) setSalaryByGroup(groupRes.data);
    } catch (error) {
      console.error('Failed to fetch salary analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryTrend = async () => {
    setLoading(true);
    try {
      const response = await analysisApi.getSalaryTrend({
        keyword: keyword || undefined,
        city: selectedCity || undefined,
        days: 90,
      });
      if (response.success) {
        setSalaryTrend(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary trend:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const response = await analysisApi.getHeatmap({
        keyword: keyword || undefined,
        industry: selectedIndustry || undefined,
        days,
        metric: 'count',
      });
      if (response.success) {
        setHeatmapData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch (activeTab) {
      case 'wordcloud':
        fetchWordCloud();
        break;
      case 'salary':
        fetchSalaryAnalysis();
        break;
      case 'trend':
        fetchSalaryTrend();
        break;
      case 'heatmap':
        fetchHeatmap();
        break;
    }
  }, [activeTab, keyword, selectedCity, selectedIndustry, days]);

  const handleRefresh = () => {
    switch (activeTab) {
      case 'wordcloud':
        fetchWordCloud();
        break;
      case 'salary':
        fetchSalaryAnalysis();
        break;
      case 'trend':
        fetchSalaryTrend();
        break;
      case 'heatmap':
        fetchHeatmap();
        break;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              数据分析
            </h1>
            <p className="text-gray-500 mt-1">多维度市场数据分析，洞察就业趋势</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="关键词筛选..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
              />
            </div>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">所有城市</option>
              {filterOptions.cities.slice(0, 10).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={7}>近7天</option>
              <option value={14}>近14天</option>
              <option value={30}>近30天</option>
              <option value={90}>近90天</option>
            </select>

            <button onClick={handleRefresh} className="btn-outline">
              刷新
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 mb-8">
          <div className="flex overflow-x-auto border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="loader" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        )}

        {!loading && activeTab === 'wordcloud' && wordcloudData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">分析职位数</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(wordcloudData.total_jobs)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">独特关键词</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(wordcloudData.unique_words)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">分析周期</h3>
                <p className="text-3xl font-bold text-primary-600">{days} 天</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">技能词云</h3>
                {wordcloudData.wordcloud && wordcloudData.wordcloud.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {wordcloudData.wordcloud.slice(0, 50).map((item, index) => {
                      const size = Math.min(Math.max(item.count / 5, 12), 32);
                      const opacity = Math.min(Math.max(item.count / 50, 0.4), 1);
                      return (
                        <span
                          key={index}
                          className="word-cloud-word cursor-pointer hover:text-primary-600 transition-all"
                          style={{
                            fontSize: `${size}px`,
                            opacity,
                            color: COLORS[index % COLORS.length],
                          }}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无词云数据</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">热门技能排行</h3>
                {wordcloudData.top_skills && wordcloudData.top_skills.length > 0 ? (
                  <div className="space-y-4">
                    {wordcloudData.top_skills.slice(0, 10).map((skill, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-400 w-6">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {skill.skill}
                            </span>
                            <span className="text-sm text-gray-500">{skill.count} 次</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                              style={{
                                width: `${(skill.count / (wordcloudData.top_skills[0]?.count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无热门技能数据</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'salary' && salaryDistribution && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">分析职位数</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(salaryDistribution.total_jobs)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">有效薪资数据</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(salaryDistribution.valid_salary_jobs)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">平均薪资</h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatSalaryAvg(salaryDistribution.avg_salary)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">薪资区间</h3>
                <p className="text-3xl font-bold text-primary-600">
                  {formatSalaryAvg(salaryDistribution.min_salary)} -{' '}
                  {formatSalaryAvg(salaryDistribution.max_salary)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">薪资分布</h3>
                {salaryDistribution.distribution && salaryDistribution.distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={salaryDistribution.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="salary_range" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="职位数量"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无薪资分布数据</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">薪资占比</h3>
                {salaryDistribution.distribution && salaryDistribution.distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={salaryDistribution.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="count"
                        nameKey="salary_range"
                        label={({ salary_range, percentage }) =>
                          `${salary_range}: ${percentage}%`
                        }
                        labelLine={false}
                      >
                        {salaryDistribution.distribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无薪资占比数据</p>
                  </div>
                )}
              </div>
            </div>

            {salaryByGroup && salaryByGroup.items && salaryByGroup.items.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">各城市薪资对比</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={salaryByGroup.items.slice(0, 15)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="group"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="avg_salary"
                      name="平均薪资(K)"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'trend' && salaryTrend && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">薪资趋势变化</h3>
              {salaryTrend.trend && salaryTrend.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={salaryTrend.trend}>
                    <defs>
                      <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="avg_salary"
                      name="平均薪资(K)"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorSalary)"
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="职位数量"
                      stroke="#8b5cf6"
                      yAxisId={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无薪资趋势数据</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">趋势统计</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <span className="text-gray-600">分析周期</span>
                    <span className="font-medium text-gray-900">{salaryTrend.days_analyzed} 天</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <span className="text-gray-600">分析职位数</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(salaryTrend.total_jobs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'heatmap' && heatmapData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">总职位数</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(heatmapData.total_jobs)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">覆盖城市</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(heatmapData.cities_count)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">整体平均薪资</h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatSalaryAvg(heatmapData.overall_avg_salary)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">分析周期</h3>
                <p className="text-3xl font-bold text-primary-600">{days} 天</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">各城市职位数量</h3>
                {heatmapData.heatmap && heatmapData.heatmap.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={heatmapData.heatmap.slice(0, 15)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="职位数量"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无地区分布数据</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">各城市平均薪资</h3>
                {heatmapData.heatmap && heatmapData.heatmap.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={heatmapData.heatmap.slice(0, 15)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="avg_salary"
                        name="平均薪资(K)"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无地区薪资数据</p>
                  </div>
                )}
              </div>
            </div>

            {heatmapData.top_cities && heatmapData.top_cities.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">热门城市排行</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {heatmapData.top_cities.map((city, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-primary-50 to-white rounded-lg border border-primary-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          TOP {index + 1}
                        </span>
                        <MapPin className="w-4 h-4 text-primary-500" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">{city.city}</h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {city.count} 个职位
                        </span>
                        <span className="font-semibold text-green-600">
                          {formatSalaryAvg(city.avg_salary)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
