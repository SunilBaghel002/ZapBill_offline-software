import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  AlertTriangle,
  Search,
  X,
  Save,
  TrendingDown,
  TrendingUp,
  History,
  Trash2,
  MoreVertical
} from 'lucide-react';

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockUpdateItem, setStockUpdateItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
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
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * (item.cost_per_unit || 0)), 0);

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await window.electronAPI.invoke('inventory:delete', { id: item.id });
        loadInventory();
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleStockUpdate = (item) => {
    setStockUpdateItem(item);
    setShowStockModal(true);
  };

  const handleHistory = (item) => {
    setHistoryItem(item);
    setShowHistoryModal(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-6)', textAlign: 'center' }}>
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--spacing-6)' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-1)' }}>Inventory Management</h1>
          <p style={{ color: 'var(--gray-500)' }}>Track stock levels, value, and history</p>
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

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 'var(--spacing-4)', 
        marginBottom: 'var(--spacing-6)' 
      }}>
        {/* Total Items */}
        <div className="card" style={{ padding: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div style={{ 
            padding: 'var(--spacing-3)', 
            borderRadius: 'var(--radius-full)', 
            background: 'var(--info-50)', 
            color: 'var(--info-600)' 
          }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>{inventory.length}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>Total Items</div>
          </div>
        </div>
        
        {/* Low Stock */}
        <div 
          className="card" 
          style={{ 
            padding: 'var(--spacing-4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-4)',
            cursor: 'pointer',
            border: showLowStock ? '2px solid var(--warning-500)' : '1px solid var(--gray-200)'
          }}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <div style={{ 
            padding: 'var(--spacing-3)', 
            borderRadius: 'var(--radius-full)', 
            background: 'var(--warning-50)', 
            color: 'var(--warning-600)' 
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--warning-600)' }}>{lowStockCount}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>Low Stock Items</div>
          </div>
        </div>

        {/* Total Value */}
        <div className="card" style={{ padding: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div style={{ 
            padding: 'var(--spacing-3)', 
            borderRadius: 'var(--radius-full)', 
            background: 'var(--success-50)', 
            color: 'var(--success-600)',
            width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>₹</span>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>₹{totalValue.toLocaleString()}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>Total Stock Value</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)', alignItems: 'center' }}>
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
            style={{ paddingLeft: '40px' }}
            placeholder="Search by item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {showLowStock && (
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--warning-600)' }}
            onClick={() => setShowLowStock(false)}
          >
            <X size={16} />
            Clear Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Status</th>
              <th>Stock Level</th>
              <th>Unit Cost</th>
              <th>Total Value</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => {
              const stockPercentage = Math.min(100, (item.current_stock / (item.minimum_stock * 3)) * 100);
              const isLow = item.current_stock <= item.minimum_stock;
              
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>{item.supplier}</div>
                  </td>
                  <td>
                    {isLow ? (
                      <span className="badge badge-warning">Low Stock</span>
                    ) : (
                      <span className="badge badge-success">In Stock</span>
                    )}
                  </td>
                  <td style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                      <div style={{ flex: 1, height: '8px', background: 'var(--gray-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${stockPercentage}%`, 
                            background: isLow ? 'var(--warning-500)' : 'var(--success-500)',
                            borderRadius: 'var(--radius-full)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                        {item.current_stock} <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-xs)' }}>{item.unit}</span>
                      </span>
                    </div>
                  </td>
                  <td>₹{item.cost_per_unit || 0}</td>
                  <td>₹{((item.cost_per_unit || 0) * item.current_stock).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleStockUpdate(item)}
                        title="Update Stock"
                        style={{ color: 'var(--info-600)' }}
                      >
                        <TrendingUp size={16} />
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleHistory(item)}
                        title="View History"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleEdit(item)}
                        title="Edit Item"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {filteredInventory.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--gray-500)' }}>
                    <Package size={48} style={{ marginBottom: 'var(--spacing-2)', color: 'var(--gray-300)' }} />
                    <p style={{ fontWeight: 500 }}>No items found</p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>Try adjusting your search or add a new item.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
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
          onDelete={editingItem ? () => handleDelete(editingItem) : null}
        />
      )}

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

      {showHistoryModal && historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => {
            setShowHistoryModal(false);
            setHistoryItem(null);
          }}
        />
      )}
    </div>
  );
};

// --- Subcomponents ---

const InventoryModal = ({ item, onClose, onSave, onDelete }) => {
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
      await window.electronAPI.invoke('inventory:save', {
        item: {
          ...formData,
          id: item?.id,
          current_stock: parseFloat(formData.current_stock),
          minimum_stock: parseFloat(formData.minimum_stock),
          cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        }
      });
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
      <div className="modal" style={{ height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto' }}>
            <div className="input-group mb-3">
              <label className="input-label">Item Name</label>
              <input 
                className="input" 
                required 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Tomatoes, Milk, Cups"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
              <div className="input-group">
                <label className="input-label">Unit Type</label>
                <select 
                  className="input select"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                >
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Current Stock</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={formData.current_stock}
                  onChange={e => setFormData({...formData, current_stock: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
              <div className="input-group">
                <label className="input-label">Min. Stock Alert</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={formData.minimum_stock}
                  onChange={e => setFormData({...formData, minimum_stock: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Cost per Unit (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={formData.cost_per_unit}
                  onChange={e => setFormData({...formData, cost_per_unit: e.target.value})}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Supplier Name</label>
              <input 
                className="input" 
                value={formData.supplier}
                onChange={e => setFormData({...formData, supplier: e.target.value})}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {onDelete ? (
              <button type="button" className="btn btn-danger" onClick={onDelete}>
                <Trash2 size={16} /> Delete
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const StockUpdateModal = ({ item, onClose, onSave }) => {
  const [operation, setOperation] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Purchase');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reasons = {
    add: ['Purchase', 'Return', 'Correction', 'Other'],
    subtract: ['Usage', 'Waste', 'Expired', 'Theft', 'Correction', 'Other'],
    set: ['Stock Take', 'Correction']
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity) return;
    setIsSaving(true);
    try {
      await window.electronAPI.invoke('inventory:updateStock', {
        id: item.id,
        quantity: parseFloat(quantity),
        operation,
        reason,
        notes
      });
      onSave();
    } catch (error) {
      alert('Failed to update stock');
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedStock = operation === 'add' ? item.current_stock + parseFloat(quantity || 0) :
                         operation === 'subtract' ? item.current_stock - parseFloat(quantity || 0) :
                         parseFloat(quantity || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '400px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Update Stock: {item.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
              <button 
                type="button" 
                className={`btn ${operation === 'add' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => { setOperation('add'); setReason('Purchase'); }}
              >
                Add (+)
              </button>
              <button 
                type="button"
                className={`btn ${operation === 'subtract' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => { setOperation('subtract'); setReason('Waste'); }}
              >
                Remove (-)
              </button>
            </div>

            <div className="input-group mb-3">
              <label className="input-label">Quantity ({item.unit})</label>
              <input 
                type="number" 
                step="0.01" 
                className="input"
                style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}
                autoFocus
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>

            <div className="input-group mb-3">
              <label className="input-label">Reason</label>
              <select 
                className="input select"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                {reasons[operation].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="input-group mb-3">
              <label className="input-label">Notes (Optional)</label>
              <input 
                className="input" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. Invoice #123"
              />
            </div>

            <div style={{ 
              padding: 'var(--spacing-3)', 
              background: 'var(--gray-50)', 
              borderRadius: 'var(--radius-lg)',
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--gray-500)' }}>New Stock Level:</span>
              <span style={{ 
                fontWeight: 'bold',
                color: operation === 'subtract' ? 'var(--danger-600)' : 'var(--success-600)'
              }}>
                {isNaN(calculatedStock) ? '...' : calculatedStock.toFixed(2)} {item.unit}
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>Update Stock</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HistoryModal = ({ item, onClose }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await window.electronAPI.invoke('inventory:getHistory', { id: item.id });
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [item.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{item.name} - History</h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>Transaction log</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="table">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--gray-50)', zIndex: 1 }}>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Stock After</th>
                  <th>Reason</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>Loading...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--gray-500)' }}>No history found.</td></tr>
                ) : (
                  history.map(record => (
                    <tr key={record.id}>
                      <td style={{ color: 'var(--gray-600)' }}>
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${
                          record.type === 'add' ? 'success' : 
                          record.type === 'subtract' ? 'error' : 
                          'info'
                        }`}>
                          {record.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ 
                        fontWeight: 500, 
                        color: record.type === 'add' ? 'var(--success-600)' : 'var(--danger-600)' 
                      }}>
                        {record.type === 'add' ? '+' : '-'}{record.quantity}
                      </td>
                      <td>{record.current_stock_snapshot}</td>
                      <td>{record.reason}</td>
                      <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.notes}>
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
