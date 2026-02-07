import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  Save,
  FolderOpen,
  Leaf
} from 'lucide-react';

const MenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cats, items] = await Promise.all([
        window.electronAPI.invoke('menu:getCategories'),
        window.electronAPI.invoke('menu:getItems', {}),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await window.electronAPI.invoke('menu:deleteItem', { id });
      loadData();
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p className="mt-4">Loading menu...</p>
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
          <h1>Menu Management</h1>
          <p className="text-muted">Manage your menu items and categories</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
          >
            <FolderOpen size={18} />
            Add Category
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingItem(null);
              setShowItemModal(true);
            }}
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h4 style={{ marginBottom: 'var(--spacing-2)' }}>Categories</h4>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
          <button
            className={`category-tab ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All ({menuItems.length})
          </button>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name} ({menuItems.filter(i => i.category_id === cat.id).length})
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => handleEditCategory(cat)}
                style={{ padding: '4px' }}
              >
                <Edit2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--spacing-4)', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
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
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Tax</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-muted">{item.description}</div>
                  )}
                </td>
                <td>{item.category_name}</td>
                <td style={{ fontWeight: 600 }}>₹{item.price.toFixed(2)}</td>
                <td>{item.tax_rate}%</td>
                <td>
                  {item.is_vegetarian ? (
                    <span className="badge badge-success">
                      <Leaf size={12} style={{ marginRight: '4px' }} />
                      Veg
                    </span>
                  ) : (
                    <span className="badge badge-error">Non-Veg</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${item.is_available ? 'badge-success' : 'badge-gray'}`}>
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleEditItem(item)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ color: 'var(--error-500)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="empty-state">
            <FolderOpen size={48} />
            <p className="empty-state-title">No items found</p>
            <p className="text-muted">Add your first menu item to get started</p>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <MenuItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowItemModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Menu Item Modal
const MenuItemModal = ({ item, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category_id: item?.category_id || (categories[0]?.id || ''),
    price: item?.price || '',
    cost_price: item?.cost_price || '',
    tax_rate: item?.tax_rate || 5,
    is_vegetarian: item?.is_vegetarian || false,
    is_available: item?.is_available ?? true,
    preparation_time: item?.preparation_time || '',
    variants: item?.variants ? (typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants) : [],
    addons: item?.addons ? (typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons) : [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, variants, addons

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const saveData = {
        ...formData,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        tax_rate: parseFloat(formData.tax_rate),
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        is_vegetarian: formData.is_vegetarian ? 1 : 0,
        is_available: formData.is_available ? 1 : 0,
      };

      if (item?.id) {
        saveData.id = item.id;
      }

      await window.electronAPI.invoke('menu:saveItem', { item: saveData });
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { name: '', price: '' }]
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index)
    });
  };

  const addAddon = () => {
    setFormData({
      ...formData,
      addons: [...formData.addons, { name: '', price: '', type: 'veg' }] // type: veg/non-veg
    });
  };

  const updateAddon = (index, field, value) => {
    const newAddons = [...formData.addons];
    newAddons[index][field] = value;
    setFormData({ ...formData, addons: newAddons });
  };

  const removeAddon = (index) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 'var(--spacing-4)' }}>
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
            style={{ padding: '12px 0', borderBottom: activeTab === 'basic' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'basic' ? 'var(--primary-600)' : 'var(--gray-500)', fontWeight: 500 }}
          >
            Basic Info
          </button>
          <button 
            className={`tab-btn ${activeTab === 'variants' ? 'active' : ''}`}
            onClick={() => setActiveTab('variants')}
            style={{ padding: '12px 0', borderBottom: activeTab === 'variants' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'variants' ? 'var(--primary-600)' : 'var(--gray-500)', fontWeight: 500 }}
          >
            Variants ({formData.variants.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'addons' ? 'active' : ''}`}
            onClick={() => setActiveTab('addons')}
            style={{ padding: '12px 0', borderBottom: activeTab === 'addons' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'addons' ? 'var(--primary-600)' : 'var(--gray-500)', fontWeight: 500 }}
          >
            Add-ons ({formData.addons.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            
            {activeTab === 'basic' && (
              <>
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

                <div className="input-group mb-4">
                  <label className="input-label">Description</label>
                  <textarea
                    className="input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="input-group mb-4">
                  <label className="input-label">Category *</label>
                  <select
                    className="input select"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  <div className="input-group mb-4">
                    <label className="input-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group mb-4">
                    <label className="input-label">Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  <div className="input-group mb-4">
                    <label className="input-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    />
                  </div>

                  <div className="input-group mb-4">
                    <label className="input-label">Prep Time (min)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.preparation_time}
                      onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Veg/Non-Veg Toggle */}
                <div className="input-group mb-4">
                  <label className="input-label">Item Type</label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_vegetarian: true })}
                      style={{
                        flex: 1,
                        padding: 'var(--spacing-3)',
                        border: `2px solid ${formData.is_vegetarian ? '#22c55e' : 'var(--gray-300)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: formData.is_vegetarian ? '#dcfce7' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-2)'
                      }}
                    >
                      <Leaf size={16} fill="#22c55e" stroke="#166534" />
                      <span style={{ fontWeight: formData.is_vegetarian ? 600 : 400, color: '#166534' }}>Veg</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_vegetarian: false })}
                      style={{
                        flex: 1,
                        padding: 'var(--spacing-3)',
                        border: `2px solid ${!formData.is_vegetarian ? '#ef4444' : 'var(--gray-300)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: !formData.is_vegetarian ? '#fef2f2' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-2)'
                      }}
                    >
                      <div style={{ width: '16px', height: '16px', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                      </div>
                      <span style={{ fontWeight: !formData.is_vegetarian ? 600 : 400, color: '#991b1b' }}>Non-Veg</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--spacing-2)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    />
                    <span>Available for sale</span>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'variants' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p className="text-muted text-sm">Add variations like sizes (Small, Medium, Large)</p>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addVariant}>
                    <Plus size={14} /> Add Variant
                  </button>
                </div>
                
                {formData.variants.length === 0 ? (
                  <div className="text-center p-4 bg-gray-50 rounded text-muted text-sm">
                    No variants added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.variants.map((variant, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Variant Name"
                          className="input btn-sm"
                          style={{ flex: 1 }}
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          className="input btn-sm"
                          style={{ width: '80px' }}
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeVariant(index)}
                          style={{ color: 'var(--error-500)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'addons' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p className="text-muted text-sm">Add optional extra toppings or add-ons</p>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addAddon}>
                    <Plus size={14} /> Add Add-on
                  </button>
                </div>

                {formData.addons.length === 0 ? (
                   <div className="text-center p-4 bg-gray-50 rounded text-muted text-sm">
                    No add-ons added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.addons.map((addon, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Add-on Name"
                          className="input btn-sm"
                          style={{ flex: 2 }}
                          value={addon.name}
                          onChange={(e) => updateAddon(index, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          className="input btn-sm"
                          style={{ width: '80px' }}
                          value={addon.price}
                          onChange={(e) => updateAddon(index, 'price', e.target.value)}
                        />
                        <select
                          className="input select btn-sm"
                          style={{ width: '100px' }}
                          value={addon.type}
                          onChange={(e) => updateAddon(index, 'type', e.target.value)}
                        >
                          <option value="veg">Veg</option>
                          <option value="non-veg">Non-Veg</option>
                        </select>
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeAddon(index)}
                          style={{ color: 'var(--error-500)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Modal
const CategoryModal = ({ category, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    display_order: category?.display_order || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const saveData = {
        ...formData,
        display_order: parseInt(formData.display_order),
      };

      if (category?.id) {
        saveData.id = category.id;
      }

      await window.electronAPI.invoke('menu:saveCategory', { category: saveData });
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{category ? 'Edit Category' : 'Add Category'}</h3>
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

            <div className="input-group mb-4">
              <label className="input-label">Description</label>
              <input
                type="text"
                className="input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Display Order</label>
              <input
                type="number"
                className="input"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
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

export default MenuPage;
