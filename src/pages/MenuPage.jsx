import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  FolderOpen,
  Leaf,
  RefreshCw,
  List
} from 'lucide-react';
import './MenuPage.css'; // Added import

const MenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGlobalAddonsModal, setShowGlobalAddonsModal] = useState(false); // New modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addons, setAddons] = useState([]);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menus, setMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showMenuManager, setShowMenuManager] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cats, items, addonsList, menusList, active] = await Promise.all([
        window.electronAPI.invoke('menu:getCategories'),
        window.electronAPI.invoke('menu:getItems', {}),
        window.electronAPI.invoke('menu:getAddons'),
        window.electronAPI.invoke('menu:getMenus'),
        window.electronAPI.invoke('menu:getActiveMenu')
      ]);
      setCategories(cats);
      setMenuItems(items);
      setAddons(addonsList || []);
      setMenus(menusList || []);
      setActiveMenu(active);
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



  // Helper for Global Addons List Modal
  const handleEditAddon = (addon) => {
    setEditingAddon(addon);
    setShowAddonModal(true);
  };

  const handleDeleteAddon = async (id) => {
    if (window.confirm('Are you sure you want to delete this add-on?')) {
      await window.electronAPI.invoke('menu:deleteAddon', { id });
      loadData();
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      const result = await window.electronAPI.invoke('menu:deleteCategory', { id });
      if (result.success) {
        loadData();
        if (selectedCategory === id) setSelectedCategory(null);
      } else {
        alert(result.error);
      }
    }
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
    <div className="page-container" style={{ height: 'calc(100vh - 65px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '16px 24px',
        margin: '0',
        zIndex: 20,
        borderBottom: '1px solid var(--gray-200)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Menu Management</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: '4px 0 0 0' }}>Manage items, categories & add-ons</p>
          </div>
          
          {/* Menu Profile Selector */}
          <div 
            onClick={() => setShowMenuManager(true)}
            style={{ 
              background: 'var(--primary-50)', 
              padding: '6px 14px', 
              borderRadius: '20px', 
              border: '1px solid var(--primary-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-500)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary-700)' }}>
              Menu: {activeMenu?.name || 'Loading...'}
            </span>
            <RefreshCw size={14} style={{ color: 'var(--primary-400)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowGlobalAddonsModal(true)}
          >
            <List size={18} />
            Global Add-ons
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
          >
            <Plus size={18} />
            Add Category
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingItem(null);
              setShowItemModal(true);
            }}
            style={{ background: '#D32F2F', border: 'none' }}
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
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
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => handleDeleteCategory(cat.id)}
                style={{ padding: '4px', color: 'var(--danger-500)' }}
                title="Delete Category"
              >
                <Trash2 size={14} />
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

          globalAddons={addons}
          onRefreshAddons={loadData}
        />
      )}

      {/* Global Add-ons List Modal */}
      {showGlobalAddonsModal && (
        <GlobalAddonsListModal
          addons={addons}
          onClose={() => setShowGlobalAddonsModal(false)}
          onAdd={() => {
            setEditingAddon(null);
            setShowAddonModal(true);
            // We keep GlobalAddonsListModal open, AddonModal opens on top
          }}
          onEdit={(addon) => {
            setEditingAddon(addon);
            setShowAddonModal(true);
          }}
          onDelete={handleDeleteAddon}
        />
      )}

      {/* Addon Modal - Rendered Last to be on Top */}
      {showAddonModal && (
        <AddonModal
          addon={editingAddon}
          onClose={() => {
            setShowAddonModal(false);
            setEditingAddon(null);
          }}
          onSave={() => {
            setShowAddonModal(false);
            setEditingAddon(null);
            loadData();
          }}
        />
      )}

      {/* Menu Manager Modal */}
      {showMenuManager && (
        <MenuManagerModal 
          menus={menus}
          activeMenu={activeMenu}
          onClose={() => setShowMenuManager(false)}
          onRefresh={loadData}
        />
      )}
      </div>
    </div>
  );
};

// Global Add-ons List Modal
const GlobalAddonsListModal = ({ addons, onClose, onAdd, onEdit, onDelete }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px', height: '70vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--gray-200)' }}>
          <div>
            <h3 className="modal-title">Global Add-ons</h3>
            <p className="text-muted text-sm">Manage add-ons available for all items</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-secondary" onClick={onAdd}>
              <Plus size={16} /> New Add-on
            </button>
          </div>

          {addons.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="text-muted">No global add-ons found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {addons.map(addon => (
                <div key={addon.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'white',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: addon.type === 'veg' ? '#dcfce7' : '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: addon.type === 'veg' ? '#16a34a' : '#dc2626'
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{addon.name}</div>
                      <div className="text-sm text-muted">₹{addon.price}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => onEdit(addon)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => onDelete(addon.id)}
                      style={{ color: 'var(--error-500)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Category Modal - Redesigned
const CategoryModal = ({ category, onClose, onSave }) => {
  const [name, setName] = useState(category?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (category?.id) {
        await window.electronAPI.invoke('menu:saveCategory', { category: { id: category.id, name } });
      } else {
        await window.electronAPI.invoke('menu:saveCategory', { category: { name } });
      }
      onSave();
    } catch (error) {
      console.error(error);
      alert('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#FFEBEE',
              color: '#D32F2F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderOpen size={24} />
            </div>
            <div>
              <div>{category ? 'Edit Category' : 'New Category'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 400, marginTop: '2px' }}>
                Organize your menu items
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Category Name</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)',
                  pointerEvents: 'none'
                }}>
                  <FolderOpen size={18} />
                </div>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Pizzas, Drinks, Desserts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Menu Item Modal
const MenuItemModal = ({ item, categories, onClose, onSave, globalAddons = [], onRefreshAddons }) => {
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
    variants: [],
    addons: [],
  });

  // Safe init
  useEffect(() => {
    let initialVariants = [];
    let initialAddons = [];
    try {
      if (item?.variants) {
        initialVariants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
      }
    } catch (e) { console.error('Error parsing variants', e) }

    try {
      if (item?.addons) {
        initialAddons = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
      }
    } catch (e) { console.error('Error parsing addons', e) }

    setFormData(prev => ({
      ...prev,
      variants: initialVariants || [],
      addons: initialAddons || []
    }));
  }, [item]);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, variants, addons

  // Variant Selection State
  const [variantType, setVariantType] = useState('Small'); // Small, Medium, Large, Custom
  const [customVariantName, setCustomVariantName] = useState('');

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

  const addVariant = (name) => {
    // Check dupes
    if (formData.variants.some(v => v.name === name)) {
      alert('Variant already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { name: name, price: '' }]
    }));
  };

  const handleAddVariant = () => {
    let nameToAdd = variantType;
    if (variantType === 'Custom') {
      if (!customVariantName.trim()) {
        alert('Please enter a variant name');
        return;
      }
      nameToAdd = customVariantName;
    }

    addVariant(nameToAdd);

    // Reset
    if (variantType === 'Custom') setCustomVariantName('');
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

  const addGlobalAddon = (globalAddon) => {
    if (formData.addons.some(a => a.name === globalAddon.name)) {
      alert('This add-on is already added');
      return;
    }
    setFormData({
      ...formData,
      addons: [...formData.addons, {
        name: globalAddon.name,
        price: globalAddon.price,
        type: globalAddon.type
      }]
    });
  };

  const addAddon = () => {
    setFormData({
      ...formData,
      addons: [...formData.addons, { name: '', price: '', type: 'veg' }]
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
      <div className="modal" style={{ maxWidth: '700px', height: '80vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.25rem', color: '#111827' }}>{item ? 'Edit Item' : 'New Menu Item'}</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '4px' }}>Fill in the details for your menu item.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* Improved Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['basic', 'variants', 'addons'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '16px 0',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab ? '2px solid #D32F2F' : '2px solid transparent',
                  color: activeTab === tab ? '#D32F2F' : '#6b7280',
                  fontWeight: activeTab === tab ? 600 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'basic' ? 'Basic Info' : tab === 'variants' ? `Variants (${formData.variants.length})` : `Add-ons (${formData.addons.length})`}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

            {activeTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Item Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ padding: '12px', fontSize: '1rem' }}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    style={{ padding: '12px' }}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Category *</label>
                  <select
                    className="input select"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    style={{ padding: '12px' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-group">
                    <label className="input-label">Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      style={{ padding: '12px', fontWeight: 600 }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                      style={{ padding: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
                  {/* Veg/Non-Veg Toggle - Styled */}
                  <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                    <div
                      onClick={() => setFormData({ ...formData, is_vegetarian: true })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: formData.is_vegetarian ? 'white' : 'transparent',
                        color: formData.is_vegetarian ? '#15803d' : '#6b7280',
                        fontWeight: 500,
                        boxShadow: formData.is_vegetarian ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d' }}></div> Veg
                    </div>
                    <div
                      onClick={() => setFormData({ ...formData, is_vegetarian: false })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: !formData.is_vegetarian ? 'white' : 'transparent',
                        color: !formData.is_vegetarian ? '#b91c1c' : '#6b7280',
                        fontWeight: 500,
                        boxShadow: !formData.is_vegetarian ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b91c1c' }}></div> Non-Veg
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 500 }}>Available for Sale</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'variants' && (
              <div>
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Add Variant</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <select
                        className="input select"
                        value={variantType}
                        onChange={(e) => setVariantType(e.target.value)}
                        style={{ padding: '10px' }}
                      >
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                        <option value="Half">Half</option>
                        <option value="Full">Full</option>
                        <option value="Custom">Custom...</option>
                      </select>
                      {variantType === 'Custom' && (
                        <input
                          type="text"
                          className="input"
                          placeholder="Variant Name"
                          value={customVariantName}
                          onChange={(e) => setCustomVariantName(e.target.value)}
                          style={{ padding: '10px' }}
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddVariant}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['Small', 'Medium', 'Large', 'Half', 'Full'].map(size => (
                        <button
                          key={size}
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => addVariant(size)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            cursor: 'pointer'
                          }}
                        >
                          + {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.variants.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
                      <p>No variants added yet.</p>
                      <p style={{ fontSize: '0.875rem' }}>Add variants like Small, Medium, Large to offer options.</p>
                    </div>
                  )}
                  {formData.variants.map((variant, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Variant Name</label>
                        <input
                          type="text"
                          className="input"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="Name"
                          style={{ padding: '8px', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Price (₹)</label>
                        <input
                          type="number"
                          className="input"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          placeholder="0.00"
                          style={{ padding: '8px', fontWeight: 600, fontSize: '0.9rem' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeVariant(index)}
                        title="Remove Variant"
                        style={{ marginTop: '16px', color: '#ef4444' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'addons' && (
              <div>
                {/* Global Add-ons Selector */}
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #dcfce7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#166534', margin: 0 }}>Import from Global Add-ons</h4>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={onRefreshAddons} style={{ color: '#166534' }}>
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {globalAddons.length === 0 && <p style={{ fontSize: '0.875rem', color: '#166534' }}>No global add-ons found.</p>}
                    {globalAddons.map(ga => (
                      <button
                        key={ga.id}
                        type="button"
                        onClick={() => addGlobalAddon(ga)}
                        style={{
                          padding: '6px 12px',
                          background: 'white',
                          border: '1px solid #bbf7d0',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          color: '#166534',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <Plus size={12} /> {ga.name} (₹{ga.price})
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p className="text-muted text-sm">Add-ons for this item</p>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addAddon}>
                    <Plus size={14} /> Custom Add-on
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.addons.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
                      <p>No add-ons added yet.</p>
                    </div>
                  )}
                  {formData.addons.map((addon, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Add-on Name</label>
                        <input type="text" className="input" value={addon.name} onChange={(e) => updateAddon(index, 'name', e.target.value)} placeholder="Name" style={{ padding: '8px', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ width: '100px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Price (₹)</label>
                        <input type="number" className="input" value={addon.price} onChange={(e) => updateAddon(index, 'price', e.target.value)} placeholder="0.00" style={{ padding: '8px', fontWeight: 600, fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ width: '110px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Type</label>
                        <select className="input select" value={addon.type} onChange={(e) => updateAddon(index, 'type', e.target.value)} style={{ padding: '8px', fontSize: '0.9rem' }}>
                          <option value="veg">Veg</option>
                          <option value="non-veg">Non-Veg</option>
                        </select>
                      </div>
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeAddon(index)} title="Remove Add-on" style={{ marginTop: '16px', color: '#ef4444' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
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


// Menu Manager Modal
const MenuManagerModal = ({ menus, activeMenu, onClose, onRefresh }) => {
  const [newMenuName, setNewMenuName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateMenu = async (e) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;
    setIsCreating(true);
    try {
      await window.electronAPI.invoke('menu:saveMenu', { menu: { name: newMenuName } });
      setNewMenuName('');
      onRefresh();
    } catch (error) {
      alert('Failed to create menu profile');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchMenu = async (id) => {
    try {
      await window.electronAPI.invoke('menu:setActiveMenu', { id });
      onRefresh();
    } catch (error) {
      alert('Failed to switch menu profile');
    }
  };

  const handleDuplicate = async (id, name) => {
    const newName = window.prompt('Enter name for the duplicate menu profile:', `${name} (Copy)`);
    if (!newName) return;
    try {
      await window.electronAPI.invoke('menu:duplicateMenu', { id, name: newName });
      onRefresh();
    } catch (error) {
      alert('Failed to duplicate menu profile');
    }
  };

  const handleDelete = async (id, name, isActive) => {
    if (isActive) {
      alert('Cannot delete the active menu profile.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the menu profile "${name}"? This will delete all its categories and items.`)) {
      try {
        await window.electronAPI.invoke('menu:deleteMenu', { id });
        onRefresh();
      } catch (error) {
        alert('Failed to delete menu profile');
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Menu Management Profiles</h3>
            <p className="text-muted text-sm">Switch between different menu setups (e.g., Breakfast, Lunch, Special)</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {/* Create New Profile */}
          <form onSubmit={handleCreateMenu} style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '16px', background: 'var(--gray-50)', borderRadius: '12px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Enter new menu profile name..." 
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={isCreating || !newMenuName.trim()}>
              <Plus size={18} /> Create Profile
            </button>
          </form>

          {/* List Profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {menus.map(menu => {
              const isActive = activeMenu?.id === menu.id;
              return (
                <div key={menu.id} style={{ 
                  padding: '16px', 
                  border: `1px solid ${isActive ? 'var(--primary-300)' : 'var(--gray-200)'}`, 
                  borderRadius: '12px',
                  background: isActive ? 'var(--primary-50)' : 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      background: isActive ? 'var(--primary-500)' : 'var(--gray-100)',
                      color: isActive ? 'white' : 'var(--gray-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <List size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: isActive ? 'var(--primary-700)' : 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {menu.name}
                        {isActive && <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>Active</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                        Created: {new Date(menu.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isActive && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleSwitchMenu(menu.id)}>
                        Switch To
                      </button>
                    )}
                    <button className="btn btn-secondary btn-icon btn-sm" title="Duplicate Profile" onClick={() => handleDuplicate(menu.id, menu.name)}>
                      <RefreshCw size={14} />
                    </button>
                    {!isActive && (
                      <button className="btn btn-secondary btn-icon btn-sm" style={{ color: 'var(--danger-500)' }} title="Delete Profile" onClick={() => handleDelete(menu.id, menu.name, isActive)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;

// Addon Modal
const AddonModal = ({ addon, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: addon?.name || '',
    price: addon?.price || '',
    type: addon?.type || 'veg',
    is_available: addon?.is_available ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const saveData = {
        ...formData,
        price: parseFloat(formData.price),
        is_available: formData.is_available ? 1 : 0,
      };

      if (addon?.id) {
        saveData.id = addon.id;
      }

      await window.electronAPI.invoke('menu:saveAddon', { addon: saveData });
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save add-on');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" style={{ maxWidth: '400px', borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: 'none', padding: '16px 20px 0 20px' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.25rem', color: '#111827' }}>{addon ? 'Edit Add-on' : 'New Add-on'}</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '2px', marginBottom: 0 }}>Global add-on for menu items.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px' }}>

            {/* Type Selection Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div
                onClick={() => setFormData({ ...formData, type: 'veg' })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: `1px solid ${formData.type === 'veg' ? '#22c55e' : '#e5e7eb'}`,
                  background: formData.type === 'veg' ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: formData.type === 'veg' ? '#15803d' : '#6b7280' }}>Veg</span>
              </div>

              <div
                onClick={() => setFormData({ ...formData, type: 'non-veg' })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: `1px solid ${formData.type === 'non-veg' ? '#ef4444' : '#e5e7eb'}`,
                  background: formData.type === 'non-veg' ? '#fef2f2' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: formData.type === 'non-veg' ? '#b91c1c' : '#6b7280' }}>Non-Veg</span>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label className="input-label" style={{ marginBottom: '4px', fontSize: '0.8rem' }}>Add-on Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Extra Cheese"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ padding: '8px 10px', fontSize: '0.95rem' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label className="input-label" style={{ marginBottom: '4px', fontSize: '0.8rem' }}>Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                style={{ padding: '8px 10px', fontSize: '0.95rem', fontWeight: 600 }}
              />
            </div>

            <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f9fafb', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                <div style={{
                  width: '32px',
                  height: '18px',
                  background: formData.is_available ? '#22c55e' : '#e5e7eb',
                  borderRadius: '20px',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: formData.is_available ? '16px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  style={{ display: 'none' }}
                />
                <span style={{ fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>Available for sale</span>
              </label>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', padding: '0 20px 20px 20px', justifyContent: 'flex-end', marginTop: 0 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving} style={{
              padding: '6px 16px',
              background: '#D32F2F',
              boxShadow: '0 2px 4px -1px rgba(211, 47, 47, 0.4)'
            }}>
              {isSaving ? 'Saving...' : 'Save Add-on'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
