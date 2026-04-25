import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Briefcase,
  MapPin,
  RefreshCw,
  DollarSign,
  Users,
  Calendar,
  Search,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { analysisApi, crawlApi } from '../services/api';
import { formatNumber, formatSalaryAvg, formatPercentage } from '../utils/formatters';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const { filterOptions, showToast } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [weekdayStats, setWeekdayStats] = useState(null);
  const [crawlStatus, setCrawlStatus] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashboardRes, dailyRes, weekdayRes, crawlRes] = await Promise.all([
        analysisApi.getDashboard(selectedCity || undefined),
        analysisApi.getDailyStats({
          city: selectedCity || undefined,
          days: 14,
        }),
        analysisApi.getWeekdayStats({
          city: selectedCity || undefined,
          days: 90,
        }),
        crawlApi.getStatus(),
      ]);

      if (dashboardRes.success) setDashboardData(dashboardRes.data);
      if (dailyRes.success) setDailyStats(dailyRes.data);
      if (weekdayRes.success) setWeekdayStats(weekdayRes.data);
      if (crawlRes.success) setCrawlStatus(crawlRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedCity]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDashboard, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCity]);

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

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              <span>{change >= 0 ? '+' : ''}{change}% 较昨日</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            color === 'blue'
              ? 'bg-blue-50 text-blue-600'
              : color === 'green'
              ? 'bg-green-50 text-green-600'
              : color === 'purple'
              ? 'bg-purple-50 text-purple-600'
              : 'bg-orange-50 text-orange-600'
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const growthFromYesterday =
    dashboardData?.metrics &&
    dashboardData.metrics.yesterday_new_jobs > 0
      ? Math.round(
          ((dashboardData.metrics.today_new_jobs - dashboardData.metrics.yesterday_new_jobs) /
            dashboardData.metrics.yesterday_new_jobs) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-primary-600" />
              实时看板
            </h1>
            <p className="text-gray-500 mt-1">实时追踪招聘市场动态</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全国</option>
              {filterOptions.cities.slice(0, 15).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">自动刷新(每分钟)</span>
            </label>

            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="btn-outline inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {loading && !dashboardData && (
          <div className="flex items-center justify-center py-20">
            <div className="loader" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        )}

        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="总职位数"
                value={formatNumber(dashboardData.metrics?.total_jobs || 0)}
                icon={Briefcase}
                color="blue"
              />
              <StatCard
                title="今日新增"
                value={formatNumber(dashboardData.metrics?.today_new_jobs || 0)}
                change={growthFromYesterday}
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="平均薪资"
                value={formatSalaryAvg(dashboardData.metrics?.avg_salary || 0)}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="覆盖城市"
                value={formatNumber(filterOptions.cities.length || 0)}
                icon={MapPin}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  每日新增岗位趋势
                </h3>
                {dailyStats?.daily_stats && dailyStats.daily_stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyStats.daily_stats}>
                      <defs>
                        <linearGradient id="colorNewJobs" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="new_jobs"
                        name="新增岗位"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorNewJobs)"
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_salary"
                        name="平均薪资(K)"
                        stroke="#8b5cf6"
                        fillOpacity={0}
                        yAxisId={0}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无每日统计数据</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  星期发布分布
                </h3>
                {weekdayStats?.weekday_stats && weekdayStats.weekday_stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weekdayStats.weekday_stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="weekday_name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="total_jobs"
                        name="岗位数量"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="avg_per_week"
                        name="周均数量"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无星期分布数据</p>
                  </div>
                )}
              </div>
            </div>

            {dailyStats?.summary && (
              <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  统计摘要
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">周期新增</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(dailyStats.summary.total_new_jobs || 0)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">日均新增</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dailyStats.summary.avg_daily_new_jobs?.toFixed(1) || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">单日最高</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(dailyStats.summary.max_daily_new_jobs || 0)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">周期平均薪资</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {formatSalaryAvg(dailyStats.summary.overall_avg_salary || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {crawlStatus && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  抓取任务状态
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">运行状态</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          crawlStatus.is_running
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {crawlStatus.is_running ? '运行中' : '空闲'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {crawlStatus.running_count || 0}
                    </p>
                    <p className="text-sm text-gray-500">运行中的任务</p>
                  </div>

                  <div className="p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">最近任务</p>
                    {crawlStatus.recent_tasks && crawlStatus.recent_tasks.length > 0 ? (
                      <div className="space-y-2">
                        {crawlStatus.recent_tasks.slice(0, 3).map((task, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 truncate">
                              {task.task_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                task.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : task.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : task.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">暂无任务记录</p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">快速操作</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          crawlApi.quick('Python开发').then(() => {
                            showToast('抓取任务已启动', 'success');
                          });
                        }}
                        className="w-full btn-outline text-sm"
                      >
                        抓取Python岗位
                      </button>
                      <button
                        onClick={() => {
                          crawlApi.quick('前端开发').then(() => {
                            showToast('抓取任务已启动', 'success');
                          });
                        }}
                        className="w-full btn-outline text-sm"
                      >
                        抓取前端岗位
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
