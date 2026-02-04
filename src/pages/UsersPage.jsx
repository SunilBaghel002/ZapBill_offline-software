import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  Save,
  Shield,
  User,
  Eye,
  EyeOff
} from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await window.electronAPI.invoke('users:getAll');
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await window.electronAPI.invoke('users:delete', { id });
        loadUsers();
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete user');
      }
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'badge-primary',
      cashier: 'badge-success',
      kitchen: 'badge-warning',
    };
    return styles[role] || 'badge-gray';
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-6)'
      }}>
        <div>
          <h1>Staff Management</h1>
          <p className="text-muted">Manage your restaurant staff accounts</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--spacing-6)' }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Staff</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <Shield size={24} />
          </div>
          <div>
            <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Administrators</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <User size={24} />
          </div>
          <div>
            <div className="stat-value">{users.filter(u => u.is_active).length}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                <td>{user.username}</td>
                <td>
                  <span className={`badge ${getRoleBadge(user.role)}`}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-gray'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDelete(user.id)}
                      style={{ color: 'var(--error-500)' }}
                      disabled={user.username === 'admin'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <p className="empty-state-title">No users found</p>
            <p className="text-muted">Add your first staff member</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
};

// User Modal Component
const UserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    fullName: user?.full_name || '',
    role: user?.role || 'cashier',
    pinCode: '',
    isActive: user?.is_active ?? true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!user && !formData.password) {
      setError('Password is required for new users');
      return;
    }
    
    setIsSaving(true);

    try {
      const saveData = { ...formData };
      if (user?.id) {
        saveData.id = user.id;
      }
      
      const result = await window.electronAPI.invoke('users:save', { user: saveData });
      
      if (result.success) {
        onSave();
      } else {
        setError(result.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Edit Staff' : 'Add Staff Member'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                padding: 'var(--spacing-3)',
                background: 'var(--error-50)',
                color: 'var(--error-700)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-4)',
                fontSize: 'var(--font-size-sm)',
              }}>
                {error}
              </div>
            )}

            <div className="input-group mb-4">
              <label className="input-label">Full Name *</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="input-group mb-4">
              <label className="input-label">Username *</label>
              <input
                type="text"
                className="input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={user?.username === 'admin'}
              />
            </div>

            <div className="input-group mb-4">
              <label className="input-label">
                Password {user ? '(leave blank to keep current)' : '*'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gray-400)',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group mb-4">
                <label className="input-label">Role *</label>
                <select
                  className="input select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  disabled={user?.username === 'admin'}
                >
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                </select>
              </div>

              <div className="input-group mb-4">
                <label className="input-label">Quick PIN (4 digits)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.pinCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, pinCode: val });
                  }}
                  maxLength={4}
                  placeholder="1234"
                />
              </div>
            </div>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-2)', 
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={user?.username === 'admin'}
              />
              <span>Active Account</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersPage;
