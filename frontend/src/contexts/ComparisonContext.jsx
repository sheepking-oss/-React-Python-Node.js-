import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { comparisonApi } from '../services/api';

const ComparisonContext = createContext(null);

export const useComparisonContext = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparisonContext must be used within a ComparisonProvider');
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const [comparisonSession, setComparisonSession] = useState(() => {
    const saved = localStorage.getItem('comparisonSessionId');
    return saved ? { id: parseInt(saved) } : null;
  });

  const [comparisonJobs, setComparisonJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [maxItems] = useState(5);

  const ensureSession = useCallback(async () => {
    if (comparisonSession?.id) {
      return comparisonSession.id;
    }

    try {
      const response = await comparisonApi.create('职位对比');
      if (response.success) {
        setComparisonSession({ id: response.data.session_id });
        localStorage.setItem('comparisonSessionId', response.data.session_id.toString());
        return response.data.session_id;
      }
    } catch (error) {
      console.error('Failed to create comparison session:', error);
    }

    return null;
  }, [comparisonSession]);

  const fetchComparison = useCallback(async () => {
    if (!comparisonSession?.id) return;

    setLoading(true);
    try {
      const response = await comparisonApi.get(comparisonSession.id);
      if (response.success) {
        setComparisonJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
    } finally {
      setLoading(false);
    }
  }, [comparisonSession]);

  const addToComparison = useCallback(
    async (jobId, jobData = null) => {
      if (comparisonJobs.length >= maxItems) {
        return { success: false, message: `最多只能对比 ${maxItems} 个职位` };
      }

      const sessionId = await ensureSession();
      if (!sessionId) {
        return { success: false, message: '创建对比会话失败' };
      }

      try {
        const response = await comparisonApi.add(jobId, sessionId);
        if (response.success) {
          if (jobData) {
            setComparisonJobs((prev) => [...prev, { ...jobData, order: prev.length + 1 }]);
          } else {
            await fetchComparison();
          }
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to add to comparison:', error);
        return { success: false, error };
      }
    },
    [comparisonJobs, maxItems, ensureSession, fetchComparison]
  );

  const removeFromComparison = useCallback(
    async (jobId) => {
      if (!comparisonSession?.id) return { success: false };

      try {
        const response = await comparisonApi.remove(comparisonSession.id, jobId);
        if (response.success) {
          setComparisonJobs((prev) => prev.filter((job) => job.id !== jobId));
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to remove from comparison:', error);
        return { success: false, error };
      }
    },
    [comparisonSession]
  );

  const batchAddToComparison = useCallback(
    async (jobIds) => {
      const availableSlots = maxItems - comparisonJobs.length;
      if (jobIds.length > availableSlots) {
        return {
          success: false,
          message: `最多只能再添加 ${availableSlots} 个职位`,
        };
      }

      const sessionId = await ensureSession();
      if (!sessionId) {
        return { success: false, message: '创建对比会话失败' };
      }

      try {
        const response = await comparisonApi.batchAdd(jobIds, sessionId);
        if (response.success) {
          await fetchComparison();
          return {
            success: true,
            addedCount: response.data.added_count,
            failedCount: response.data.failed_count,
          };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to batch add to comparison:', error);
        return { success: false, error };
      }
    },
    [comparisonJobs, maxItems, ensureSession, fetchComparison]
  );

  const clearComparison = useCallback(async () => {
    for (const job of comparisonJobs) {
      await removeFromComparison(job.id);
    }
    setComparisonJobs([]);
  }, [comparisonJobs, removeFromComparison]);

  const isInComparison = useCallback(
    (jobId) => {
      return comparisonJobs.some((job) => job.id === jobId);
    },
    [comparisonJobs]
  );

  const getComparisonReport = useCallback(async () => {
    if (!comparisonSession?.id || comparisonJobs.length === 0) {
      return null;
    }

    try {
      const response = await comparisonApi.getReport(comparisonSession.id);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Failed to get comparison report:', error);
    }

    return null;
  }, [comparisonSession, comparisonJobs]);

  const getComparisonIds = useCallback(() => {
    return comparisonJobs.map((job) => job.id);
  }, [comparisonJobs]);

  const comparisonCount = comparisonJobs.length;
  const isFull = comparisonCount >= maxItems;
  const isEmpty = comparisonCount === 0;

  useEffect(() => {
    if (comparisonSession?.id) {
      fetchComparison();
    }
  }, [comparisonSession, fetchComparison]);

  const value = {
    comparisonSession,
    comparisonJobs,
    comparisonCount,
    maxItems,
    loading,
    isFull,
    isEmpty,
    fetchComparison,
    addToComparison,
    removeFromComparison,
    batchAddToComparison,
    clearComparison,
    isInComparison,
    getComparisonReport,
    getComparisonIds,
  };

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
};
