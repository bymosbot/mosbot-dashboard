import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function UserModal({ isOpen, onClose, user = null, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    active: true,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Edit mode - populate form
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '', // Don't populate password for edit
          role: user.role || 'user',
          active: user.active !== undefined ? user.active : true,
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'user',
          active: true,
        });
      }
      setError('');
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    if (!user && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data - don't send password if empty (for edit mode)
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active,
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      await onSave(userData, user?.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save user');
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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-dark-900 border border-dark-800 p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-dark-100">
                    {user ? 'Edit User' : 'Add New User'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter full name"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="user@example.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
                      Password {user && '(leave blank to keep current)'}
                      {!user && ' *'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required={!user}
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-dark-500 mt-1">
                      Minimum 8 characters
                    </p>
                  </div>

                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-dark-300 mb-2">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="input-field"
                      disabled={isSubmitting || (user && user.role === 'owner')}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      {user && user.role === 'owner' && <option value="owner">Owner</option>}
                    </select>
                    {user && user.role === 'owner' && (
                      <p className="text-xs text-dark-500 mt-1">
                        Owner role cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Active Status (only in edit mode, hidden for owner) */}
                  {user && user.role !== 'owner' && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="active"
                          checked={formData.active}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500 focus:ring-2"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm font-medium text-dark-300">
                          Active (user can log in)
                        </span>
                      </label>
                      <p className="text-xs text-dark-500 mt-1 ml-6">
                          Uncheck to deactivate this user account
                        </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 btn-secondary"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Create User'}
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
