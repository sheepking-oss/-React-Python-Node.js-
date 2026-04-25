import React, { useEffect, useState } from 'react';
import {
  Filter,
  X,
  Search as SearchIcon,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useSearchContext } from '../contexts/SearchContext';
import { useAppContext } from '../contexts/AppContext';
import JobCard from '../components/JobCard';
import FilterPanel from '../components/FilterPanel';
import Pagination from '../components/Pagination';

const Search = () => {
  const {
    searchQuery,
    updateSearchQuery,
    searchResults,
    loading,
    performSearch,
    pagination,
    updatePagination,
    hasActiveFilters,
    clearSearchQuery,
    activeFiltersCount,
  } = useSearchContext();
  const { showToast } = useAppContext();

  const [searchInput, setSearchInput] = useState(searchQuery.keyword || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState(pagination.sort_by || 'publish_date');
  const [sortOrder, setSortOrder] = useState(pagination.sort_order || 'desc');

  useEffect(() => {
    performSearch();
  }, [searchQuery, pagination]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearchQuery({ keyword: searchInput });
  };

  const handleSortChange = (value) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order);
    updatePagination({
      sort_by: field,
      sort_order: order,
      page: 1,
    });
  };

  const handlePageChange = (page) => {
    updatePagination({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortOptions = [
    { label: '最新发布', value: 'publish_date-desc' },
    { label: '薪资从高到低', value: 'salary_avg-desc' },
    { label: '薪资从低到高', value: 'salary_avg-asc' },
    { label: '热度最高', value: 'view_count-desc' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-4 py-2">
              <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="搜索职位、公司、技能..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary px-8">
              搜索
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
            >
              <Filter className="w-4 h-4" />
              <span>筛选</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">找到</span>
              <span className="font-semibold text-gray-900">
                {searchResults.total || 0}
              </span>
              <span className="text-gray-500">个职位</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {hasActiveFilters && (
              <button
                onClick={clearSearchQuery}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                清除筛选
              </button>
            )}

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-sm border-0 bg-transparent text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:block w-72 flex-shrink-0">
            <FilterPanel />
          </div>

          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowMobileFilters(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white overflow-y-auto">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">筛选条件</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <FilterPanel onClose={() => setShowMobileFilters(false)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex-1">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div className="skeleton-title w-48" />
                        <div className="skeleton-text w-32" />
                        <div className="flex gap-4">
                          <div className="skeleton-text w-24" />
                          <div className="skeleton-text w-24" />
                        </div>
                        <div className="flex gap-2">
                          <div className="skeleton w-16 h-6 rounded" />
                          <div className="skeleton w-16 h-6 rounded" />
                        </div>
                      </div>
                      <div className="skeleton w-24 h-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.items?.length > 0 ? (
              <div className="space-y-4">
                {searchResults.items.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  未找到匹配的职位
                </h3>
                <p className="text-gray-500 mb-6">
                  请尝试调整搜索条件或筛选选项
                </p>
                <button
                  onClick={clearSearchQuery}
                  className="btn-outline"
                >
                  清除所有筛选
                </button>
              </div>
            )}

            {searchResults.total_pages > 1 && (
              <Pagination
                currentPage={searchResults.page || 1}
                totalPages={searchResults.total_pages || 1}
                totalItems={searchResults.total || 0}
                pageSize={searchResults.page_size || 20}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
