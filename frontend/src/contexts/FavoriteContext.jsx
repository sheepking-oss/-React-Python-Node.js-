import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { favoriteApi } from '../services/api';

const FavoriteContext = createContext(null);

export const useFavoriteContext = () => {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavoriteContext must be used within a FavoriteProvider');
  }
  return context;
};

export const FavoriteProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [folders, setFolders] = useState(['默认收藏夹']);
  const [currentFolder, setCurrentFolder] = useState('默认收藏夹');
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async (folderName = null) => {
    setLoading(true);
    try {
      const response = await favoriteApi.getAll(folderName);
      if (response.success) {
        setFavorites(response.data.favorites || []);
        if (response.data.folders) {
          setFolders(response.data.folders);
        }
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const isFavorited = useCallback(
    (jobId) => {
      return favorites.some((fav) => fav.job_id === jobId);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (jobId, jobData = null) => {
      const isCurrentlyFavorited = favorites.some((fav) => fav.job_id === jobId);

      if (isCurrentlyFavorited) {
        try {
          const response = await favoriteApi.remove(jobId);
          if (response.success) {
            setFavorites((prev) => prev.filter((fav) => fav.job_id !== jobId));
            return { success: true, action: 'removed' };
          }
        } catch (error) {
          console.error('Failed to remove favorite:', error);
          return { success: false, error };
        }
      } else {
        try {
          const response = await favoriteApi.add(jobId, currentFolder);
          if (response.success) {
            const newFavorite = {
              id: response.data.id,
              job_id: jobId,
              job_title: jobData?.title || '未知职位',
              company_name: jobData?.company_name || '未知公司',
              salary_original: jobData?.salary_original,
              city: jobData?.city,
              folder_name: currentFolder,
              created_at: new Date().toISOString(),
            };
            setFavorites((prev) => [newFavorite, ...prev]);
            return { success: true, action: 'added' };
          }
        } catch (error) {
          console.error('Failed to add favorite:', error);
          return { success: false, error };
        }
      }

      return { success: false };
    },
    [favorites, currentFolder]
  );

  const addFavorite = useCallback(
    async (jobId, folderName = '默认收藏夹', notes = null) => {
      try {
        const response = await favoriteApi.add(jobId, folderName, notes);
        if (response.success) {
          await fetchFavorites();
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to add favorite:', error);
        return { success: false, error };
      }
    },
    [fetchFavorites]
  );

  const removeFavorite = useCallback(
    async (jobId) => {
      try {
        const response = await favoriteApi.remove(jobId);
        if (response.success) {
          setFavorites((prev) => prev.filter((fav) => fav.job_id !== jobId));
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to remove favorite:', error);
        return { success: false, error };
      }
    },
    []
  );

  const moveToFolder = useCallback(
    async (jobId, newFolder) => {
      try {
        const response = await favoriteApi.update(jobId, newFolder);
        if (response.success) {
          await fetchFavorites();
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to move favorite:', error);
        return { success: false, error };
      }
    },
    [fetchFavorites]
  );

  const updateNotes = useCallback(
    async (jobId, notes) => {
      try {
        const response = await favoriteApi.update(jobId, null, notes);
        if (response.success) {
          setFavorites((prev) =>
            prev.map((fav) =>
              fav.job_id === jobId ? { ...fav, notes } : fav
            )
          );
          return { success: true };
        }
        return { success: false, message: response.message };
      } catch (error) {
        console.error('Failed to update notes:', error);
        return { success: false, error };
      }
    },
    []
  );

  const clearFolder = useCallback(
    async (folderName) => {
      const folderFavorites = favorites.filter((fav) => fav.folder_name === folderName);
      for (const fav of folderFavorites) {
        await favoriteApi.remove(fav.job_id);
      }
      setFavorites((prev) => prev.filter((fav) => fav.folder_name !== folderName));
    },
    [favorites]
  );

  const getFavoriteIds = useCallback(() => {
    return favorites.map((fav) => fav.job_id);
  }, [favorites]);

  const getFavoritesByFolder = useCallback(
    (folderName) => {
      return favorites.filter((fav) => fav.folder_name === folderName);
    },
    [favorites]
  );

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const value = {
    favorites,
    folders,
    currentFolder,
    setCurrentFolder,
    loading,
    fetchFavorites,
    isFavorited,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    moveToFolder,
    updateNotes,
    clearFolder,
    getFavoriteIds,
    getFavoritesByFolder,
  };

  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>;
};
