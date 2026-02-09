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
  Clock,
  User,
  RefreshCw,
  Keyboard,
  Split,
  ClipboardList,
  Pizza,
  Coffee,
  IceCream,
  Sandwich,
  Soup,
  Percent,
  Save,
  ChefHat,
  Carrot,
  Beef,
  Cake,
  Beer,
  Wine,
  Utensils,
  Menu,
  ChevronDown
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
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  
  // Strict Design Match State
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showBillSheet, setShowBillSheet] = useState(false);

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

  const handleNewOrder = () => {
    if (cart.items.length > 0) {
      if (window.confirm('Clear current order?')) {
        cart.clearCart();
      }
    } else {
      cart.clearCart();
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

  // KOT Only - Send to kitchen without completing order
  const handleKOTOnly = async () => {
    if (cart.items.length === 0) return;
    
    try {
      // Create a temporary order object for KOT
      const kotOrder = {
        order_type: cart.orderType,
        table_number: cart.tableNumber,
        customer_name: cart.customerName,
        notes: cart.notes,
        items: cart.items.map(item => ({
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          special_instructions: item.specialInstructions,
          variant: item.variant,
          addons: item.addons
        }))
      };
      
      await window.electronAPI.invoke('print:kot', { 
        order: kotOrder,
        items: kotOrder.items 
      });
      
      alert('KOT sent to kitchen!');
    } catch (error) {
      console.error('KOT print error:', error);
      alert('Error sending KOT: ' + error.message);
    }
  };

  // KOT & Print - Send to kitchen and print receipt preview
  const handleKOTAndPrint = async () => {
    if (cart.items.length === 0) return;
    
    try {
      // Create order first
      const result = await cart.createOrder(user?.id);
      
      if (result.success) {
        const order = await window.electronAPI.invoke('order:getById', { id: result.id });
        
        // Print KOT
        await window.electronAPI.invoke('print:kot', { 
          order: order,
          items: order.items 
        });
        
        // Print Receipt
        await window.electronAPI.invoke('print:receipt', { order: order });
        
        alert(`Order #${result.orderNumber} placed! KOT & Receipt printed.`);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('KOT & Print error:', error);
      alert('Error: ' + error.message);
    }
  };

  // Save & Print - Complete order and print receipt
  const handleSaveAndPrint = async () => {
    if (cart.items.length === 0) return;
    
    try {
      const result = await cart.createOrder(user?.id);
      
      if (result.success) {
        const order = await window.electronAPI.invoke('order:getById', { id: result.id });
        
        // Complete order with selected payment method
        await window.electronAPI.invoke('order:complete', {
          id: result.id,
          paymentMethod: cart.paymentMethod,
        });
        
        // Print Receipt
        await window.electronAPI.invoke('print:receipt', { order: order });
        
        alert(`Order #${result.orderNumber} completed! Receipt printed.`);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Save & Print error:', error);
      alert('Error: ' + error.message);
    }
  };

  const calculateTotal = () => {
    return cart.getTotal();
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
    <div className="pos-fullscreen">
      {/* Header Bar */}
      <div className="pos-header-bar">
        <div className="pos-header-left">
          <button className="pos-header-btn" style={{ border: 'none', padding: 0 }}>
             <Menu size={24} color="#37474F" />
          </button>
          <div className="pos-logo-text">PetPooja</div>
          <button className="pos-new-order-btn" onClick={handleNewOrder}>
            New Order
          </button>
        </div>
        
        <div className="pos-search-wrapper">
          <div className="pos-search-box">
             <Search size={18} color="#90A4AE" />
             <input 
               type="text" 
               placeholder="Search item" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="pos-search-box" style={{ maxWidth: '150px' }}>
             <input type="text" placeholder="Short Code" />
          </div>
        </div>

        <div className="pos-header-right">
          <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '10px' }}>
             <span style={{ fontSize: '10px', color: '#666' }}>Call For Support</span>
             <span style={{ fontWeight: 'bold', fontSize: '12px' }}>9099912483</span>
          </div>
          <button className="pos-header-btn" title="Sync"><RefreshCw size={20} /></button>
          <button className="pos-header-btn"><Keyboard size={20} /></button>
          <button className="pos-header-btn"><User size={20} /></button>
        </div>
      </div>

      {/* Main Body */}
      <div className="pos-main-body">
        
        {/* Left Section: Categories & Menu */}
        <div className="pos-left-panel">
          {/* Category Sidebar */}
          <div className="pos-category-sidebar">
            <div 
                className={`pos-category-item ${!selectedCategory ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
            >
                <div className="pos-category-icon-wrapper" style={{ marginBottom: '4px' }}>
                  <ClipboardList size={24} />
                </div>
                <span>All Items</span>
            </div>
            {categories.map((category, index) => {
              // Helper to get icon based on category name
              const getIcon = (name) => {
                const n = name.toLowerCase();
                if (n.includes('pizza')) return <Pizza size={24} />;
                if (n.includes('coffee') || n.includes('tea') || n.includes('beverage')) return <Coffee size={24} />;
                if (n.includes('ice') || n.includes('dessert')) return <IceCream size={24} />;
                if (n.includes('sandwich') || n.includes('burger')) return <Sandwich size={24} />;
                if (n.includes('soup')) return <Soup size={24} />;
                if (n.includes('veg') || n.includes('salad')) return <Carrot size={24} />;
                if (n.includes('chicken') || n.includes('beef') || n.includes('meat')) return <Beef size={24} />;
                if (n.includes('cake') || n.includes('pastry')) return <Cake size={24} />;
                if (n.includes('beer') || n.includes('alcohol')) return <Beer size={24} />;
                return <Utensils size={24} />;
              };

              return (
                <div 
                  key={category.id}
                  className={`pos-category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="pos-category-icon-wrapper" style={{ marginBottom: '4px' }}>
                    {getIcon(category.name)}
                  </div>
                  <span>{category.name}</span>
                </div>
              );
            })}
          </div>

          {/* Menu Grid Area */}
          <div className="pos-menu-area">
            <div className="pos-menu-grid">
              {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <div key={item.id} className={`pos-menu-card ${item.is_vegetarian ? 'veg' : 'nonveg'}`} onClick={() => handleAddToCart(item)}>
                      <div className="pos-menu-card-inner">
                        <span className="pos-menu-card-name">{item.name}</span>
                        <span className="pos-menu-card-price">₹{item.price.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
              ) : (
                    <div className="pos-empty-state" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--gray-400)' }}>
                      <div style={{ background: 'var(--gray-100)', padding: '20px', borderRadius: '50%', marginBottom: '16px' }}>
                        <UtensilsCrossed size={48} style={{ opacity: 0.5 }} />
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '4px' }}>No Items Found</h3>
                      <p>Try selecting a different category or search term</p>
                    </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Cart Panel */}
        <div className="pos-cart-panel">
          {/* Order Type Tabs - Moved Inside Cart Panel */}
          <div className="pos-cart-header-tabs">
            <button 
              className={`pos-order-type-tab ${cart.orderType === 'dine_in' ? 'active dine-in' : ''}`}
              onClick={() => cart.setOrderType('dine_in')}
            >
              Dine In
            </button>
            <button 
              className={`pos-order-type-tab ${cart.orderType === 'delivery' ? 'active delivery' : ''}`}
              onClick={() => cart.setOrderType('delivery')}
            >
              Delivery
            </button>
            <button 
              className={`pos-order-type-tab ${cart.orderType === 'takeaway' ? 'active pickup' : ''}`}
              onClick={() => cart.setOrderType('takeaway')}
            >
              Pick Up
            </button>
          </div>

          {/* Customer Info Section - Icon Bar */}
          <div className="pos-customer-bar" style={{ display: 'flex', background: '#ECEFF1', borderBottom: '1px solid #CFD8DC' }}>
             <div style={{ display: 'flex', gap: '1px', flex: 1 }}>
                <button className="pos-header-btn" style={{ flex: 1, height: '40px', background: 'white', border: '1px solid #CFD8DC' }} title="Table"><Plus size={18} /> T1</button>
                <button 
                  className={`pos-header-btn ${showCustomerForm ? 'active' : ''}`}
                  style={{ flex: 1, background: showCustomerForm ? '#E0F7FA' : 'white', border: '1px solid #CFD8DC' }} 
                  title="Customer"
                  onClick={() => setShowCustomerForm(!showCustomerForm)}
                >
                  <User size={18} />
                </button>
                <button className="pos-header-btn" style={{ flex: 1, background: 'white', border: '1px solid #CFD8DC' }} title="Waiter"><User size={18} /></button>
                <button className="pos-header-btn" style={{ flex: 1, background: 'white', border: '1px solid #CFD8DC' }} title="Notes"><FileText size={18} /></button>
             </div>
             <div style={{ width: '80px', background: '#FFC107', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                Outdoor
             </div>
          </div>

          {/* User Info Form - Inline Slide Down */}
          {showCustomerForm && (
          <div className="pos-user-info-form" style={{ background: 'white', padding: '8px 12px', borderBottom: '1px solid #CFD8DC', fontSize: '13px', animation: 'slideDown 0.2s ease-out' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                    <label style={{ color: '#546E7A', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Mobile:</label>
                    <div style={{ display: 'flex' }}>
                        <input 
                          type="text" 
                          placeholder="Mobile No"
                          value={cart.customerPhone || ''}
                          onChange={(e) => cart.setCustomerPhone(e.target.value)}
                          style={{ border: '1px solid #CFD8DC', borderRadius: '2px 0 0 2px', padding: '6px 8px', fontSize: '13px', outline: 'none', flex: 1, borderRight: 'none' }}
                        />
                        <button 
                          onClick={() => setShowHistoryDrawer(true)}
                          style={{ background: '#ECEFF1', border: '1px solid #CFD8DC', padding: '0 8px', cursor: 'pointer' }}
                          title="Customer History"
                        >
                           <Clock size={14} color="#546E7A" />
                        </button>
                    </div>
                </div>
                <div>
                    <label style={{ color: '#546E7A', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Name:</label>
                    <input 
                      type="text" 
                      placeholder="Customer Name"
                      value={cart.customerName || ''}
                      onChange={(e) => cart.setCustomerName(e.target.value)}
                      style={{ border: '1px solid #CFD8DC', borderRadius: '2px', padding: '6px 8px', fontSize: '13px', outline: 'none', width: '100%' }}
                    />
                </div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="pos-input-group">
                    <label style={{ color: '#546E7A', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Address:</label>
                    <input 
                      type="text" 
                      placeholder="Address"
                      style={{ border: '1px solid #CFD8DC', borderRadius: '2px', padding: '6px 8px', fontSize: '13px', outline: 'none', width: '100%' }}
                    />
                </div>
                <div className="pos-input-group">
                    <label style={{ color: '#546E7A', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Locality:</label>
                    <input 
                      type="text" 
                      placeholder="Locality"
                      style={{ border: '1px solid #CFD8DC', borderRadius: '2px', padding: '6px 8px', fontSize: '13px', outline: 'none', width: '100%' }}
                    />
                </div>
             </div>
          </div>
          )}

          <div className="pos-cart-table-header">
             <span>ITEMS</span>
             <span style={{ paddingLeft: '8px' }}>QTY.</span>
             <span style={{ textAlign: 'right' }}>PRICE</span>
          </div>

          {/* Cart Items List */}
          <div className="pos-cart-items">
            {cart.items.length === 0 ? (
              <div className="pos-cart-empty">
                <ShoppingCart size={48} />
                <p>Cart is Empty</p>
              </div>
            ) : (
              cart.items.map(item => (
                <div key={item.id} className="pos-cart-item">
                  <div className="pos-cart-item-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <button className="pos-cart-item-remove" onClick={() => cart.removeItem(item.id)}>
                         <X size={14} style={{ background: '#D32F2F', borderRadius: '50%', color: 'white', padding: '2px' }} />
                       </button>
                       <span className="pos-cart-item-name">{item.name}</span>
                    </div>
                    {item.addons && item.addons.length > 0 && (
                      <div className="pos-cart-item-addons">
                        {item.addons.map(a => a.name).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="pos-cart-qty-ctrl">
                    <button className="pos-cart-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <div className="pos-cart-qty-val">{item.quantity}</div>
                    <button className="pos-cart-qty-btn" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>

                  <div className="pos-cart-item-price" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{(item.unitPrice * item.quantity).toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{item.unitPrice.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Total & Actions */}
          <div className="pos-cart-footer">
             {/* Billing Breakdown */}
             <div className="pos-billing-section">
               <div className="pos-billing-ctrl-row">
                 <button 
                   className="pos-toggle-btn"
                   onClick={() => setShowDiscountModal(true)}
                   style={{ color: '#1565C0', borderColor: '#90CAF9', background: '#E3F2FD' }}
                 >
                   <Percent size={14} /> Discount
                 </button>
                 
                 <label className={`pos-toggle-btn ${cart.isComplimentary ? 'active' : ''}`}>
                   <input 
                     type="checkbox" 
                     checked={cart.isComplimentary}
                     onChange={(e) => cart.setIsComplimentary(e.target.checked)}
                   />
                   <span>Complimentary</span>
                 </label>

                 <label className={`pos-toggle-btn ${cart.isSalesReturn ? 'active' : ''}`}>
                   <input 
                     type="checkbox" 
                     checked={cart.isSalesReturn}
                     onChange={(e) => cart.setIsSalesReturn(e.target.checked)}
                   />
                   <span>Return</span>
                 </label>
               </div>

               {/* Breakdown */}
               <div className="pos-billing-row">
                  <span>Subtotal</span>
                  <span>₹{cart.getSubtotal().toFixed(2)}</span>
               </div>
               
               {/* Discount if applied */}
               {cart.getDiscountAmount() > 0 && (
                 <div className="pos-billing-row" style={{ color: '#43A047' }}>
                    <span>Discount ({cart.discountType === 'percentage' ? `${cart.discountValue}%` : 'Flat'})</span>
                    <span>-₹{cart.getDiscountAmount().toFixed(2)}</span>
                 </div>
               )}

               {/* Metadata for Taxes */}
               <div className="pos-billing-row">
                  <span>CGST (2.5%)</span>
                  <span>₹{cart.getTaxBreakdown().cgst.toFixed(2)}</span>
               </div>
               <div className="pos-billing-row">
                  <span>SGST (2.5%)</span>
                  <span>₹{cart.getTaxBreakdown().sgst.toFixed(2)}</span>
               </div>

               {/* Service Charge */}
               {cart.getServiceCharge() > 0 && (
                 <div className="pos-billing-row">
                    <span>Service Charge ({cart.serviceChargePercent}%)</span>
                    <span>₹{cart.getServiceCharge().toFixed(2)}</span>
                 </div>
               )}

               {/* Total */}
               <div className="pos-billing-row total-row">
                  <span>Total Payable</span>
                  <span style={{ fontSize: '20px', color: '#D32F2F' }}>₹{cart.getGrandTotal().toFixed(2)}</span>
                  <button 
                    onClick={() => setShowBillSheet(true)}
                    style={{ background: '#ECEFF1', border: '1px solid #CFD8DC', borderRadius: '4px', cursor: 'pointer', color: '#546E7A', padding: '4px', display: 'flex', alignItems: 'center', marginLeft: '8px' }}
                    title="View Breakdown"
                  >
                    <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} />
                  </button>
               </div>
             </div>

             {/* Footer Controls */}
             {/* Payment Modes Grid */}
             <div className="pos-payment-modes">
               {[
                 { id: 'cash', label: 'Cash', icon: Banknote },
                 { id: 'card', label: 'Card', icon: CreditCard },
                 { id: 'upi', label: 'UPI', icon: Smartphone },
                 { id: 'due', label: 'Due', icon: Clock },
                 { id: 'split', label: 'Split', icon: Split }
               ].map(mode => (
                 <button
                   key={mode.id}
                   className={`payment-mode-btn ${cart.paymentMethod === mode.id ? 'active' : ''}`}
                   onClick={() => cart.setPaymentMethod(mode.id)}
                 >
                   <mode.icon className="payment-mode-icon" size={20} />
                   <span className="payment-mode-label">{mode.label}</span>
                 </button>
               ))}
             </div>

             {/* Action Bar */}
             <div className="pos-action-bar">
               <button className="pos-action-btn btn-save" onClick={handleCheckout}>
                  <Save size={18} style={{ marginBottom: '4px' }} />
                  Save
               </button>
               <button className="pos-action-btn btn-print" onClick={handleSaveAndPrint}>
                  <Printer size={18} style={{ marginBottom: '4px' }} />
                  Print
               </button>
               <button className="pos-action-btn btn-kot" onClick={handleKOTOnly}>
                  <ChefHat size={18} style={{ marginBottom: '4px' }} />
                  KOT
               </button>
               <button className="pos-action-btn btn-kot-print" onClick={handleKOTAndPrint}>
                  <Printer size={18} style={{ marginBottom: '4px' }} />
                  KOT+Print
               </button>
               <button className="pos-action-btn btn-hold" onClick={handleHoldOrder}>
                  <PauseCircle size={18} style={{ marginBottom: '4px' }} />
                  Hold
               </button>
             </div>
          </div>
        </div>

      </div>

      {/* Modals */}
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
      
      {showHeldOrders && (
        <HeldOrdersModal
          orders={heldOrders}
          onClose={() => setShowHeldOrders(false)}
          onResume={handleResumeOrder}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={cart.getGrandTotal()}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            cart.clearCart();
            loadData(); 
          }}
          userId={user?.id}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <DiscountModal
          onClose={() => setShowDiscountModal(false)}
          onApply={(type, value, reason) => {
            cart.applyDiscount(type, value, reason);
            setShowDiscountModal(false);
          }}
          onClear={() => {
            cart.clearDiscount();
            setShowDiscountModal(false);
          }}
          currentType={cart.discountType}
          currentValue={cart.discountValue}
          subtotal={cart.getSubtotal()}
        />
      )}

      {/* Strict Design: Customer History Drawer */}
      <div className={`pos-drawer-overlay ${showHistoryDrawer ? 'active' : ''}`} onClick={() => setShowHistoryDrawer(false)}></div>
      <div className={`pos-right-drawer ${showHistoryDrawer ? 'active' : ''}`}>
          <div className="drawer-header" style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#37474F', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Customer History</h3>
              <button onClick={() => setShowHistoryDrawer(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div className="drawer-body" style={{ padding: '16px' }}>
              <div className="history-search">
                  <input type="text" placeholder="Search orders..." style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              <div className="history-list">
                  <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
                      <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} /><br/>
                      No history found for {cart.customerPhone || 'this customer'}
                  </p>
              </div>
          </div>
      </div>

      {/* Strict Design: Bill Breakdown Sheet */}
      <div className={`pos-sheet-overlay ${showBillSheet ? 'active' : ''}`} onClick={() => setShowBillSheet(false)}></div>
      <div className={`pos-bottom-sheet ${showBillSheet ? 'active' : ''}`}>
          <div className="sheet-header" style={{ padding: '12px 16px', background: '#37474F', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Bill Details</h3>
              <button onClick={() => setShowBillSheet(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronDown size={24} /></button>
          </div>
          <div className="sheet-body" style={{ padding: '20px', background: 'white' }}>
             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                <span>Subtotal</span>
                <span>₹{cart.getSubtotal().toFixed(2)}</span>
             </div>
             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                <span>Discount</span>
                <span>-₹{cart.discountValue || 0}</span>
             </div>
             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                <span>Taxes</span>
                <span>₹{cart.getTaxAmount().toFixed(2)}</span>
             </div>
             
             {/* Extra Fields as per design description */}
             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                <span>Container Charge</span>
                <span>₹0.00</span>
             </div>
             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                <span>Delivery Charge</span>
                <span>₹0.00</span>
             </div>

             <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #ddd', fontWeight: 'bold', fontSize: '20px', color: '#D32F2F' }}>
                <span>Grand Total</span>
                <span>₹{cart.getGrandTotal().toFixed(2)}</span>
             </div>
          </div>
      </div>

    </div>
  );
};

// Addon Selection Modal Component - Redesigned to match reference
const AddonSelectionModal = ({ item, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(item.parsedVariants.length > 0 ? item.parsedVariants[0] : null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonSearch, setAddonSearch] = useState('');

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

  // Filter addons by search
  const filteredAddons = item.parsedAddons.filter(addon =>
    addon.name.toLowerCase().includes(addonSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal addon-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="addon-modal-header">
          <div>
            <span className="addon-modal-title">{item.name}</span>
            <span className="addon-modal-price"> | ₹{(selectedVariant ? parseFloat(selectedVariant.price) : item.price).toFixed(2)}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Variant Tabs at Top */}
        {item.parsedVariants.length > 0 && (
          <div className="addon-variant-tabs">
            {item.parsedVariants.map((variant, idx) => (
              <button
                key={idx}
                className={`addon-variant-tab ${selectedVariant === variant ? 'active' : ''}`}
                onClick={() => setSelectedVariant(variant)}
              >
                <span className="addon-variant-tab-name">{variant.name}</span>
                <span className="addon-variant-tab-price">₹{parseFloat(variant.price).toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Addon Search */}
        {item.parsedAddons.length > 0 && (
          <div className="addon-search-box">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#90A4AE' }} />
              <input
                type="text"
                className="addon-search-input"
                placeholder="Search addon item..."
                value={addonSearch}
                onChange={(e) => setAddonSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Addon Groups */}
        <div className="addon-groups">
          {item.parsedAddons.length > 0 && (
            <div className="addon-group">
              <div className="addon-group-header">
                <span className="addon-group-name">
                  <span style={{ width: '4px', height: '16px', background: '#FF9800', borderRadius: '4px', display: 'inline-block' }}></span>
                  {selectedVariant?.name || 'Default'}
                </span>
                <span className="addon-group-info" style={{ fontSize: '12px', color: '#78909C' }}>Multiple Add-ons (Min: 0, Max: 7)</span>
              </div>
              <div className="addon-grid">
                {filteredAddons.map((addon, idx) => {
                  const isSelected = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <div
                      key={idx}
                      className={`addon-item ${addon.type !== 'veg' ? 'nonveg' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <span className="addon-item-name">{addon.name}</span>
                      <span className="addon-item-price">₹{parseFloat(addon.price).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state if no addons */}
          {item.parsedAddons.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              <p>No add-ons available for this item</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="addon-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-save"
            onClick={() => onAddToCart(item, quantity, '', selectedVariant, selectedAddons)}
          >
            Save
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
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
            borderRadius: 'var(--radius-md)',
            fontFamily: 'monospace' // Restore monospace for receipt look
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
        <div className="modal modal-sm" style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
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

            <button
              className="btn btn-lg"
              style={{
                background: '#FFF3E0',
                color: '#E65100',
                border: '2px solid #FFCC80',
                justifyContent: 'flex-start',
                padding: 'var(--spacing-4)',
              }}
              onClick={() => handlePayment('due')}
              disabled={isProcessing}
            >
              <Clock size={24} />
              <span style={{ flex: 1, textAlign: 'left', marginLeft: 'var(--spacing-3)' }}>
                Due / Credit
              </span>
              <span style={{ fontSize: '12px', color: '#F57C00' }}>Pay Later</span>
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

// Discount Modal Component
const DiscountModal = ({ onClose, onApply, onClear, currentType, currentValue, subtotal }) => {
  const [discountType, setDiscountType] = React.useState(currentType !== 'none' ? currentType : 'percentage');
  const [discountValue, setDiscountValue] = React.useState(currentValue || 0);
  const [reason, setReason] = React.useState('');

  const calculatePreview = () => {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '450px', height: 'auto', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: '#D32F2F', color: 'white' }}>
          <h3 className="modal-title" style={{ color: 'white', fontSize: '18px' }}>Apply Discount</h3>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Discount Type Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Discount Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDiscountType('percentage')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: discountType === 'percentage' ? '2px solid #D32F2F' : '1px solid #CFD8DC',
                  borderRadius: '8px',
                  background: discountType === 'percentage' ? '#FFEBEE' : 'white',
                  color: discountType === 'percentage' ? '#D32F2F' : '#546E7A',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountType('flat')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: discountType === 'flat' ? '2px solid #D32F2F' : '1px solid #CFD8DC',
                  borderRadius: '8px',
                  background: discountType === 'flat' ? '#FFEBEE' : 'white',
                  color: discountType === 'flat' ? '#D32F2F' : '#546E7A',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Flat Amount (₹)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label">
              {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'percentage' ? 'Enter percentage (e.g., 10)' : 'Enter amount (e.g., 50)'}
                className="input"
                style={{ fontSize: '18px', fontWeight: 'bold' }}
                min="0"
                max={discountType === 'percentage' ? 100 : subtotal}
                autoFocus
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#90A4AE', fontWeight: 'bold' }}>
                {discountType === 'percentage' ? '%' : '₹'}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Birthday discount, Loyalty reward"
              className="input"
            />
          </div>

          {/* Preview */}
          <div style={{ background: '#E8F5E9', padding: '16px', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32', fontWeight: '700', marginBottom: '8px' }}>
              <span>Discount Amount:</span>
              <span>-₹{calculatePreview().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#546E7A', fontSize: '14px', borderTop: '1px dashed #A5D6A7', paddingTop: '8px' }}>
              <span>New Total:</span>
              <span style={{ fontWeight: '600', color: '#37474F' }}>₹{(subtotal - calculatePreview()).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {currentType !== 'none' && (
            <button
              onClick={onClear}
              className="btn"
              style={{ border: '1px solid #FFCDD2', color: '#D32F2F', background: '#FFEBEE' }}
            >
              Clear
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(discountType, discountValue, reason)}
            disabled={discountValue <= 0}
            className="btn btn-primary"
            style={{ background: '#D32F2F', borderColor: '#D32F2F' }}
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSPage;
