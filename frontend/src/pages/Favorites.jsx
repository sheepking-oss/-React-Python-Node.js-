import React, { useEffect, useState } from 'react';
import {
  Heart,
  FolderOpen,
  Trash2,
  FolderPlus,
  Edit3,
  X,
  Check,
  GitCompare,
  Search,
} from 'lucide-react';
import { useFavoriteContext } from '../contexts/FavoriteContext';
import { useComparisonContext } from '../contexts/ComparisonContext';
import { useAppContext } from '../contexts/AppContext';
import JobCard from '../components/JobCard';

const Favorites = () => {
  const { favorites, folders, currentFolder, setCurrentFolder, removeFavorite, moveToFolder, clearFolder, loading } = useFavoriteContext();
  const { addToComparison, isInComparison, comparisonCount, maxItems } = useComparisonContext();
  const { showToast } = useAppContext();

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const currentFavorites = favorites.filter((fav) => fav.folder_name === currentFolder);
  const filteredFavorites = currentFavorites.filter(
    (fav) =>
      !searchQuery ||
      fav.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fav.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBatchAddToComparison = async () => {
    for (const jobId of selectedJobs) {
      const favorited = favorites.find((f) => f.job_id === jobId);
      if (favorited) {
        await addToComparison(jobId, {
          id: favorited.job_id,
          title: favorited.job_title,
          company_name: favorited.company_name,
          salary_original: favorited.salary_original,
          city: favorited.city,
        });
      }
    }
    showToast(`已添加 ${selectedJobs.length} 个职位到对比`, 'success');
    setSelectedJobs([]);
  };

  const handleToggleSelect = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleSelectAll = () => {
    const jobIds = filteredFavorites.map((f) => f.job_id);
    if (selectedJobs.length === jobIds.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobIds);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      showToast('创建收藏夹功能开发中', 'info');
      setShowNewFolderModal(false);
      setNewFolderName('');
    }
  };

  const handleClearFolder = () => {
    if (window.confirm(`确定要清空"${currentFolder}"收藏夹吗？`)) {
      clearFolder(currentFolder);
      showToast('已清空收藏夹', 'success');
    }
  };

  const handleRemoveFavorite = async (jobId) => {
    const success = await removeFavorite(jobId);
    if (success) {
      showToast('已取消收藏', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              我的收藏
            </h1>
            <p className="text-gray-500 mt-1">共 {favorites.length} 个收藏职位</p>
          </div>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="btn-outline inline-flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            新建收藏夹
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">收藏夹</h3>
              </div>
              <div className="space-y-1">
                {folders.map((folder) => {
                  const count = favorites.filter((f) => f.folder_name === folder).length;
                  return (
                    <button
                      key={folder}
                      onClick={() => setCurrentFolder(folder)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentFolder === folder
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span>{folder}</span>
                      </div>
                      <span className="text-xs text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索职位..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedJobs.length > 0 && (
                    <>
                      <button
                        onClick={handleBatchAddToComparison}
                        disabled={comparisonCount >= maxItems}
                        className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <GitCompare className="w-4 h-4" />
                        批量对比 ({selectedJobs.length})
                      </button>
                      <button
                        onClick={() => setSelectedJobs([])}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        取消选择
                      </button>
                    </>
                  )}
                  {currentFavorites.length > 0 && (
                    <button
                      onClick={handleClearFolder}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      清空收藏夹
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                    <div className="skeleton-title w-48 mb-4" />
                    <div className="skeleton-text w-32" />
                  </div>
                ))}
              </div>
            ) : filteredFavorites.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {selectedJobs.length === filteredFavorites.length ? '取消全选' : '全选'}
                  </button>
                  <span className="text-sm text-gray-500">
                    已选择 {selectedJobs.length} / {filteredFavorites.length} 个职位
                  </span>
                </div>
                <div className="space-y-4">
                  {filteredFavorites.map((fav) => (
                    <div
                      key={fav.id}
                      className={`bg-white rounded-xl border transition-all ${
                        selectedJobs.includes(fav.job_id)
                          ? 'border-primary-300 ring-2 ring-primary-100'
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start p-6 gap-4">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(fav.job_id)}
                          onChange={() => handleToggleSelect(fav.job_id)}
                          className="mt-1.5 w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {fav.job_title}
                              </h3>
                              <p className="text-gray-600 mt-1">{fav.company_name}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {fav.salary_original && (
                                  <span className="font-semibold text-primary-600">
                                    {fav.salary_original}
                                  </span>
                                )}
                                {fav.city && <span>{fav.city}</span>}
                                {fav.created_at && (
                                  <span>收藏于 {new Date(fav.created_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  addToComparison(fav.job_id, {
                                    id: fav.job_id,
                                    title: fav.job_title,
                                    company_name: fav.company_name,
                                    salary_original: fav.salary_original,
                                    city: fav.city,
                                  })
                                }
                                className={`p-2 rounded-lg transition-colors ${
                                  isInComparison(fav.job_id)
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                                }`}
                                title="添加到对比"
                              >
                                <GitCompare className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleRemoveFavorite(fav.job_id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="取消收藏"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          {fav.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">{fav.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentFolder === '默认收藏夹' ? '暂无收藏' : `'${currentFolder}'收藏夹为空`}
                </h3>
                <p className="text-gray-500 mb-6">
                  在职位详情页点击收藏按钮即可添加到收藏夹
                </p>
                <div className="flex justify-center gap-4">
                  {folders.length > 1 && (
                    <button
                      onClick={() => setCurrentFolder('默认收藏夹')}
                      className="btn-outline"
                    >
                      查看默认收藏夹
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowNewFolderModal(false)}
          />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">新建收藏夹</h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="输入收藏夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="btn-outline"
              >
                取消
              </button>
              <button onClick={handleCreateFolder} className="btn-primary">
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
