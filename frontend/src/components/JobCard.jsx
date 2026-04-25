import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  Clock,
  Heart,
  GitCompare,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { useFavoriteContext } from '../contexts/FavoriteContext';
import { useComparisonContext } from '../contexts/ComparisonContext';
import { useAppContext } from '../contexts/AppContext';
import { formatSalary, formatRelativeDate, parseSkills, getSalaryColor } from '../utils/formatters';

const JobCard = ({ job, compact = false, showActions = true }) => {
  const { isFavorited, toggleFavorite } = useFavoriteContext();
  const { isInComparison, addToComparison, comparisonCount, maxItems } = useComparisonContext();
  const { showToast } = useAppContext();

  const favorited = isFavorited(job.id);
  const inComparison = isInComparison(job.id);
  const canAddToComparison = comparisonCount < maxItems;

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleFavorite(job.id, job);
    if (result.success) {
      showToast(
        result.action === 'added' ? '已添加到收藏' : '已取消收藏',
        'success'
      );
    }
  };

  const handleAddToComparison = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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

  const skills = parseSkills(job.skills);

  if (compact) {
    return (
      <Link
        to={`/job/${job.id}`}
        className="block p-4 bg-white rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{job.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{job.company_name}</p>
          </div>
          <span className={`text-sm font-semibold ml-4 whitespace-nowrap ${getSalaryColor(job.salary_avg)}`}>
            {formatSalary(job.salary_min, job.salary_max, job.salary_original)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/job/${job.id}`}
      className="block p-6 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {job.title}
            </h3>
            <span className={`text-lg font-bold ml-4 whitespace-nowrap ${getSalaryColor(job.salary_avg)}`}>
              {formatSalary(job.salary_min, job.salary_max, job.salary_original)}
            </span>
          </div>

          <div className="mt-2 flex items-center text-sm text-gray-600 flex-wrap gap-3">
            <span className="flex items-center">
              <Building2 className="w-4 h-4 mr-1 text-gray-400" />
              {job.company_name}
            </span>
            {job.city && (
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                {job.city}
                {job.district && ` · ${job.district}`}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center flex-wrap gap-3 text-sm">
            {job.experience && (
              <span className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                {job.experience}
              </span>
            )}
            {job.education && (
              <span className="flex items-center text-gray-600">
                <GraduationCap className="w-4 h-4 mr-1 text-gray-400" />
                {job.education}
              </span>
            )}
            {job.job_type && (
              <span className="flex items-center text-gray-600">
                <Briefcase className="w-4 h-4 mr-1 text-gray-400" />
                {job.job_type}
              </span>
            )}
          </div>

          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 5).map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 5 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  +{skills.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex sm:flex-col items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                favorited
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={favorited ? '取消收藏' : '收藏'}
            >
              <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleAddToComparison}
              className={`p-2 rounded-lg transition-colors ${
                inComparison
                  ? 'text-primary-600 bg-primary-50'
                  : canAddToComparison
                  ? 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={inComparison ? '从对比中移除' : '添加到对比'}
            >
              <GitCompare className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {job.publish_date && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>
            {job.source_name && `${job.source_name} · `}
            {formatRelativeDate(job.publish_date)}发布
          </span>
          {(job.view_count > 0 || job.favorite_count > 0) && (
            <span className="flex items-center gap-3">
              {job.view_count > 0 && <span>{job.view_count}次查看</span>}
              {job.favorite_count > 0 && <span>{job.favorite_count}人收藏</span>}
            </span>
          )}
        </div>
      )}
    </Link>
  );
};

export default JobCard;
