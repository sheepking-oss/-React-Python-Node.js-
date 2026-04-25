import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  Clock,
  Heart,
  GitCompare,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Users,
  TrendingUp,
  Calendar,
  Share2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useFavoriteContext } from '../contexts/FavoriteContext';
import { useComparisonContext } from '../contexts/ComparisonContext';
import { useAppContext } from '../contexts/AppContext';
import { jobApi } from '../services/api';
import {
  formatSalary,
  formatRelativeDate,
  parseSkills,
  getSalaryColor,
} from '../utils/formatters';
import JobCard from '../components/JobCard';

const JobDetail = () => {
  const { id } = useParams();
  const { isFavorited, toggleFavorite } = useFavoriteContext();
  const { isInComparison, addToComparison, comparisonCount, maxItems } = useComparisonContext();
  const { showToast } = useAppContext();

  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const favorited = job ? isFavorited(job.id) : false;
  const inComparison = job ? isInComparison(job.id) : false;
  const canAddToComparison = comparisonCount < maxItems;

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const response = await jobApi.getById(parseInt(id));
        if (response.success) {
          setJob(response.data);
        } else {
          setError('职位不存在');
        }
      } catch (err) {
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJob();
    }
  }, [id]);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const response = await jobApi.getRelated(parseInt(id));
        if (response.success) {
          setRelatedJobs(response.data.jobs || []);
        }
      } catch (err) {
        console.error('Failed to fetch related jobs:', err);
      }
    };

    if (id) {
      fetchRelated();
    }
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!job) return;
    const result = await toggleFavorite(job.id, job);
    if (result.success) {
      showToast(
        result.action === 'added' ? '已添加到收藏' : '已取消收藏',
        'success'
      );
    }
  };

  const handleAddToComparison = async () => {
    if (!job) return;

    if (!canAddToComparison && !inComparison) {
      showToast(`对比面板最多只能添加 ${maxItems} 个职位`, 'warning');
      return;
    }

    const result = await addToComparison(job.id, job);
    if (result.success) {
      showToast(inComparison ? '已从对比中移除' : '已添加到对比', 'success');
    } else if (result.message) {
      showToast(result.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-8 border border-gray-100">
              <div className="skeleton-title w-64 mb-4" />
              <div className="skeleton-text w-48 mb-6" />
              <div className="space-y-4">
                <div className="skeleton-text w-full" />
                <div className="skeleton-text w-full" />
                <div className="skeleton-text w-3/4" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="skeleton-text w-full h-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || '职位不存在'}</h2>
        <p className="text-gray-500 mb-6">请检查职位链接是否正确</p>
        <Link to="/search" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回搜索
        </Link>
      </div>
    );
  }

  const skills = parseSkills(job.skills);
  const benefits = job.benefits?.split(',').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回搜索结果
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-8 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <p className={`text-2xl font-bold ${getSalaryColor(job.salary_avg)}`}>
                    {formatSalary(job.salary_min, job.salary_max, job.salary_original)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      favorited
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
                    <span>{favorited ? '已收藏' : '收藏'}</span>
                  </button>
                  <button
                    onClick={handleAddToComparison}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      inComparison
                        ? 'border-primary-200 bg-primary-50 text-primary-600'
                        : canAddToComparison
                        ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <GitCompare className="w-5 h-5" />
                    <span>{inComparison ? '已对比' : '对比'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{job.company_name}</span>
                </div>
                {job.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{job.city}{job.district && ` · ${job.district}`}</span>
                  </div>
                )}
                {job.experience && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{job.experience}</span>
                  </div>
                )}
                {job.education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <span>{job.education}</span>
                  </div>
                )}
                {job.job_type && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{job.job_type}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {job.company_industry && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">行业</p>
                      <p className="text-sm font-medium text-gray-900">{job.company_industry}</p>
                    </div>
                  )}
                  {job.company_size && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">规模</p>
                      <p className="text-sm font-medium text-gray-900">{job.company_size}</p>
                    </div>
                  )}
                  {job.company_type && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">类型</p>
                      <p className="text-sm font-medium text-gray-900">{job.company_type}</p>
                    </div>
                  )}
                  {job.publish_date && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">发布时间</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatRelativeDate(job.publish_date)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {job.description && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">职位描述</h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </div>
            )}

            {job.requirements && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">任职要求</h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">技能标签</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {benefits.length > 0 && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">福利待遇</h2>
                <div className="flex flex-wrap gap-2">
                  {benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
                    >
                      {benefit.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.address && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">工作地点</h2>
                <p className="text-gray-600">{job.address}</p>
              </div>
            )}

            {relatedJobs.length > 0 && (
              <div className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">相似职位</h2>
                <div className="space-y-4">
                  {relatedJobs.slice(0, 5).map((relatedJob) => (
                    <JobCard key={relatedJob.id} job={relatedJob} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 sticky top-24">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">查看次数</span>
                  <span className="font-medium text-gray-900">{job.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">收藏人数</span>
                  <span className="font-medium text-gray-900">{job.favorite_count || 0}</span>
                </div>
                {job.crawl_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">抓取时间</span>
                    <span className="font-medium text-gray-900">
                      {formatRelativeDate(job.crawl_date)}
                    </span>
                  </div>
                )}
                {job.source_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">数据来源</span>
                    <span className="font-medium text-gray-900">{job.source_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    查看原职位
                  </a>
                )}
                <button
                  onClick={handleToggleFavorite}
                  className={`w-full px-4 py-2 rounded-lg border font-medium transition-colors ${
                    favorited
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {favorited ? '取消收藏' : '收藏职位'}
                </button>
                <button className="w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  分享职位
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
