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
  TrendingUp,
  History,
  Trash2,
  MoreVertical,
  Filter
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
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Track stock levels, value, and history</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-value">{inventory.length}</div>
            <div className="stat-label">Total Items</div>
          </div>
        </div>
        
        <div 
          className={`stat-card cursor-pointer ${showLowStock ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <div className="stat-icon bg-orange-50 text-orange-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-value text-orange-600">{lowStockCount}</div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green-50 text-green-600">
            <div className="font-bold text-xl">₹</div>
          </div>
          <div>
            <div className="stat-value">₹{totalValue.toLocaleString()}</div>
            <div className="stat-label">Total Stock Value</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
          />
          <input
            type="text"
            className="input pl-10 w-full"
            placeholder="Search by item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {showLowStock && (
          <button
            className="btn btn-sm btn-ghost text-orange-600"
            onClick={() => setShowLowStock(false)}
          >
            <X size={16} />
            Clear Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Level</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInventory.map(item => {
              const stockPercentage = Math.min(100, (item.current_stock / (item.minimum_stock * 3)) * 100);
              const isLow = item.current_stock <= item.minimum_stock;
              
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-400">{item.supplier}</div>
                  </td>
                  <td className="px-6 py-4">
                    {isLow ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {item.current_stock} <span className="text-gray-500 text-xs">{item.unit}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    ₹{item.cost_per_unit || 0}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ₹{((item.cost_per_unit || 0) * item.current_stock).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-blue-600 transition-all"
                        onClick={() => handleStockUpdate(item)}
                        title="Update Stock"
                      >
                        <TrendingUp size={16} />
                      </button>
                      <button 
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-600 transition-all"
                        onClick={() => handleHistory(item)}
                        title="View History"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-600 transition-all"
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
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Package size={48} className="text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">No items found</p>
                    <p className="text-sm">Try adjusting your search or add a new item.</p>
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
    minimum_stock: item?.minimum_stock || 0, // Should default to something reasonable or 0
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
      <div className="modal w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="input-group">
              <label className="input-label">Item Name</label>
              <input 
                className="input" 
                required 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Tomatoes, Milk, Cups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
          <div className="modal-footer flex justify-between">
            {onDelete ? (
              <button type="button" className="btn btn-danger btn-ghost" onClick={onDelete}>
                <Trash2 size={16} /> Delete
              </button>
            ) : <div />}
            <div className="flex gap-2">
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
      <div className="modal w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Update Stock: {item.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                type="button" 
                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${operation === 'add' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => { setOperation('add'); setReason('Purchase'); }}
              >
                Add (+)
              </button>
              <button 
                type="button"
                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${operation === 'subtract' ? 'bg-white shadow text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => { setOperation('subtract'); setReason('Waste'); }}
              >
                Remove (-)
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Quantity ({item.unit})</label>
              <input 
                type="number" 
                step="0.01" 
                className="input text-lg font-bold" 
                autoFocus
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Reason</label>
              <select 
                className="input select"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                {reasons[operation].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Notes (Optional)</label>
              <input 
                className="input" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. Invoice #123"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-gray-500">New Stock Level:</span>
              <span className={`font-bold ${operation === 'subtract' ? 'text-red-600' : 'text-green-600'}`}>
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
      <div className="modal w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{item.name} - History</h3>
            <p className="text-xs text-gray-400">Transaction log</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body p-0">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-5 py-3 text-gray-500 font-medium">Date</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Type</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Change</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Stock After</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Reason</th>
                  <th className="px-5 py-3 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="p-8 text-center">Loading...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">No history found.</td></tr>
                ) : (
                  history.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.type === 'add' ? 'bg-green-100 text-green-700' : 
                          record.type === 'subtract' ? 'bg-red-100 text-red-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {record.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-5 py-3 font-medium ${record.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                        {record.type === 'add' ? '+' : '-'}{record.quantity}
                      </td>
                      <td className="px-5 py-3 text-gray-900">{record.current_stock_snapshot}</td>
                      <td className="px-5 py-3 text-gray-600">{record.reason}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs truncate max-w-[150px]" title={record.notes}>
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
          <button className="btn btn-secondary w-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
