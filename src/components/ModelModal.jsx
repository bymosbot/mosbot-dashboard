import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useToastStore } from '../stores/toastStore';
import logger from '../utils/logger';

export default function ModelModal({ isOpen, onClose, model, onSave }) {
  const { showToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    alias: '',
    maxTokens: '',
    temperature: '',
    contextWindow: '',
    cacheControlTtl: '',
    cacheRetention: '',
    reasoning: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (model) {
        // Edit mode - populate from existing params
        const params = model.params || {};
        setFormData({
          id: model.id,
          alias: model.name, // API returns 'name' (transformed from 'alias')
          maxTokens: params.maxTokens?.toString() || '',
          temperature: params.temperature?.toString() || '',
          contextWindow: params.contextWindow?.toString() || '',
          cacheControlTtl: params.cacheControlTtl || '',
          cacheRetention: params.cacheRetention || '',
          reasoning: params.reasoning || false,
        });
      } else {
        // Create mode
        setFormData({
          id: '',
          alias: '',
          maxTokens: '',
          temperature: '',
          contextWindow: '',
          cacheControlTtl: '',
          cacheRetention: '',
          reasoning: false,
        });
      }
    }
  }, [isOpen, model]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Build params object from form fields (only include non-empty values)
    const params = {};
    
    if (formData.maxTokens) {
      const value = parseInt(formData.maxTokens, 10);
      if (isNaN(value) || value <= 0) {
        showToast('Max Tokens must be a positive number', 'error');
        return;
      }
      params.maxTokens = value;
    }
    
    if (formData.temperature) {
      const value = parseFloat(formData.temperature);
      if (isNaN(value) || value < 0 || value > 2) {
        showToast('Temperature must be a number between 0 and 2', 'error');
        return;
      }
      params.temperature = value;
    }
    
    if (formData.contextWindow) {
      const value = parseInt(formData.contextWindow, 10);
      if (isNaN(value) || value <= 0) {
        showToast('Context Window must be a positive number', 'error');
        return;
      }
      params.contextWindow = value;
    }
    
    if (formData.cacheControlTtl) {
      params.cacheControlTtl = formData.cacheControlTtl.trim();
    }
    
    if (formData.cacheRetention) {
      params.cacheRetention = formData.cacheRetention;
    }
    
    if (formData.reasoning) {
      params.reasoning = true;
    }
    
    // Ensure at least one param is provided
    if (Object.keys(params).length === 0) {
      showToast('At least one parameter must be provided', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        id: formData.id.trim(),
        alias: formData.alias.trim(),
        params,
      };
      
      await onSave(payload, model?.id);
      showToast(`Model ${model ? 'updated' : 'created'} successfully`, 'success');
      onClose();
    } catch (error) {
      logger.error('Failed to save model', error);
      showToast(
        error.response?.data?.error?.message || `Failed to ${model ? 'update' : 'create'} model`,
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-xl font-bold text-dark-100">
                    {model ? 'Edit Model' : 'Add Model'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-dark-500 hover:text-dark-300 transition-colors"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="id" className="block text-sm font-medium text-dark-300 mb-2">
                      Model ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="id"
                      name="id"
                      value={formData.id}
                      onChange={handleChange}
                      disabled={!!model || isSubmitting}
                      placeholder="e.g., openrouter/anthropic/claude-sonnet-4.5"
                      className="input-field"
                      required
                      maxLength={200}
                    />
                    {!!model && (
                      <p className="mt-1 text-xs text-dark-500">Model ID cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="alias" className="block text-sm font-medium text-dark-300 mb-2">
                      Alias <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="alias"
                      name="alias"
                      value={formData.alias}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g., sonnet, kimi, flash"
                      className="input-field"
                      required
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-dark-500">
                      Short name to reference this model (e.g. &quot;sonnet&quot;, &quot;gpt4&quot;)
                    </p>
                  </div>

                  {/* Parameters Section */}
                  <div className="border-t border-dark-700 pt-4">
                    <h4 className="text-sm font-semibold text-dark-200 mb-4">
                      Model Parameters
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Max Tokens */}
                      <div>
                        <label htmlFor="maxTokens" className="block text-sm font-medium text-dark-300 mb-2">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          id="maxTokens"
                          name="maxTokens"
                          value={formData.maxTokens}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="8192"
                          className="input-field"
                          min="1"
                        />
                        <p className="mt-1 text-xs text-dark-500">
                          Maximum tokens in response (OpenClaw default: <span className="font-semibold">8192</span>)
                        </p>
                      </div>

                      {/* Temperature */}
                      <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-dark-300 mb-2">
                          Temperature
                        </label>
                        <input
                          type="number"
                          id="temperature"
                          name="temperature"
                          value={formData.temperature}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="1.0"
                          className="input-field"
                          min="0"
                          max="2"
                          step="0.1"
                        />
                        <p className="mt-1 text-xs text-dark-500">
                          Randomness (0-2): lower = focused, higher = creative (OpenClaw default: <span className="font-semibold">1.0</span>)
                        </p>
                      </div>

                      {/* Context Window */}
                      <div>
                        <label htmlFor="contextWindow" className="block text-sm font-medium text-dark-300 mb-2">
                          Context Window
                        </label>
                        <input
                          type="number"
                          id="contextWindow"
                          name="contextWindow"
                          value={formData.contextWindow}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="e.g., 256000"
                          className="input-field"
                          min="1"
                        />
                        <p className="mt-1 text-xs text-dark-500">
                          Maximum context window size in tokens (varies by model provider)
                        </p>
                      </div>

                      {/* Cache Control TTL */}
                      <div>
                        <label htmlFor="cacheControlTtl" className="block text-sm font-medium text-dark-300 mb-2">
                          Cache Control TTL
                        </label>
                        <input
                          type="text"
                          id="cacheControlTtl"
                          name="cacheControlTtl"
                          value={formData.cacheControlTtl}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="e.g., 1h, 30m, 2d"
                          className="input-field"
                        />
                        <p className="mt-1 text-xs text-dark-500">
                          Cache TTL for prompt caching (optional, no default)
                        </p>
                      </div>

                      {/* Cache Retention */}
                      <div>
                        <label htmlFor="cacheRetention" className="block text-sm font-medium text-dark-300 mb-2">
                          Cache Retention Strategy
                        </label>
                        <select
                          id="cacheRetention"
                          name="cacheRetention"
                          value={formData.cacheRetention}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="input-field"
                        >
                          <option value="">None (default)</option>
                          <option value="short">Short</option>
                          <option value="medium">Medium</option>
                          <option value="long">Long</option>
                        </select>
                        <p className="mt-1 text-xs text-dark-500">
                          Cache retention strategy (optional, no default)
                        </p>
                      </div>

                      {/* Reasoning */}
                      <div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="reasoning"
                            name="reasoning"
                            checked={formData.reasoning}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-700 rounded focus:ring-primary-500 focus:ring-offset-dark-900"
                          />
                          <label htmlFor="reasoning" className="ml-2 text-sm text-dark-300">
                            Enable reasoning mode
                          </label>
                        </div>
                        <p className="mt-1 ml-6 text-xs text-dark-500">
                          Extended reasoning for complex tasks (OpenClaw default: <span className="font-semibold">false</span>)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-dark-100 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : model ? 'Update Model' : 'Create Model'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
