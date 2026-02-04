import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Minus,
  AlertTriangle,
  Search,
  X,
  Save,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockUpdateItem, setStockUpdateItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const result = await window.electronAPI.invoke('inventory:getAll');
      setInventory(result);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !showLowStock || item.current_stock <= item.minimum_stock;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = inventory.filter(i => i.current_stock <= i.minimum_stock).length;

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleStockUpdate = (item) => {
    setStockUpdateItem(item);
    setShowStockModal(true);
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading inventory...</p>
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
          <h1>Inventory Management</h1>
          <p className="text-muted">Track and manage your stock levels</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingItem(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--spacing-6)' }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-value">{inventory.length}</div>
            <div className="stat-label">Total Items</div>
          </div>
        </div>
        
        <div 
          className="stat-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <div className="stat-icon warning">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-value">{lowStockCount}</div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-4)', 
        marginBottom: 'var(--spacing-4)',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--gray-400)'
            }} 
          />
          <input
            type="text"
            className="input"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <button
          className={`btn ${showLowStock ? 'btn-warning' : 'btn-secondary'}`}
          onClick={() => setShowLowStock(!showLowStock)}
          style={showLowStock ? { background: 'var(--warning-500)', color: 'white' } : {}}
        >
          <AlertTriangle size={18} />
          {showLowStock ? 'Show All' : 'Low Stock Only'}
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Current Stock</th>
              <th>Min. Stock</th>
              <th>Unit</th>
              <th>Cost/Unit</th>
              <th>Supplier</th>
              <th>Status</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td>
                  <span style={{ 
                    fontWeight: 600,
                    color: item.current_stock <= item.minimum_stock 
                      ? 'var(--error-600)' 
                      : 'var(--gray-900)'
                  }}>
                    {item.current_stock}
                  </span>
                </td>
                <td>{item.minimum_stock}</td>
                <td>{item.unit}</td>
                <td>₹{item.cost_per_unit?.toFixed(2) || '-'}</td>
                <td>{item.supplier || '-'}</td>
                <td>
                  {item.current_stock <= item.minimum_stock ? (
                    <span className="badge badge-warning">
                      <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                      Low Stock
                    </span>
                  ) : (
                    <span className="badge badge-success">In Stock</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleStockUpdate(item)}
                      title="Update Stock"
                    >
                      <TrendingUp size={14} />
                    </button>
                    <button 
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInventory.length === 0 && (
          <div className="empty-state">
            <Package size={48} />
            <p className="empty-state-title">No items found</p>
            <p className="text-muted">
              {showLowStock 
                ? 'No low stock items' 
                : 'Add your first inventory item'}
            </p>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {showModal && (
        <InventoryModal
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingItem(null);
            loadInventory();
          }}
        />
      )}

      {/* Stock Update Modal */}
      {showStockModal && stockUpdateItem && (
        <StockUpdateModal
          item={stockUpdateItem}
          onClose={() => {
            setShowStockModal(false);
            setStockUpdateItem(null);
          }}
          onSave={() => {
            setShowStockModal(false);
            setStockUpdateItem(null);
            loadInventory();
          }}
        />
      )}
    </div>
  );
};

// Inventory Item Modal
const InventoryModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    unit: item?.unit || 'kg',
    current_stock: item?.current_stock || 0,
    minimum_stock: item?.minimum_stock || 0,
    cost_per_unit: item?.cost_per_unit || '',
    supplier: item?.supplier || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const units = ['kg', 'g', 'liters', 'ml', 'pieces', 'packets', 'boxes', 'bottles'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const saveData = {
        ...formData,
        current_stock: parseFloat(formData.current_stock),
        minimum_stock: parseFloat(formData.minimum_stock),
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
      };

      if (item?.id) {
        saveData.id = item.id;
      }

      await window.electronAPI.invoke('inventory:save', { item: saveData });
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group mb-4">
              <label className="input-label">Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group mb-4">
                <label className="input-label">Unit *</label>
                <select
                  className="input select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="input-group mb-4">
                <label className="input-label">Cost per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="input-group mb-4">
                <label className="input-label">Current Stock</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                />
              </div>

              <div className="input-group mb-4">
                <label className="input-label">Minimum Stock</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Supplier</label>
              <input
                type="text"
                className="input"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
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

// Stock Update Modal
const StockUpdateModal = ({ item, onClose, onSave }) => {
  const [operation, setOperation] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) return;
    
    setIsSaving(true);

    try {
      await window.electronAPI.invoke('inventory:updateStock', {
        id: item.id,
        quantity: parseFloat(quantity),
        operation,
      });
      onSave();
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update stock');
    } finally {
      setIsSaving(false);
    }
  };

  const newStock = operation === 'add'
    ? item.current_stock + (parseFloat(quantity) || 0)
    : item.current_stock - (parseFloat(quantity) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Update Stock</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--spacing-4)',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                {item.name}
              </div>
              <div style={{ color: 'var(--gray-500)' }}>
                Current: {item.current_stock} {item.unit}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
              <button
                type="button"
                className={`btn ${operation === 'add' ? 'btn-success' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setOperation('add')}
              >
                <TrendingUp size={18} />
                Add Stock
              </button>
              <button
                type="button"
                className={`btn ${operation === 'subtract' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setOperation('subtract')}
              >
                <TrendingDown size={18} />
                Remove
              </button>
            </div>

            <div className="input-group mb-4">
              <label className="input-label">Quantity ({item.unit})</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="0.01"
              />
            </div>

            {quantity && (
              <div style={{ 
                textAlign: 'center',
                padding: 'var(--spacing-3)',
                background: newStock <= item.minimum_stock ? 'var(--warning-50)' : 'var(--success-50)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 600,
                color: newStock <= item.minimum_stock ? 'var(--warning-600)' : 'var(--success-600)',
              }}>
                New Stock: {newStock.toFixed(2)} {item.unit}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn ${operation === 'add' ? 'btn-success' : 'btn-danger'}`}
              disabled={isSaving || !quantity}
            >
              {isSaving ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryPage;
