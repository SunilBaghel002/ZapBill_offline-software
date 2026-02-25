import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Tag, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import CustomAlert from '../components/ui/CustomAlert';

const DiscountsPage = () => {
  const { user } = useAuthStore();
  const [discounts, setDiscounts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    menu_item_id: '',
    variant_name: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dbDiscounts = await window.electronAPI.invoke('discounts:getAll');
      const items = await window.electronAPI.invoke('menu:getItems', {});
      
      setDiscounts(dbDiscounts || []);
      setMenuItems(items || []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load discounts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (message, type = 'info', onConfirm = null) => {
    setAlert({ show: true, message, type, onConfirm });
  };

  const closeAlert = () => setAlert({ ...alert, show: false });

  const handleOpenModal = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        menu_item_id: discount.menu_item_id || '',
        variant_name: discount.variant_name || '',
        discount_type: discount.discount_type || 'percentage',
        discount_value: discount.discount_value || '',
        start_date: discount.start_date ? discount.start_date.split('T')[0] : '',
        end_date: discount.end_date ? discount.end_date.split('T')[0] : '',
        is_active: discount.is_active === 1
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        menu_item_id: '',
        variant_name: '',
        discount_type: 'percentage',
        discount_value: '',
        start_date: '',
        end_date: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.menu_item_id || !formData.discount_value) {
      return showAlert('Please fill out required fields', 'error');
    }

    try {
      const payload = {
        menu_item_id: formData.menu_item_id,
        variant_name: formData.variant_name || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        is_active: formData.is_active ? 1 : 0
      };

      if (editingDiscount) {
        await window.electronAPI.invoke('discounts:update', { id: editingDiscount.id, updates: payload });
        showAlert('Discount Updated Successfully', 'success');
      } else {
        await window.electronAPI.invoke('discounts:add', payload);
        showAlert('Discount Added Successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Save error', error);
      showAlert('Failed to save discount: ' + error.message, 'error');
    }
  };

  const handleDelete = (id) => {
    showAlert('Are you sure you want to delete this discount?', 'confirm', async () => {
      try {
        await window.electronAPI.invoke('discounts:delete', { id });
        showAlert('Discount Deleted', 'success');
        loadData();
      } catch (err) {
        showAlert('Failed to delete', 'error');
      }
    });
  };

  if (isLoading) {
    return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  // Get selected item's variants to populate the variant dropdown
  const selectedItem = menuItems.find(i => i.id === formData.menu_item_id);
  let itemVariants = [];
  if (selectedItem && selectedItem.variants) {
    try {
      itemVariants = JSON.parse(selectedItem.variants);
    } catch (e) {
      itemVariants = [];
    }
  }

  return (
    <div className="page-container" style={{ background: '#f8fafc', padding: '32px' }}>
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>Discounts</h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '15px' }}>Manage automated item and variant-level discounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: '700' }}>
          <Plus size={18} /> Add Discount
        </button>
      </div>

      <div className="card" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Item Name</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Variant</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Discount</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Duration</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No discounts configured.</td>
              </tr>
            ) : (
              discounts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: '500' }}>{d.item_name || 'Unknown Item'}</td>
                  <td style={{ padding: '16px', color: '#64748b' }}>{d.variant_name || 'All Variants'}</td>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#0096FF' }}>
                    {d.discount_type === 'percentage' ? `${d.discount_value}%` : `₹${d.discount_value}`} OFF
                  </td>
                  <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>
                    {(!d.start_date && !d.end_date) ? 'Always Active' : 
                     `${d.start_date ? new Date(d.start_date).toLocaleDateString() : 'Forever'} - ${d.end_date ? new Date(d.end_date).toLocaleDateString() : 'Forever'}`
                    }
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {d.is_active ? 
                      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 'bold' }}>Active</span> : 
                      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold' }}>Inactive</span>
                    }
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleOpenModal(d)} style={{ color: '#0096FF', marginRight: '8px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(d.id)} style={{ color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', width: '90%', maxWidth: '500px', borderRadius: '16px', padding: '24px', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#1e293b' }}>
              {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Menu Item *</label>
                <select 
                  className="input" 
                  value={formData.menu_item_id} 
                  onChange={(e) => setFormData({ ...formData, menu_item_id: e.target.value, variant_name: '' })} 
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select an Item</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              {itemVariants.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Specific Variant (Optional)</label>
                  <select 
                    className="input" 
                    value={formData.variant_name} 
                    onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Apply to ALL Variants</option>
                    {itemVariants.map(v => (
                      <option key={v.name} value={v.name}>{v.name} (₹{v.price})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Discount Type</label>
                  <select 
                    className="input" 
                    value={formData.discount_type} 
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Discount Value *</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={formData.discount_value} 
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} 
                    required min="0" step="0.01" 
                    placeholder={formData.discount_type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 50 for ₹50'}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Start Date (Optional)</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={formData.start_date} 
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>End Date (Optional)</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={formData.end_date} 
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.is_active} 
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: '#0096FF' }}
                />
                <span style={{ fontWeight: '600', color: '#475569' }}>Active</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0096FF', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alert.show && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          onClose={closeAlert}
          onConfirm={alert.onConfirm}
        />
      )}
    </div>
  );
};

export default DiscountsPage;
