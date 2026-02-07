import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Smartphone,
  X,
  Printer,
  Check,
  Search,
  Leaf,
  FileText,
  PauseCircle,
  PlayCircle,
  Clock
} from 'lucide-react';

const POSPage = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New States for Add-ons and Hold Order
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [selectedItemForAddon, setSelectedItemForAddon] = useState(null);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [heldOrders, setHeldOrders] = useState([]);

  const { user } = useAuthStore();
  const cart = useCartStore();

  // Load categories and menu items
  useEffect(() => {
    loadData();
    loadHeldOrders();
  }, []);

  const loadData = async () => {
    try {
      const categoriesResult = await window.electronAPI.invoke('menu:getCategories');
      setCategories(categoriesResult);
      
      if (categoriesResult.length > 0) {
        setSelectedCategory(categoriesResult[0].id);
      }

      const itemsResult = await window.electronAPI.invoke('menu:getItems', {});
      setMenuItems(itemsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHeldOrders = async () => {
    try {
      const orders = await window.electronAPI.invoke('order:getHeld');
      setHeldOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Failed to load held orders:', error);
      setHeldOrders([]);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.is_available;
  });

  const handleAddToCart = (item) => {
    // Parse variants/addons if they are strings
    const variants = item.variants ? (typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants) : [];
    const addons = item.addons ? (typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons) : [];

    if (variants.length > 0 || addons.length > 0) {
      setSelectedItemForAddon({ ...item, parsedVariants: variants, parsedAddons: addons });
      setShowAddonModal(true);
    } else {
      cart.addItem(item);
    }
  };

  const handleCheckout = () => {
    if (cart.items.length > 0) {
      setShowPayment(true);
    }
  };

  const handleHoldOrder = async () => {
    if (cart.items.length === 0) return;
    
    if (window.confirm('Hold this order and clear cart?')) {
      try {
        const result = await cart.holdOrder(user.id);
        if (result.success) {
          loadHeldOrders(); // Refresh held orders list
          // Cart is already cleared by holdOrder
        } else {
          alert('Failed to hold order: ' + result.error);
        }
      } catch (error) {
        console.error('Hold order error:', error);
        alert('Error holding order');
      }
    }
  };

  const handleResumeOrder = async (order) => {
    if (cart.items.length > 0) {
      if (!window.confirm('Current cart will be cleared. Continue?')) {
        return;
      }
    }
    
    try {
      // Resume order (populates cart)
      cart.resumeOrder(order);
      
      // Mark the held order as deleted so it doesn't appear in held list
      await window.electronAPI.invoke('order:resume', { id: order.id });
      
      setShowHeldOrders(false);
      loadHeldOrders();
    } catch (error) {
      console.error('Resume order error:', error);
      alert('Error resuming order');
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
    <div className="pos-layout">
      {/* Left Panel - Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', overflow: 'hidden' }}>
        {/* Search Bar */}
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
            style={{ paddingLeft: '40px', background: 'white' }}
          />
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredItems.length > 0 ? (
            <div className="menu-grid">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`menu-item-card ${item.is_vegetarian ? 'vegetarian' : 'non-vegetarian'}`}
                  onClick={() => handleAddToCart(item)}
                >
                  {/* Veg/Non-Veg Indicator Box */}
                  <div style={{ 
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${item.is_vegetarian ? '#22c55e' : '#ef4444'}`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.is_vegetarian ? '#22c55e' : '#ef4444'
                    }} />
                  </div>
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-price">₹{item.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <p>No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="cart-panel">
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <ShoppingCart size={20} />
              <span style={{ fontWeight: 600 }}>Current Order</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={() => setShowHeldOrders(true)} 
                title="View Held Orders"
                style={{ position: 'relative' }}
              >
                <Clock size={18} />
                {heldOrders.length > 0 && (
                  <span className="badge badge-error" style={{ position: 'absolute', top: -5, right: -5, padding: '2px 5px', fontSize: '10px' }}>
                    {heldOrders.length}
                  </span>
                )}
              </button>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {cart.getItemCount()} items
              </span>
            </div>
          </div>

          {/* Order Type Selection */}
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-2)', 
            marginTop: 'var(--spacing-3)' 
          }}>
            {['dine_in', 'takeaway', 'delivery'].map(type => (
              <button
                key={type}
                onClick={() => cart.setOrderType(type)}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-2)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: cart.orderType === type 
                    ? 'white' 
                    : 'rgba(255,255,255,0.2)',
                  color: cart.orderType === type 
                    ? 'var(--primary-700)' 
                    : 'white',
                }}
              >
                {type.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Table Number (for dine-in) */}
          {cart.orderType === 'dine_in' && (
            <input
              type="text"
              className="input"
              placeholder="Table Number"
              value={cart.tableNumber}
              onChange={(e) => cart.setTableNumber(e.target.value)}
              style={{ marginTop: 'var(--spacing-2)' }}
            />
          )}

          {/* Customer Name input for Takeaway/Delivery for better Hold Order tracking */}
          {(cart.orderType === 'takeaway' || cart.orderType === 'delivery') && (
             <input
              type="text"
              className="input"
              placeholder="Customer Name"
              value={cart.customerName}
              onChange={(e) => cart.setCustomerName(e.target.value)}
              style={{ marginTop: 'var(--spacing-2)' }}
            />
          )}
          
          {/* Order Notes / Special Comments */}
          <textarea
            className="input"
            placeholder="Order notes (e.g., Special delivery instructions, allergies...)"
            value={cart.notes}
            onChange={(e) => cart.setNotes(e.target.value)}
            rows={2}
            style={{ marginTop: 'var(--spacing-2)', resize: 'none' }}
          />
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.items.length > 0 ? (
            cart.items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {item.name}
                    {item.variant && <span className="text-xs text-muted"> ({item.variant.name})</span>}
                  </div>
                  {item.addons && item.addons.length > 0 && (
                     <div className="text-xs text-muted" style={{ lineHeight: 1.2 }}>
                       + {item.addons.map(a => a.name).join(', ')}
                     </div>
                  )}
                  {item.specialInstructions && (
                    <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                      Note: {item.specialInstructions}
                    </div>
                  )}
                  <div className="cart-item-price">₹{item.unitPrice.toFixed(2)} each</div>
                </div>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button 
                    className="quantity-btn"
                    onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ 
                  minWidth: '70px', 
                  textAlign: 'right', 
                  fontWeight: 600,
                  color: 'var(--gray-900)'
                }}>
                  ₹{(item.unitPrice * item.quantity).toFixed(2)}
                </div>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => cart.removeItem(item.id)}
                  style={{ color: 'var(--error-500)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <p className="empty-state-title">Cart is empty</p>
              <p className="text-sm text-muted">Add items from the menu</p>
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>₹{cart.getSubtotal().toFixed(2)}</span>
              </div>
              <div className="cart-total-row">
                <span>Tax</span>
                <span>₹{cart.getTax().toFixed(2)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="cart-total-row" style={{ color: 'var(--success-600)' }}>
                  <span>Discount</span>
                  <span>-₹{cart.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="cart-total-row grand-total">
                <span>Total</span>
                <span>₹{cart.getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-2)' }}>
               {/* Hold / Clear Buttons */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => cart.clearCart()}
                  >
                    Clear
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={handleHoldOrder}
                    style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}
                  >
                    <PauseCircle size={16} /> Hold
                  </button>
               </div>
               
               {/* Pay Button */}
              <button 
                className="btn btn-success btn-lg"
                style={{ height: '100%', flexDirection: 'column', gap: '4px' }}
                onClick={handleCheckout}
              >
                <CreditCard size={24} />
                <span style={{ fontSize: '1.2em', fontWeight: 700 }}>PAY ₹{cart.getTotal().toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add-on Selection Modal */}
      {showAddonModal && selectedItemForAddon && (
        <AddonSelectionModal
          item={selectedItemForAddon}
          onClose={() => {
            setShowAddonModal(false);
            setSelectedItemForAddon(null);
          }}
          onAddToCart={(item, quantity, notes, variant, addons) => {
            cart.addItem(item, quantity, notes, variant, addons);
            setShowAddonModal(false);
            setSelectedItemForAddon(null);
          }}
        />
      )}

      {/* Held Orders Modal */}
      {showHeldOrders && (
        <HeldOrdersModal
          orders={heldOrders}
          onClose={() => setShowHeldOrders(false)}
          onResume={handleResumeOrder}
        />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={cart.getTotal()}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            loadData(); // Refresh menu
          }}
          userId={user.id}
        />
      )}
    </div>
  );
};

// Addon Selection Modal Component
const AddonSelectionModal = ({ item, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(item.parsedVariants.length > 0 ? item.parsedVariants[0] : null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [notes, setNotes] = useState('');

  const calculateTotal = () => {
    let total = selectedVariant ? parseFloat(selectedVariant.price) : item.price;
    selectedAddons.forEach(addon => {
      total += parseFloat(addon.price);
    });
    return total * quantity;
  };

  const toggleAddon = (addon) => {
    if (selectedAddons.some(a => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{item.name}</h3>
            <p className="text-muted text-sm">{item.description}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Variants */}
          {item.parsedVariants.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Size / Variant</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {item.parsedVariants.map((variant, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', border: selectedVariant === variant ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)', cursor: 'pointer', background: selectedVariant === variant ? 'var(--primary-50)' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="variant" 
                        checked={selectedVariant === variant}
                        onChange={() => setSelectedVariant(variant)}
                      />
                      <span className="font-medium">{variant.name}</span>
                    </div>
                    <span className="font-semibold">₹{parseFloat(variant.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {item.parsedAddons.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Add-ons</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {item.parsedAddons.map((addon, idx) => {
                  const isSelected = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)', cursor: 'pointer', background: isSelected ? 'var(--primary-50)' : 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleAddon(addon)}
                        />
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="font-medium">{addon.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                               {addon.type === 'veg' ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                               <span className="text-gray-500">{addon.type === 'veg' ? 'Veg' : 'Non-Veg'}</span>
                            </div>
                         </div>
                      </div>
                      <span className="font-semibold">+₹{parseFloat(addon.price).toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Special Notes</h4>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Less spicy, Extra sauce..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Quantity */}
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '16px 0' }}>
              <button 
                className="btn btn-secondary btn-icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={20} />
              </button>
              <span style={{ fontSize: '1.5em', fontWeight: 600, width: '40px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button 
                className="btn btn-secondary btn-icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={20} />
              </button>
           </div>
        </div>

        <div className="modal-footer">
           <button 
            className="btn btn-primary btn-lg w-full" 
            style={{ justifyContent: 'space-between' }}
            onClick={() => onAddToCart(item, quantity, notes, selectedVariant, selectedAddons)}
           >
             <span>Add {quantity} to Order</span>
             <span>₹{calculateTotal().toFixed(2)}</span>
           </button>
        </div>
      </div>
    </div>
  );
};

// Held Orders Modal
const HeldOrdersModal = ({ orders, onClose, onResume }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
           <h3 className="modal-title">Held Orders</h3>
           <button className="btn btn-ghost btn-icon" onClick={onClose}>
             <X size={20} />
           </button>
        </div>
        
        <div className="modal-body" style={{ overflowY: 'auto' }}>
           {orders.length === 0 ? (
             <div className="empty-state">
                <Clock size={48} className="text-gray-300" />
                <p>No held orders found</p>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map(order => (
                   <div key={order.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                      <div>
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <span className="badge badge-warning">#{order.order_number}</span>
                            <span className="font-bold">{order.order_type.toUpperCase()}</span>
                            {order.table_number && <span className="text-gray-600">Table: {order.table_number}</span>}
                         </div>
                         <div className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                         </div>
                         {order.customer_name && (
                            <div className="font-medium mt-1">Customer: {order.customer_name}</div>
                         )}
                         <div className="text-sm text-gray-400 mt-1">
                            {order.items ? order.items.length : 0} items
                         </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                         <div className="text-xl font-bold text-primary-600 mb-2">₹{order.total_amount.toFixed(2)}</div>
                         <button 
                           className="btn btn-primary"
                           onClick={() => onResume(order)}
                         >
                            <PlayCircle size={16} /> Resume
                         </button>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};



// Bill Preview Modal Component
const BillPreviewModal = ({ order, onClose, onPrint }) => {
  if (!order) return null;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1001 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ 
        maxWidth: '400px', 
        background: '#fff',
        fontFamily: 'monospace'
      }}>
        <div className="modal-header">
          <h3 className="modal-title">Bill Preview</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {/* Bill Content */}
          <div style={{ 
            background: '#fafafa', 
            padding: 'var(--spacing-4)', 
            border: '1px dashed var(--gray-300)',
            margin: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '4px' }}>
                Restaurant POS
              </h3>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-600)' }}>
                {formatDate(order.created_at)}
              </div>
            </div>

            <div style={{ 
              borderTop: '1px dashed var(--gray-400)', 
              borderBottom: '1px dashed var(--gray-400)',
              padding: 'var(--spacing-2) 0',
              marginBottom: 'var(--spacing-2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span>Bill No:</span>
                <strong>#{order.order_number}</strong>
              </div>
              {order.table_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Table:</span>
                  <span>{order.table_number}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span>Type:</span>
                <span>{order.order_type?.replace('_', ' ').toUpperCase()}</span>
              </div>
              {order.customer_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Customer:</span>
                  <span>{order.customer_name}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div style={{ marginBottom: 'var(--spacing-2)' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontWeight: 600,
                fontSize: 'var(--font-size-xs)',
                borderBottom: '1px solid var(--gray-300)',
                paddingBottom: '4px',
                marginBottom: '4px'
              }}>
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-sm)',
                  padding: '2px 0'
                }}>
                  <span style={{ flex: 2 }}>{item.item_name}</span>
                  <span style={{ flex: 0.5, textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>₹{(item.item_total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ 
              borderTop: '1px dashed var(--gray-400)',
              paddingTop: 'var(--spacing-2)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{(order.subtotal || 0).toFixed(2)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax:</span>
                  <span>₹{(order.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-600)' }}>
                  <span>Discount:</span>
                  <span>-₹{(order.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: 'var(--font-size-lg)',
                marginTop: 'var(--spacing-2)',
                paddingTop: 'var(--spacing-2)',
                borderTop: '2px solid var(--gray-900)'
              }}>
                <span>TOTAL:</span>
                <span>₹{(order.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            {order.payment_method && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: 'var(--spacing-3)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--gray-600)'
              }}>
                Paid via {order.payment_method.toUpperCase()}
              </div>
            )}

            {/* Footer */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: 'var(--spacing-3)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--gray-500)'
            }}>
              Thank you for dining with us!
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onPrint}>
            <Printer size={18} />
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Modal Component with Customer Info Step
const PaymentModal = ({ total, onClose, onSuccess, userId }) => {
  const [step, setStep] = useState('customer'); // 'customer', 'payment', or 'cash'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  
  // Change calculator state
  const [amountReceived, setAmountReceived] = useState('');
  const [changeToReturn, setChangeToReturn] = useState(0);
  
  // Customer history state
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const cart = useCartStore();

  // Lookup customer history when phone number changes
  const lookupCustomerHistory = async (phone) => {
    if (!phone || phone.length < 10) {
      setCustomerHistory([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      const orders = await window.electronAPI.invoke('order:getByPhone', { phone });
      setCustomerHistory(orders || []);
    } catch (error) {
      console.error('Failed to load customer history:', error);
      setCustomerHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculate change when amount received changes
  const handleAmountChange = (value) => {
    setAmountReceived(value);
    const received = parseFloat(value) || 0;
    const change = received - total;
    setChangeToReturn(change >= 0 ? change : 0);
  };

  const handleProceedToPayment = () => {
    // Update cart with customer info
    cart.setCustomerName(customerName);
    cart.setCustomerPhone(customerPhone);
    setStep('payment');
  };
  
  const handleCashPayment = () => {
    setPaymentMethod('cash');
    setAmountReceived('');
    setChangeToReturn(0);
    setStep('cash');
  };
  
  const handleConfirmCashPayment = () => {
    const received = parseFloat(amountReceived) || 0;
    if (received < total) {
      alert('Insufficient amount received');
      return;
    }
    handlePayment('cash');
  };

  const handlePayment = async (method) => {
    setPaymentMethod(method);
    setIsProcessing(true);

    try {
      // Create order
      const result = await cart.createOrder(userId);

      if (result.success) {
        // Get the full order details
        const order = await window.electronAPI.invoke('order:getById', { id: result.id });

        // 1. Print KOT to Kitchen immediately when order is placed
        console.log('Printing KOT to kitchen...');
        await window.electronAPI.invoke('print:kot', { 
          order: order,
          items: order.items 
        });

        // 2. Complete the order with payment method
        await window.electronAPI.invoke('order:complete', {
          id: result.id,
          paymentMethod: method,
        });

        // 3. Refresh order with payment info and print Receipt to customer
        const completedOrder = await window.electronAPI.invoke('order:getById', { id: result.id });
        console.log('Printing receipt to customer...');
        await window.electronAPI.invoke('print:receipt', { order: completedOrder });

        setOrderId(result.id);
        setOrderNumber(result.orderNumber);
        setOrderComplete(true);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // View Bill handler
  const handleViewBill = async () => {
    try {
      const order = await window.electronAPI.invoke('order:getById', { id: orderId });
      setViewingOrder(order);
      setShowBillPreview(true);
    } catch (error) {
      console.error('Failed to load order:', error);
      alert('Failed to load bill: ' + error.message);
    }
  };

  // Reprint Bill handler
  const handleReprintBill = async () => {
    try {
      const order = await window.electronAPI.invoke('order:getById', { id: orderId });
      await window.electronAPI.invoke('print:receipt', { order });
      alert('Bill reprinted successfully!');
    } catch (error) {
      console.error('Failed to print:', error);
      alert('Failed to print: ' + error.message);
    }
  };

  if (orderComplete) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center', padding: 'var(--spacing-8)', maxWidth: '400px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--success-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--spacing-4)',
          }}>
            <Check size={40} style={{ color: 'var(--success-500)' }} />
          </div>
          <h2 style={{ marginBottom: 'var(--spacing-2)' }}>Order Complete!</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-2)' }}>
            Order #{orderNumber} has been placed successfully.
          </p>
          <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-4)' }}>
            KOT sent to kitchen • Receipt printed
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={handleViewBill}
            >
              <FileText size={18} />
              View Bill
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={handleReprintBill}
            >
              <Printer size={18} />
              Reprint
            </button>
          </div>
          
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={onSuccess}>
            New Order
          </button>
        </div>

        {/* Bill Preview Modal */}
        {showBillPreview && viewingOrder && (
          <BillPreviewModal 
            order={viewingOrder} 
            onClose={() => setShowBillPreview(false)}
            onPrint={handleReprintBill}
          />
        )}
      </div>
    );
  }

  // Customer Info Step
  if (step === 'customer') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Customer Information</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-3)',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-4)',
            }}>
              <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
                Total Amount
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 700, 
                color: 'var(--primary-600)' 
              }}>
                ₹{total.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label">Customer Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={(e) => lookupCustomerHistory(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email (Optional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="Enter email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              {/* Customer History */}
              {customerHistory.length > 0 && (
                <div style={{
                  padding: 'var(--spacing-3)',
                  background: 'var(--primary-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--primary-200)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-2)'
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                      Returning Customer! ({customerHistory.length} orders)
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                    Last order: #{customerHistory[0].order_number} - ₹{customerHistory[0].total_amount.toFixed(2)} ({new Date(customerHistory[0].created_at).toLocaleDateString()})
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              onClick={handleProceedToPayment}
              disabled={!customerName.trim() || !customerPhone.trim()}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  if (step === 'cash') {
    return (
      <div className="modal-overlay" onClick={() => setStep('payment')}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Cash Payment</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setStep('payment')}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-4)',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-4)',
            }}>
              <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
                Total Amount Due
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-4xl)', 
                fontWeight: 700, 
                color: 'var(--primary-600)' 
              }}>
                ₹{total.toFixed(2)}
              </div>
            </div>

            {/* Amount Received Input */}
            <div style={{ marginBottom: 'var(--spacing-4)' }}>
              <label className="label">Amount Received</label>
              <input
                type="number"
                className="input"
                placeholder="Enter amount received"
                value={amountReceived}
                onChange={(e) => handleAmountChange(e.target.value)}
                style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center', fontWeight: 600 }}
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: 'var(--spacing-2)',
              marginBottom: 'var(--spacing-4)'
            }}>
              {[Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500].map((amount) => (
                <button
                  key={amount}
                  className="btn btn-secondary"
                  onClick={() => handleAmountChange(amount.toString())}
                  style={{ padding: 'var(--spacing-2)' }}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            {/* Change to Return */}
            {parseFloat(amountReceived) >= total && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-4)',
                background: 'var(--success-50)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--success-200)',
              }}>
                <div style={{ color: 'var(--success-700)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-1)' }}>
                  Change to Return
                </div>
                <div style={{ 
                  fontSize: 'var(--font-size-3xl)', 
                  fontWeight: 700, 
                  color: 'var(--success-600)' 
                }}>
                  ₹{changeToReturn.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            <button className="btn btn-secondary" onClick={() => setStep('payment')}>
              Back
            </button>
            <button 
              className="btn btn-success" 
              style={{ flex: 1 }}
              onClick={handleConfirmCashPayment}
              disabled={isProcessing || !amountReceived || parseFloat(amountReceived) < total}
            >
              {isProcessing ? 'Processing...' : `Confirm Payment`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Method Selection Step
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Payment</h3>
          <button className="btn btn-ghost btn-icon" onClick={() => setStep('customer')}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-4)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--spacing-4)',
          }}>
            <div style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)' }}>
              {customerName} • {customerPhone}
            </div>
            <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-1)' }}>
              Total Amount
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-4xl)', 
              fontWeight: 700, 
              color: 'var(--primary-600)' 
            }}>
              ₹{total.toFixed(2)}
            </div>
          </div>

          <p style={{ 
            textAlign: 'center', 
            marginBottom: 'var(--spacing-4)',
            color: 'var(--gray-600)'
          }}>
            Select payment method
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <button
              className="btn btn-lg"
              style={{
                background: 'var(--success-50)',
                color: 'var(--success-700)',
                border: '2px solid var(--success-200)',
                justifyContent: 'flex-start',
                padding: 'var(--spacing-4)',
              }}
              onClick={handleCashPayment}
              disabled={isProcessing}
            >
              <Banknote size={24} />
              <span style={{ flex: 1, textAlign: 'left', marginLeft: 'var(--spacing-3)' }}>
                Cash
              </span>
            </button>

            <button
              className="btn btn-lg"
              style={{
                background: 'var(--primary-50)',
                color: 'var(--primary-700)',
                border: '2px solid var(--primary-200)',
                justifyContent: 'flex-start',
                padding: 'var(--spacing-4)',
              }}
              onClick={() => handlePayment('card')}
              disabled={isProcessing}
            >
              <CreditCard size={24} />
              <span style={{ flex: 1, textAlign: 'left', marginLeft: 'var(--spacing-3)' }}>
                Card
              </span>
            </button>

            <button
              className="btn btn-lg"
              style={{
                background: 'var(--secondary-50)',
                color: 'var(--secondary-700)',
                border: '2px solid var(--secondary-200)',
                justifyContent: 'flex-start',
                padding: 'var(--spacing-4)',
              }}
              onClick={() => handlePayment('upi')}
              disabled={isProcessing}
            >
              <Smartphone size={24} />
              <span style={{ flex: 1, textAlign: 'left', marginLeft: 'var(--spacing-3)' }}>
                UPI
              </span>
            </button>
          </div>

          {isProcessing && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginTop: 'var(--spacing-4)',
              gap: 'var(--spacing-2)'
            }}>
              <div className="loading-spinner" style={{ width: '24px', height: '24px' }} />
              <span>Processing payment...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSPage;
