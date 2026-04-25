import React, { useState } from 'react';
import {
  Filter,
  MapPin,
  Building2,
  GraduationCap,
  Clock,
  Briefcase,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSearchContext } from '../contexts/SearchContext';
import { useAppContext } from '../contexts/AppContext';

const FilterPanel = ({ isOpen, onClose }) => {
  const { searchQuery, updateSearchQuery, clearSearchQuery, performSearch, hasActiveFilters, activeFiltersCount } = useSearchContext();
  const { filterOptions } = useAppContext();

  const [expandedSections, setExpandedSections] = useState({
    salary: true,
    location: true,
    education: true,
    experience: true,
    jobType: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    updateSearchQuery({ [field]: value === 'all' ? '' : value });
  };

  const handleReset = () => {
    clearSearchQuery();
  };

  const handleApply = () => {
    performSearch();
    if (onClose) onClose();
  };

  const SectionHeader = ({ title, icon: Icon, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      <div className="flex items-center space-x-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span>{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );

  const SelectField = ({ value, onChange, options, placeholder, allowAll = true }) => (
    <select
      value={value || 'all'}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
    >
      {allowAll && <option value="all">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">筛选条件</h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                {activeFiltersCount} 个筛选
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              重置
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-2">
          <SectionHeader title="薪资范围" icon={DollarSign} section="salary" />
          {expandedSections.salary && (
            <div className="space-y-3 pl-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">最低</label>
                  <SelectField
                    value={searchQuery.salary_min || ''}
                    onChange={(v) => handleChange('salary_min', v ? parseInt(v) : null)}
                    options={[5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000]}
                    placeholder="不限"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">最高</label>
                  <SelectField
                    value={searchQuery.salary_max || ''}
                    onChange={(v) => handleChange('salary_max', v ? parseInt(v) : null)}
                    options={[10000, 15000, 20000, 25000, 30000, 40000, 50000, 80000, 100000]}
                    placeholder="不限"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-50" />

        <div className="space-y-2">
          <SectionHeader title="工作地点" icon={MapPin} section="location" />
          {expandedSections.location && (
            <div className="pl-6">
              <SelectField
                value={searchQuery.city}
                onChange={(v) => handleChange('city', v)}
                options={filterOptions.cities}
                placeholder="所有城市"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-50" />

        <div className="space-y-2">
          <SectionHeader title="学历要求" icon={GraduationCap} section="education" />
          {expandedSections.education && (
            <div className="pl-6">
              <SelectField
                value={searchQuery.education}
                onChange={(v) => handleChange('education', v)}
                options={filterOptions.educations}
                placeholder="不限学历"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-50" />

        <div className="space-y-2">
          <SectionHeader title="工作经验" icon={Clock} section="experience" />
          {expandedSections.experience && (
            <div className="pl-6">
              <SelectField
                value={searchQuery.experience}
                onChange={(v) => handleChange('experience', v)}
                options={filterOptions.experiences}
                placeholder="不限经验"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-50" />

        <div className="space-y-2">
          <SectionHeader title="工作类型" icon={Briefcase} section="jobType" />
          {expandedSections.jobType && (
            <div className="pl-6">
              <div className="flex flex-wrap gap-2">
                {['全职', '兼职', '实习'].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      handleChange(
                        'job_type',
                        searchQuery.job_type === type ? '' : type
                      )
                    }
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      searchQuery.job_type === type
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleApply}
          className="w-full btn-primary"
        >
          应用筛选
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
