import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../api/client';
import logger from '../utils/logger';
import ModelModal from '../components/ModelModal';
import ModelDeleteConfirmModal from '../components/ModelDeleteConfirmModal';
import { useMobileNav } from '../components/MobileNavContext';

export default function ModelFleetSettings() {
  const { user, isAdmin } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const onOpenNav = useMobileNav();

  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [error, setError] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, modelId: null, modelName: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Redirect to /settings/model-fleet if on /settings
    if (location.pathname === '/settings') {
      navigate('/settings/model-fleet', { replace: true });
      return;
    }

    // Fetch models when on /settings/model-fleet
    if (location.pathname === '/settings/model-fleet') {
      fetchModels();
      
      // Track view-only mode for non-admin users
      const hasModifyPermission = isAdmin();
      if (!hasModifyPermission) {
        logger.info('View-only mode encountered in Model Fleet Settings', {
          userId: user?.id,
          userEmail: user?.email,
          userRole: user?.role,
          page: 'settings/model-fleet',
          mode: 'view-only',
        });
      }
    }
  }, [location.pathname, navigate, isAdmin, user]);

  const fetchModels = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/models');
      setModels(response.data.data.models || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  const canModifyModels = useMemo(() => {
    const hasPermission = isAdmin();
    logger.info('User permission check for model management', {
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      canModifyModels: hasPermission,
    });
    return hasPermission;
  }, [isAdmin, user]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    const filtered = models.filter(model => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        model.id.toLowerCase().includes(searchLower) ||
        model.name.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
    
    // Sort: default model first, then alphabetically by name
    return filtered.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models, searchTerm]);

  const handleAddModel = () => {
    setSelectedModel(null);
    setIsModalOpen(true);
  };

  const handleEditModel = (model) => {
    setSelectedModel(model);
    setIsModalOpen(true);
  };

  const handleDeleteModel = (model) => {
    setDeleteConfirmModal({
      isOpen: true,
      modelId: model.id,
      modelName: model.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (isDeleting || !deleteConfirmModal.modelId) return;

    setIsDeleting(true);
    try {
      await api.delete(`/admin/models/${encodeURIComponent(deleteConfirmModal.modelId)}`);
      await fetchModels();
      showToast('Model deleted successfully', 'success');
      setDeleteConfirmModal({ isOpen: false, modelId: null, modelName: null });
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete model', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteConfirmModal({ isOpen: false, modelId: null, modelName: null });
    }
  };

  const handleSaveModel = async (modelData, modelId) => {
    if (modelId) {
      // Update existing model
      await api.put(`/admin/models/${encodeURIComponent(modelId)}`, modelData);
    } else {
      // Create new model
      await api.post('/admin/models', modelData);
    }
    
    await fetchModels();
    setIsModalOpen(false);
  };

  const handleSetDefault = async (modelId) => {
    if (!canModifyModels) return;
    
    try {
      await api.patch(`/admin/models/${encodeURIComponent(modelId)}/default`);
      await fetchModels();
      showToast('Default model updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to set default model', 'error');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-dark-900 border-b border-dark-800">
        <div className="flex items-center gap-3">
          {onOpenNav && (
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-800 transition-colors"
              onClick={onOpenNav}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold text-dark-100">Model Fleet</h1>
            <p className="text-sm text-dark-500">Manage AI models available for task execution</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 md:p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="card p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Available Models</h2>
              {!canModifyModels && (
                <p className="text-xs text-dark-500 mt-1">View-only access</p>
              )}
            </div>
            {canModifyModels && (
              <button
                onClick={handleAddModel}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Add Model
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {searchTerm && (
            <div className="mb-4 flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-dark-500" />
              <span className="text-sm text-dark-400">
                {filteredModels.length} of {models.length} models
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Clear search
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-400">
                {searchTerm
                  ? 'No models match your search'
                  : 'No models found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    model.isDefault
                      ? 'border-primary-600 bg-primary-900/10'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-dark-100 truncate">
                          {model.name}
                        </h3>
                        {model.isDefault && (
                          <StarIconSolid className="w-5 h-5 text-yellow-500 flex-shrink-0" title="Default model" />
                        )}
                      </div>
                      <p className="text-xs font-mono text-dark-500 truncate" title={model.id}>
                        {model.id}
                      </p>
                    </div>
                    {canModifyModels && (
                      <div className="flex items-center gap-1">
                        {!model.isDefault && (
                          <button
                            onClick={() => handleSetDefault(model.id)}
                            className="p-1.5 text-dark-400 hover:text-yellow-500 transition-colors"
                            title="Set as default"
                          >
                            <StarIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditModel(model)}
                          className="p-1.5 text-dark-400 hover:text-primary-500 transition-colors"
                          title="Edit model"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model)}
                          className="p-1.5 text-dark-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete model"
                          disabled={model.isDefault}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                    {model.params && Object.keys(model.params).length > 0 && (
                      <span className="px-2 py-1 bg-dark-700 text-dark-400">
                        {Object.keys(model.params).length} param{Object.keys(model.params).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {model.params && Object.keys(model.params).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dark-700">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(model.params).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-dark-500">{key}:</span>
                            <span className="text-dark-300 font-mono">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Model Modal */}
      <ModelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        model={selectedModel}
        onSave={handleSaveModel}
      />

      {/* Delete Confirmation Modal */}
      <ModelDeleteConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        modelName={deleteConfirmModal.modelName}
        isSubmitting={isDeleting}
      />
    </div>
  );
}
