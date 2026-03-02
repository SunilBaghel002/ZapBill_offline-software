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
  EyeOff,
  BarChart3,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { useAlertStore } from '../stores/alertStore';

// ==================== Biller Performance Modal ====================
const BillerPerformanceModal = ({ user, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadReport();
  }, [user, selectedDate]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.invoke('reports:billerDaily', {
        userId: user.id,
        date: selectedDate,
      });
      setReport(result);
    } catch (error) {
      console.error('Failed to load biller report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDate = (direction) => {
    const current = new Date(selectedDate + 'T00:00:00');
    const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1);
    // Don't allow future dates
    if (newDate <= new Date()) {
      setSelectedDate(format(newDate, 'yyyy-MM-dd'));
    }
  };

  if (!user) return null;

  const sales = report?.sales || {};
  const orders = report?.orders || [];
  const avgOrderValue = sales.total_orders > 0 ? (sales.total_revenue / sales.total_orders) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
              {user.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>{user.full_name}</h3>
              <span style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                {user.role} • @{user.username}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Date Selector */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--gray-50)' }}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--gray-500)" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              style={{
                border: '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: 500,
                background: 'white',
              }}
            />
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => navigateDate('next')}
            disabled={selectedDate >= format(new Date(), 'yyyy-MM-dd')}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading-spinner" />
              <p className="text-muted" style={{ marginTop: '12px' }}>Loading report...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', borderRadius: '12px', textAlign: 'center' }}>
                  <DollarSign size={22} style={{ color: '#2e7d32', marginBottom: '4px' }} />
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1b5e20' }}>
                    ₹{(sales.total_revenue || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#388e3c' }}>Revenue</div>
                </div>
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', borderRadius: '12px', textAlign: 'center' }}>
                  <ShoppingCart size={22} style={{ color: '#1565c0', marginBottom: '4px' }} />
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0d47a1' }}>
                    {sales.total_orders || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1976d2' }}>Orders</div>
                </div>
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)', borderRadius: '12px', textAlign: 'center' }}>
                  <BarChart3 size={22} style={{ color: '#e65100', marginBottom: '4px' }} />
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#bf360c' }}>
                    ₹{avgOrderValue.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#f57c00' }}>Avg Order</div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--gray-700)' }}>
                  Payment Breakdown
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <Banknote size={16} color="#43a047" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>₹{(sales.cash_amount || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Cash</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <CreditCard size={16} color="#1e88e5" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>₹{(sales.card_amount || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Card</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <Smartphone size={16} color="#7b1fa2" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>₹{(sales.upi_amount || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>UPI</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--gray-700)' }}>
                  Orders ({orders.length})
                </h4>
                {orders.length > 0 ? (
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ background: 'var(--gray-50)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Order #</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} style={{ borderTop: '1px solid var(--gray-100)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>#{order.order_number}</td>
                            <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>
                              {order.order_type?.replace('_', ' ')}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className={`badge ${order.status === 'completed' ? 'badge-success' : order.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
                                {order.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>
                              ₹{order.total_amount?.toFixed(0) || 0}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--gray-500)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                <Clock size={12} />
                                {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)' }}>
                    <ShoppingCart size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p>No orders on this date</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Main UsersPage ====================
const UsersPage = () => {
  const { showAlert } = useAlertStore();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [performanceUser, setPerformanceUser] = useState(null);
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
    showAlert('Are you sure you want to delete this user?', 'confirm', async () => {
      try {
        await window.electronAPI.invoke('users:delete', { id });
        loadUsers();
        showAlert('User deleted successfully', 'success');
      } catch (error) {
        console.error('Delete failed:', error);
        showAlert('Failed to delete user', 'error');
      }
    });
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
    <div className="page-container">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-6)',
        paddingTop: '80px' 
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
              <th style={{ width: '140px' }}>Actions</th>
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
                      onClick={() => setPerformanceUser(user)}
                      title="View Performance"
                      style={{ color: 'var(--primary-600)' }}
                    >
                      <BarChart3 size={16} />
                    </button>
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

      {/* Biller Performance Modal */}
      {performanceUser && (
        <BillerPerformanceModal
          user={performanceUser}
          onClose={() => setPerformanceUser(null)}
        />
      )}
    </div>
  );
};

// ==================== User Modal Component ====================
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
      <div className="modal" style={{ maxWidth: '500px', width: '90%', height: 'auto', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>{user ? 'Edit Staff' : 'Add Staff'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} style={{ width: '24px', height: '24px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px' }}>
            {error && (
              <div style={{
                padding: '6px 10px',
                background: 'var(--error-50)',
                color: 'var(--error-700)',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '12px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Full Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  autoFocus
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Username *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={user?.username === 'admin'}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px', marginBottom: '2px' }}>
                  Password {user ? '(optional)' : '*'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: '30px', padding: '6px 10px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--gray-400)',
                      padding: '2px',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Role *</label>
                <select
                  className="input select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  disabled={user?.username === 'admin'}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                >
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Quick PIN</label>
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
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
              </div>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '13px',
                height: '32px',
                marginBottom: '1px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={user?.username === 'admin'}
                  style={{ width: '14px', height: '14px' }}
                />
                <span>Active Account</span>
              </label>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 16px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} style={{ marginRight: '8px', padding: '6px 12px', fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving} style={{ padding: '6px 12px', fontSize: '13px' }}>
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersPage;
