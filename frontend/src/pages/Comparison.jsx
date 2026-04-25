import React, { useEffect } from 'react';
import {
  GitCompare,
  X,
  Trash2,
  Search,
  Download,
  RefreshCw,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComparisonContext } from '../contexts/ComparisonContext';
import { useAppContext } from '../contexts/AppContext';
import {
  formatSalary,
  generateComparisonMatrix,
  getExperienceLevel,
  getEducationLevel,
} from '../utils/formatters';

const Comparison = () => {
  const {
    comparisonJobs,
    comparisonCount,
    maxItems,
    isEmpty,
    removeFromComparison,
    clearComparison,
    getComparisonReport,
    isInComparison,
  } = useComparisonContext();
  const { showToast } = useAppContext();

  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (comparisonCount > 1) {
      setLoading(true);
      getComparisonReport().then((data) => {
        setReport(data);
        setLoading(false);
      });
    } else {
      setReport(null);
    }
  }, [comparisonJobs, getComparisonReport]);

  const handleRemove = async (jobId) => {
    const success = await removeFromComparison(jobId);
    if (success) {
      showToast('已从对比中移除', 'success');
    }
  };

  const comparisonMatrix = comparisonJobs.length > 0 ? generateComparisonMatrix(comparisonJobs) : [];

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            对比面板为空
          </h2>
          <p className="text-gray-500 mb-8">
            在职位列表或详情页点击"对比"按钮，将职位添加到对比面板
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/search"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              搜索职位
            </Link>
            <Link
              to="/favorites"
              className="btn-outline inline-flex items-center gap-2"
            >
              查看收藏
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-primary-600" />
              职位对比
            </h1>
            <p className="text-gray-500 mt-1">
              已选择 {comparisonCount} / {maxItems} 个职位进行对比
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-outline inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={clearComparison}
              className="text-sm text-red-500 hover:text-red-700"
            >
              清空对比
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-32 px-6 py-4 text-left text-sm font-medium text-gray-500">
                    对比项
                  </th>
                  {comparisonJobs.map((job) => (
                    <th
                      key={job.id}
                      className="px-6 py-4 text-left text-sm font-medium min-w-[200px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-semibold truncate">
                            {job.title}
                          </p>
                          <p className="text-gray-500 text-sm truncate">
                            {job.company_name}
                          </p>
                          <p className="text-primary-600 font-semibold text-sm mt-1">
                            {formatSalary(job.salary_min, job.salary_max, job.salary_original)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {comparisonMatrix.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr className="bg-primary-50">
                      <td
                        colSpan={comparisonCount + 1}
                        className="px-6 py-3"
                      >
                        <span className="text-sm font-semibold text-primary-700">
                          {category.category}
                        </span>
                      </td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr
                        key={`${categoryIndex}-${itemIndex}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                          {item.label}
                        </td>
                        {item.values.map((value, valueIndex) => (
                          <td key={valueIndex} className="px-6 py-4 text-sm text-gray-900">
                            {value || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {report && comparisonCount >= 2 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              对比分析报告
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {report.comparisons?.salary && (
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    薪资范围
                  </h3>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-gray-900">
                      {report.comparisons.salary.min
                        ? `${(report.comparisons.salary.min / 1000).toFixed(1)}K`
                        : '-'}
                      <span className="text-gray-400 text-sm mx-1">-</span>
                      {report.comparisons.salary.max
                        ? `${(report.comparisons.salary.max / 1000).toFixed(1)}K`
                        : '-'}
                    </p>
                    <p className="text-sm text-gray-500">
                      平均: {report.comparisons.salary.average
                        ? `${(report.comparisons.salary.average / 1000).toFixed(1)}K`
                        : '-'}
                    </p>
                  </div>
                </div>
              )}

              {report.comparisons?.cities && (
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    覆盖城市
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {report.comparisons.cities.map((city, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.comparisons?.common_skills &&
                report.comparisons.common_skills.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      共同技能
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {report.comparisons.common_skills.slice(0, 5).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  职位数量
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {comparisonCount} 个
                </p>
                <p className="text-sm text-gray-500">
                  可再添加 {maxItems - comparisonCount} 个
                </p>
              </div>
            </div>

            {report.comparisons?.unique_skills &&
              Object.keys(report.comparisons.unique_skills).length > 0 && (
                <div className="mt-6 bg-white rounded-xl p-6 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">
                    各职位独特技能
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(report.comparisons.unique_skills).map(
                      ([index, skills]) => {
                        const job = comparisonJobs[parseInt(index)];
                        if (!job) return null;
                        return (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900 mb-2 truncate">
                              {job.title}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {skills.map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/search" className="btn-outline inline-flex items-center gap-2">
            <Search className="w-4 h-4" />
            继续搜索
          </Link>
          <button
            onClick={() => showToast('导出功能开发中', 'info')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出对比报告
          </button>
        </div>
      </div>
    </div>
  );
};

export default Comparison;
