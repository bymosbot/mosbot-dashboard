import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import UserModal from '../components/UserModal';

export default function Settings() {
  const { user: currentUser, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      setIsLoading(false);
      return;
    }

    // Redirect to /settings/users if on /settings
    if (location.pathname === '/settings') {
      navigate('/settings/users', { replace: true });
      return;
    }

    // Fetch users when on /settings/users
    if (location.pathname === '/settings/users') {
      fetchUsers();
    }
  }, [location.pathname, navigate, isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const handleSaveUser = async (userData, userId) => {
    if (userId) {
      // Update existing user
      await api.put(`/admin/users/${userId}`, userData);
    } else {
      // Create new user
      await api.post('/admin/users', userData);
    }
    await fetchUsers();
    setIsModalOpen(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-xl text-dark-300 mb-2">Access Denied</p>
          <p className="text-dark-500">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-800">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-dark-100">Settings</h1>
          <p className="text-sm text-dark-500">Manage users and system configuration</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {location.pathname === '/settings/users' && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-100">User Management</h2>
                <button
                  onClick={handleAddUser}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  Add User
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-dark-400">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-800">
                        <th className="text-left text-sm font-medium text-dark-400 pb-3 px-4">Name</th>
                        <th className="text-left text-sm font-medium text-dark-400 pb-3 px-4">Email</th>
                        <th className="text-left text-sm font-medium text-dark-400 pb-3 px-4">Role</th>
                        <th className="text-left text-sm font-medium text-dark-400 pb-3 px-4">Status</th>
                        <th className="text-left text-sm font-medium text-dark-400 pb-3 px-4">Created</th>
                        <th className="text-right text-sm font-medium text-dark-400 pb-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-dark-800 hover:bg-dark-800 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-dark-100">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-dark-300">{user.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                user.role === 'owner'
                                  ? 'bg-amber-900/30 text-amber-300'
                                  : user.role === 'admin'
                                  ? 'bg-purple-900/30 text-purple-300'
                                  : 'bg-dark-700 text-dark-300'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                user.active !== false
                                  ? 'bg-green-900/30 text-green-300'
                                  : 'bg-red-900/30 text-red-300'
                              }`}
                            >
                              {user.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-dark-400 text-sm">{formatDate(user.created_at)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-dark-400 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit user"
                                disabled={user.role === 'owner' && currentUser?.role !== 'owner'}
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-dark-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete user"
                                disabled={user.id === currentUser?.id || user.role === 'owner'}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />
    </div>
  );
}
