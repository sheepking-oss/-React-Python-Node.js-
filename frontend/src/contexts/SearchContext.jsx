import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { jobApi } from '../services/api';

const SearchContext = createContext(null);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState({
    keyword: '',
    city: '',
    company: '',
    salary_min: null,
    salary_max: null,
    education: '',
    experience: '',
    job_type: '',
    industry: '',
    source_id: null,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    sort_by: 'publish_date',
    sort_order: 'desc',
  });

  const [searchResults, setSearchResults] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedSearches, setSavedSearches] = useState(() => {
    const saved = localStorage.getItem('savedSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...searchQuery,
        ...pagination,
      };

      const response = await jobApi.search(params);
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, pagination]);

  const updateSearchQuery = useCallback((updates) => {
    setSearchQuery((prev) => ({
      ...prev,
      ...updates,
    }));
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  const clearSearchQuery = useCallback(() => {
    setSearchQuery({
      keyword: '',
      city: '',
      company: '',
      salary_min: null,
      salary_max: null,
      education: '',
      experience: '',
      job_type: '',
      industry: '',
      source_id: null,
    });
    setPagination({
      page: 1,
      page_size: 20,
      sort_by: 'publish_date',
      sort_order: 'desc',
    });
  }, []);

  const updatePagination = useCallback((updates) => {
    setPagination((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const goToPage = useCallback((page) => {
    setPagination((prev) => ({
      ...prev,
      page,
    }));
  }, []);

  const addRecentSearch = useCallback((keyword) => {
    if (!keyword || keyword.trim() === '') return;

    const newSearch = {
      id: Date.now(),
      keyword: keyword.trim(),
      timestamp: new Date().toISOString(),
    };

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.keyword !== keyword.trim());
      const updated = [newSearch, ...filtered].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  }, []);

  const saveSearch = useCallback((name) => {
    if (!name) return;

    const savedSearch = {
      id: Date.now(),
      name,
      query: { ...searchQuery },
      pagination: { ...pagination },
      timestamp: new Date().toISOString(),
    };

    setSavedSearches((prev) => {
      const updated = [...prev, savedSearch];
      localStorage.setItem('savedSearches', JSON.stringify(updated));
      return updated;
    });
  }, [searchQuery, pagination]);

  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem('savedSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadSavedSearch = useCallback((savedSearch) => {
    setSearchQuery(savedSearch.query);
    setPagination(savedSearch.pagination);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(
      searchQuery.keyword ||
      searchQuery.city ||
      searchQuery.company ||
      searchQuery.salary_min ||
      searchQuery.salary_max ||
      searchQuery.education ||
      searchQuery.experience ||
      searchQuery.job_type ||
      searchQuery.industry ||
      searchQuery.source_id
    );
  }, [searchQuery]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.keyword) count++;
    if (searchQuery.city) count++;
    if (searchQuery.company) count++;
    if (searchQuery.salary_min) count++;
    if (searchQuery.salary_max) count++;
    if (searchQuery.education) count++;
    if (searchQuery.experience) count++;
    if (searchQuery.job_type) count++;
    if (searchQuery.industry) count++;
    if (searchQuery.source_id) count++;
    return count;
  }, [searchQuery]);

  const value = {
    searchQuery,
    updateSearchQuery,
    clearSearchQuery,
    pagination,
    updatePagination,
    goToPage,
    searchResults,
    loading,
    performSearch,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    loadSavedSearch,
    hasActiveFilters,
    activeFiltersCount,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};
