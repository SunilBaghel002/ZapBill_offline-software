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
  Leaf
} from 'lucide-react';

const POSPage = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();
  const cart = useCartStore();

  // Load categories and menu items
  useEffect(() => {
    loadData();
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

  // Filter menu items by category and search
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.is_available;
  });

  const handleAddToCart = (item) => {
    cart.addItem(item);
  };

  const handleCheckout = () => {
    if (cart.items.length > 0) {
      setShowPayment(true);
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
                  className={`menu-item-card ${item.is_vegetarian ? 'vegetarian' : ''}`}
                  onClick={() => handleAddToCart(item)}
                >
                  {item.is_vegetarian && (
                    <Leaf 
                      size={14} 
                      style={{ 
                        color: 'var(--success-500)', 
                        position: 'absolute',
                        top: '8px',
                        right: '8px'
                      }} 
                    />
                  )}
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
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {cart.getItemCount()} items
            </span>
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
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.items.length > 0 ? (
            cart.items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
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

            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => cart.clearCart()}
              >
                Clear
              </button>
              <button 
                className="btn btn-success btn-lg"
                style={{ flex: 1 }}
                onClick={handleCheckout}
              >
                <CreditCard size={18} />
                Pay ₹{cart.getTotal().toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </div>

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

// Payment Modal Component
const PaymentModal = ({ total, onClose, onSuccess, userId }) => {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  const cart = useCartStore();

  const handlePayment = async (method) => {
    setPaymentMethod(method);
    setIsProcessing(true);

    try {
      // Create order
      const result = await cart.createOrder(userId);

      if (result.success) {
        // Complete the order with payment method
        await window.electronAPI.invoke('order:complete', {
          id: result.id,
          paymentMethod: method,
        });

        // Print receipt
        const order = await window.electronAPI.invoke('order:getById', { id: result.id });
        await window.electronAPI.invoke('print:receipt', { order });

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

  if (orderComplete) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
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
          <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-4)' }}>
            Order #{orderNumber} has been placed successfully.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onSuccess}>
            New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Payment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-4)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--spacing-6)',
          }}>
            <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
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
              onClick={() => handlePayment('cash')}
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
