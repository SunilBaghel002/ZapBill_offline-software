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
  ChevronDown,
  Edit2,
  AlertTriangle,
  UtensilsCrossed,
  MapPin,
  Star
} from 'lucide-react';
import MainSidebar from '../components/layout/MainSidebar';
import CustomAlert from '../components/ui/CustomAlert';
import '../styles/pos-sheet.css';

const CustomerHistoryModal = ({ isOpen, onClose, history, customerName, customerPhone }) => {
  if (!isOpen) return null;

  const maxOrderValue = history.length > 0 ? Math.max(...history.map(o => o.total_amount || 0)) : 0;
  const totalSpent = history.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const avgBill = history.length > 0 ? totalSpent / history.length : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end'
    }} onClick={onClose}>
      <div
        style={{
          background: 'white', width: '600px', height: '100%',
          display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
          animation: 'slideInRight 0.3s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Customer History</h3>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>{customerName || 'Unknown'} - {customerPhone}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#546E7A" /></button>
        </div>

        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0288d1' }}>{history.length}</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Order</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>₹{maxOrderValue.toFixed(0)}</div>
          </div>
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Order</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>₹{avgBill.toFixed(0)}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0', background: '#fff' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#90a4ae' }}>
              <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No order history found for this customer.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', color: '#546E7A', fontWeight: '600', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Order No</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Date</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Type</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Items</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Payment Type</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((order, idx) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#37474F' }}>#{order.order_number}</td>
                    <td style={{ padding: '12px', color: '#78909C' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: order.order_type === 'dine_in' ? '#E3F2FD' : order.order_type === 'delivery' ? '#FFF3E0' : '#E8F5E9',
                        color: order.order_type === 'dine_in' ? '#1565C0' : order.order_type === 'delivery' ? '#EF6C00' : '#2E7D32',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'capitalize'
                      }}>
                        {order.order_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#546E7A' }} title={order.items?.map(i => `${i.quantity} x ${i.item_name}`).join(', ')}>
                      {order.items?.map(i => `${i.quantity} x ${i.item_name}`).join(', ')}
                    </td>
                    <td style={{ padding: '12px', color: '#546E7A', textTransform: 'capitalize' }}>
                      {order.payment_method === 'upi' ? 'UPI' :
                        order.payment_method === 'card' ? 'Card' :
                          order.payment_method === 'due' ? 'Pay Later' :
                            order.payment_method === 'split' ? 'Split' :
                              order.payment_method === 'cash' ? 'Cash' : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#263238' }}>₹{order.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

const ConfirmOrderModal = ({ isOpen, onClose, onConfirm, total, itemsCount }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      {/* Added animate-scale-in for smooth entry */}
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '400px', 
          maxWidth: '90%',
          height: 'auto',        // Force auto height
          minHeight: 'auto',     // Override any min-height
          textAlign: 'center', 
          padding: '24px',       // Reduced padding slightly
          borderRadius: '16px',  // Softer corners
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', // Better shadow
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div style={{ 
          width: '80px', height: '80px', background: '#E8F5E9', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
        }}>
          <Check size={40} color="#2E7D32" strokeWidth={3} />
        </div>
        
        <h3 style={{ fontSize: '20px', color: '#1A2327', marginBottom: '8px' }}>Confirm Order?</h3>
        <p style={{ color: '#546E7A', marginBottom: '24px', fontSize: '15px' }}>
          Send <strong>{itemsCount} items</strong> to kitchen?<br/>
          Total Amount: <strong>₹{total.toFixed(2)}</strong>
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            onClick={onClose}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', border: '1px solid #CFD8DC', 
              background: 'white', color: '#546E7A', fontWeight: '600', cursor: 'pointer', flex: 1
            }}
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', border: 'none', 
              background: '#2E7D32', color: 'white', fontWeight: '600', cursor: 'pointer', flex: 1,
              boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)'
            }}
          >
            Confirm & Print
          </button>
        </div>
      </div>
    </div>
  );
};

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
  // heldOrders are now in cart store
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Strict Design Match State
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showBillSheet, setShowBillSheet] = useState(false);
  const [showMainSidebar, setShowMainSidebar] = useState(false);

  // Customer Autocomplete & History
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLocality, setCustomerLocality] = useState('');
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [showOrderInfo, setShowOrderInfo] = useState(false);

  const [activeCartTab, setActiveCartTab] = useState(null); // 'table', 'user', 'chef', 'summary'
  
  // Custom Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOrderAction, setPendingOrderAction] = useState(null); // function to execute on confirm

  const triggerOrderConfirmation = (action) => {
    setPendingOrderAction(() => action);
    setShowConfirmModal(true);
  };

  // Custom Alert State
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'info', // success, error, info, warning, confirm
    onConfirm: null
  });

  const showAlert = (message, type = 'info', onConfirm = null) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      onConfirm
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const handlePhoneInput = async (e) => {
    const val = e.target.value;
    cart.setCustomerPhone(val);

    if (val.length > 2) {
      try {
        const suggestions = await window.electronAPI.invoke('customer:search', { query: val });
        setCustomerSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (cust) => {
    cart.setCustomerName(cust.customer_name);
    cart.setCustomerPhone(cust.customer_phone);
    // If we had address/locality in DB, we'd set them here
    setShowSuggestions(false);
  };

  const fetchHistory = async () => {
    if (!cart.customerPhone) return showAlert("Please enter mobile number first", "warning");
    try {
      const history = await window.electronAPI.invoke('customer:getHistory', { phone: cart.customerPhone });
      setHistoryData(history);
      setShowHistoryModal(true);
    } catch (err) {
      showAlert("Failed to fetch history", "error");
    }
  };

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

      // Default to Favorites
      setSelectedCategory('favorites');

      const itemsResult = await window.electronAPI.invoke('menu:getItems', {});
      setMenuItems(itemsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (e, item) => {
    e.stopPropagation();
    const newStatus = !item.is_favorite;
    
    // Optimistic update
    setMenuItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, is_favorite: newStatus } : i
    ));

    try {
      await window.electronAPI.invoke('menu:toggleFavorite', { id: item.id, isFavorite: newStatus });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert on failure
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_favorite: !newStatus } : i
      ));
    }
  };

  const filteredItems = menuItems.filter(item => {
    // Favorites Category Logic
    if (selectedCategory === 'favorites') {
      return item.is_favorite && (!searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

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

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;

    // Direct Checkout: Create Order -> KOT -> Print -> Clear
    // Validate Customer Details
    if (!cart.customerName?.trim() || !cart.customerPhone?.trim()) {
      setShowCustomerForm(true);
      setActiveCartTab('user');
      showAlert("Customer Name and Phone Number are mandatory!", "warning");
      return;
    }

    triggerOrderConfirmation(async () => {
      try {
        const result = await cart.createOrder(user?.id);
        if (result.success) {
          // 1. KOT
          // 2. Print Receipt
          // 3. Clear Cart (done in createOrder)
          // 4. Alert/Notify
          const order = await window.electronAPI.invoke('order:getById', { id: result.id });
          await window.electronAPI.invoke('print:kot', { order: order, items: order.items });
          showAlert(`Order #${result.orderNumber} Placed Successfully!`, "success");
          loadData();
        } else {
          showAlert('Order Failed: ' + result.error, "error");
        }
      } catch (error) {
        console.error(error);
        showAlert('Error processing order', "error");
      }
    });
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

  const handleHoldOrder = () => {
    if (cart.items.length === 0) {
      // Logic for empty cart: check held orders
      if (cart.heldOrders.length === 0) {
        showAlert('Cart is empty and no held orders.', "info");
      } else if (cart.heldOrders.length === 1) {
        // Auto-resume if only 1
        const order = cart.heldOrders[0];
        showAlert(`Resume held order #${order.orderNumber}?`, "confirm", () => {
           cart.resumeOrder(order);
        });
      } else {
        // Show modal if > 1
        setShowHeldOrders(true);
      }
      return;
    }

    // Logic for non-empty cart: Hold it
    showAlert('Hold this order and clear cart?', "confirm", () => {
      const result = cart.holdOrder();
      if (result.success) {
         showAlert('Order Held Successfully', "success");
      } else {
        showAlert('Failed to hold order: ' + result.error, "error");
      }
    });
  };

  const handleResumeOrder = (order) => {
    if (cart.items.length > 0) {
      showAlert('Current cart will be cleared to resume order. Continue?', "confirm", () => {
         cart.resumeOrder(order);
         setShowHeldOrders(false);
      });
      return;
    }

    cart.resumeOrder(order);
    setShowHeldOrders(false);
  };

  const handleDeleteHeldOrder = (orderId) => {
    showAlert('Are you sure you want to delete this held order?', "confirm", () => {
      cart.removeHeldOrder(orderId);
      if (cart.heldOrders.length === 0) {
        setShowHeldOrders(false);
      }
    });
  };

  // KOT Only - Send to kitchen without completing order
  const handleKOTOnly = async () => {
    if (cart.items.length === 0) return;

    try {
      // Validate Customer Details
      if (!cart.customerName?.trim() || !cart.customerPhone?.trim()) {
        setShowCustomerForm(true);
        showAlert("Customer Name and Phone Number are mandatory!", "warning");
        return;
      }

      // Create a temporary order object for KOT
      const kotOrder = {
        order_type: cart.orderType,
        table_number: cart.tableNumber,
        customer_name: cart.customerName,
        notes: cart.notes,
        urgency: cart.urgency || 'normal',
        chef_instructions: cart.chefInstructions || null,
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

      // Reset delivery and container charges after sending to KOT
      cart.setDeliveryCharge(0);
      cart.setContainerCharge(0);

      showAlert('KOT sent to kitchen!', "success");
    } catch (error) {
      console.error('KOT print error:', error);
      showAlert('Error sending KOT: ' + error.message, "error");
    }
  };

  // Save & KOT - Create order and send to kitchen (no receipt)
  const handleSaveAndKOT = async () => {
    if (cart.items.length === 0) return;

    try {
      // Validate Customer Details
      if (!cart.customerName?.trim() || !cart.customerPhone?.trim()) {
        setShowCustomerForm(true);
        setActiveCartTab('user');
        showAlert("Customer Name and Phone Number are mandatory!", "warning");
        return;
      }

      // Create order
      const result = await cart.createOrder(user?.id);

      if (result.success) {
        const order = await window.electronAPI.invoke('order:getById', { id: result.id });

        // Print KOT
        await window.electronAPI.invoke('print:kot', {
          order: order,
          items: order.items
        });

        // Charges are already reset by createOrder -> clearCart

        showAlert(`Order #${result.orderNumber} Saved & Sent to KOT!`, "success");
        setShowBillSheet(false);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Save & KOT error:', error);
      showAlert('Error: ' + error.message, "error");
    }
  };

  // KOT & Print - Send to kitchen and print receipt preview
  const handleKOTAndPrint = async () => {
    if (cart.items.length === 0) return;

    try {
      // Validate Customer Details
      if (!cart.customerName?.trim() || !cart.customerPhone?.trim()) {
        setShowCustomerForm(true);
        setActiveCartTab('user');
        showAlert("Customer Name and Phone Number are mandatory!", "warning");
        return;
      }

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

        showAlert(`Order #${result.orderNumber} placed! KOT & Receipt printed.`, "success");
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('KOT & Print error:', error);
      showAlert('Error: ' + error.message, "error");
    }
  };

  // Save & Print - Complete order and print receipt
  const handleSaveAndPrint = async () => {
    if (cart.items.length === 0) return;

    try {
      // Validate Customer Details
      if (!cart.customerName?.trim() || !cart.customerPhone?.trim()) {
        setShowCustomerForm(true);
        setActiveCartTab('user');
        showAlert("Customer Name and Phone Number are mandatory!", "warning");
        return;
      }

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

        showAlert(`Order #${result.orderNumber} completed! Receipt printed.`, "success");
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Save & Print error:', error);
      showAlert('Error: ' + error.message, "error");
    }
  };

  const calculateTotal = () => {
    return cart.getTotal();
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f5f5f5',
        color: '#546E7A'
      }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '16px', fontWeight: '600', fontSize: '18px' }}>Loading POS System...</p>
        <p style={{ fontSize: '14px', color: '#90A4AE' }}>Getting things ready for you</p>
      </div>
    );
  }

  return (
    <div className="pos-fullscreen">
      {/* Header Bar - Strict PetPooja Design */}
      <CustomerHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={historyData}
        customerName={cart.customerName}
        customerPhone={cart.customerPhone}
      />
      <div className="pos-header-bar">
        <div className="pos-header-left">
          <button
            className="pos-header-menu-btn"
            onClick={() => setShowMainSidebar(true)}
          >
            <Menu size={24} color="#546E7A" />
          </button>
          <div className="pos-logo-text">ZapBill</div>
        </div>

        <div className="pos-search-wrapper">
          <div className="pos-search-box">
            <Search size={18} color="#90A4AE" />
            <input
              type="text"
              placeholder="Search by Item Name / Short Code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="pos-header-right">
          <button className="pos-new-order-btn" onClick={handleNewOrder}>
            New Order
          </button>

          <div className="pos-support-box">
            <span>Support</span>
            <strong>9099912483</strong>
          </div>

          <div className="pos-header-actions">
            <button className="pos-header-icon-btn" title="Sync"><RefreshCw size={20} /></button>
            <button className="pos-header-icon-btn" title="Keyboard Shortcuts"><Keyboard size={20} /></button>
            <button className="pos-header-icon-btn" title="User Profile"><User size={20} /></button>
          </div>
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
                <ClipboardList size={32} />
              </div>
              <span>All Items</span>
            </div>
            
            {/* Favorites Category */}
            <div
              className={`pos-category-item ${selectedCategory === 'favorites' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('favorites')}
            >
              <div className="pos-category-icon-wrapper" style={{ marginBottom: '4px' }}>
                <Star size={32} fill={selectedCategory === 'favorites' ? "white" : "#FFC107"} color={selectedCategory === 'favorites' ? "white" : "#FFC107"} />
              </div>
              <span>Favorites</span>
            </div>

            {categories.map((category, index) => {
              // Helper to get icon based on category name
              const getIcon = (name) => {
                const n = name.toLowerCase();
                if (n.includes('pizza')) return <Pizza size={32} />;
                if (n.includes('coffee') || n.includes('tea') || n.includes('beverage')) return <Coffee size={32} />;
                if (n.includes('ice') || n.includes('dessert')) return <IceCream size={32} />;
                if (n.includes('sandwich') || n.includes('burger')) return <Sandwich size={32} />;
                if (n.includes('soup')) return <Soup size={32} />;
                if (n.includes('veg') || n.includes('salad')) return <Carrot size={32} />;
                if (n.includes('chicken') || n.includes('beef') || n.includes('meat')) return <Beef size={32} />;
                if (n.includes('cake') || n.includes('pastry')) return <Cake size={32} />;
                if (n.includes('beer') || n.includes('alcohol')) return <Beer size={32} />;
                return <Utensils size={32} />;
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
                    <div 
                      className={`favorite-btn ${item.is_favorite ? 'is-fav' : ''}`}
                      onClick={(e) => toggleFavorite(e, item)}
                    >
                      <Star size={16} fill={item.is_favorite ? "#FFC107" : "none"} color={item.is_favorite ? "#FFC107" : "#CBD5E1"} />
                    </div>
                    <div className="pos-menu-card-inner">
                      <span className="pos-menu-card-name">{item.name}</span>
                      <span className="pos-menu-card-price">₹{item.price.toFixed(0)}</span>
                    </div>
                  </div>
                ))

              ) : (
                <div className="pos-empty-state">
                  <div className="pos-empty-state-icon">
                    <UtensilsCrossed size={48} />
                  </div>
                  <h3>No Items Found</h3>
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

          {/* 4 Equal-Width Tab Buttons */}
          <div className="pos-customer-bar">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', width: '100%', padding: '6px 8px' }}>
              {/* Tab 1: Table */}
              <button
                onClick={() => setActiveCartTab(activeCartTab === 'table' ? null : 'table')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  padding: '8px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: activeCartTab === 'table' ? '#FFF3E0' : '#F5F5F5',
                  color: activeCartTab === 'table' ? '#E65100' : '#546E7A',
                  border: activeCartTab === 'table' ? '1.5px solid #FFB74D' : '1px solid #E0E0E0',
                  transition: 'all 0.15s'
                }}
              >
                <MapPin size={15} /> {cart.tableNumber || 'Table'}
              </button>

              {/* Tab 2: User */}
              <button
                onClick={() => setActiveCartTab(activeCartTab === 'user' ? null : 'user')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  padding: '8px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: activeCartTab === 'user' ? '#E3F2FD' : '#F5F5F5',
                  color: activeCartTab === 'user' ? '#1565C0' : '#546E7A',
                  border: activeCartTab === 'user' ? '1.5px solid #90CAF9' : '1px solid #E0E0E0',
                  transition: 'all 0.15s'
                }}
              >
                <User size={15} /> User
              </button>

              {/* Tab 3: Chef */}
              <button
                onClick={() => setActiveCartTab(activeCartTab === 'chef' ? null : 'chef')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  padding: '8px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: activeCartTab === 'chef' ? '#FFF8E1' : '#F5F5F5',
                  color: activeCartTab === 'chef' ? '#F57F17' : '#546E7A',
                  border: activeCartTab === 'chef' ? '1.5px solid #FFE082' : '1px solid #E0E0E0',
                  transition: 'all 0.15s'
                }}
              >
                <ChefHat size={15} /> Chef
              </button>

              {/* Tab 4: Summary */}
              <button
                onClick={() => setActiveCartTab(activeCartTab === 'summary' ? null : 'summary')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  padding: '8px 4px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: activeCartTab === 'summary' ? '#E8F5E9' : '#F5F5F5',
                  color: activeCartTab === 'summary' ? '#2E7D32' : '#546E7A',
                  border: activeCartTab === 'summary' ? '1.5px solid #A5D6A7' : '1px solid #E0E0E0',
                  transition: 'all 0.15s'
                }}
              >
                <FileText size={15} /> Info
              </button>
            </div>
          </div>

          {/* Tab 1 Panel: Table Selection (only for Dine In) */}
          {activeCartTab === 'table' && (
            <div style={{ background: 'white', padding: '12px', borderBottom: '1px solid #E0E0E0', animation: 'slideDown 0.2s ease-out' }}>
              {cart.orderType === 'dine_in' ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#37474F', marginBottom: '8px' }}>🪑 Select Table</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {Array.from({ length: 20 }, (_, i) => {
                      const tNum = `T${i + 1}`;
                      return (
                        <button
                          key={tNum}
                          onClick={() => { cart.setTableNumber(tNum); setActiveCartTab(null); }}
                          style={{ padding: '8px 4px', border: cart.tableNumber === tNum ? '2px solid #D32F2F' : '1px solid #eee', borderRadius: '4px', background: cart.tableNumber === tNum ? '#FFF3F3' : '#FAFAFA', cursor: 'pointer', fontWeight: cart.tableNumber === tNum ? 700 : 400, fontSize: '13px', color: cart.tableNumber === tNum ? '#D32F2F' : '#37474F' }}
                        >
                          {tNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { cart.setTableNumber(''); }}
                      style={{ gridColumn: 'span 5', padding: '6px', border: '1px solid #eee', borderRadius: '4px', background: '#FFF3E0', cursor: 'pointer', fontSize: '12px', color: '#E65100', fontWeight: 500, marginTop: '4px' }}
                    >
                      Clear Table
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#90A4AE', fontSize: '13px' }}>Table selection is only available for Dine In orders.</div>
              )}
            </div>
          )}

          {/* Tab 2 Panel: User Info Form */}
          {activeCartTab === 'user' && (
            <div className="pos-user-info-form" style={{ background: 'white', padding: '12px', borderBottom: '1px solid #E0E0E0', fontSize: '13px', animation: 'slideDown 0.2s ease-out', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Mobile Number with Autocomplete */}
              <div style={{ position: 'relative' }}>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mobile Number:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter Mobile No"
                    value={cart.customerPhone || ''}
                    onChange={handlePhoneInput}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                    autoFocus
                    style={{ border: '1px solid #CFD8DC', borderRadius: '4px', padding: '8px', fontSize: '14px', outline: 'none', flex: 1 }}
                  />
                  <button
                    onClick={fetchHistory}
                    style={{ background: '#ECEFF1', border: '1px solid #CFD8DC', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="View History"
                  >
                    <Clock size={16} color="#546E7A" />
                    <span style={{ color: '#546E7A', fontWeight: 500 }}>History</span>
                  </button>
                </div>
                {/* Suggestions Dropdown */}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: 'white', border: '1px solid #eee', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {customerSuggestions.map((cust, i) => (
                      <div
                        key={i}
                        onMouseDown={() => selectCustomer(cust)}
                        style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: '500', color: '#2c3e50' }}>{cust.customer_phone}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{cust.customer_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Customer Name:</label>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={cart.customerName || ''}
                  onChange={(e) => cart.setCustomerName(e.target.value)}
                  style={{ border: '1px solid #CFD8DC', borderRadius: '4px', padding: '8px', fontSize: '14px', outline: 'none', width: '100%' }}
                />
              </div>

              {/* Address */}
              <div>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Address:</label>
                <input
                  type="text"
                  placeholder="Enter Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  style={{ border: '1px solid #CFD8DC', borderRadius: '4px', padding: '8px', fontSize: '14px', outline: 'none', width: '100%' }}
                />
              </div>

              {/* Locality */}
              <div>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Locality:</label>
                <input
                  type="text"
                  placeholder="Enter Locality"
                  value={customerLocality}
                  onChange={(e) => setCustomerLocality(e.target.value)}
                  style={{ border: '1px solid #CFD8DC', borderRadius: '4px', padding: '8px', fontSize: '14px', outline: 'none', width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Tab 3 Panel: Chef Instructions & Urgency */}
          {activeCartTab === 'chef' && (
            <div style={{ background: 'white', padding: '12px', borderBottom: '1px solid #E0E0E0', fontSize: '13px', animation: 'slideDown 0.2s ease-out' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#37474F', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChefHat size={16} color="#E65100" /> Chef Instructions
              </div>

              {/* Urgency Selector */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '12px' }}>Order Urgency:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {[
                    { value: 'normal', label: '🟢 Normal', bg: '#E8F5E9', border: '#A5D6A7', activeBg: '#4CAF50', color: '#2E7D32' },
                    { value: 'urgent', label: '🟠 Urgent', bg: '#FFF3E0', border: '#FFB74D', activeBg: '#FF9800', color: '#E65100' },
                    { value: 'critical', label: '🔴 Critical', bg: '#FFEBEE', border: '#EF9A9A', activeBg: '#F44336', color: '#C62828' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => cart.setUrgency(opt.value)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '6px',
                        border: cart.urgency === opt.value ? `2px solid ${opt.activeBg}` : `1px solid ${opt.border}`,
                        background: cart.urgency === opt.value ? opt.bg : '#FAFAFA',
                        color: cart.urgency === opt.value ? opt.color : '#78909C',
                        fontWeight: cart.urgency === opt.value ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chef Notes Textarea */}
              <div>
                <label style={{ color: '#546E7A', fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px' }}>Notes for Chef:</label>
                <textarea
                  placeholder="e.g. Customer is allergic to nuts, prepare with less oil, no onion in all items..."
                  value={cart.chefInstructions || ''}
                  onChange={(e) => cart.setChefInstructions(e.target.value)}
                  style={{ width: '100%', border: '1px solid #CFD8DC', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', resize: 'vertical', minHeight: '60px', maxHeight: '100px', outline: 'none', fontFamily: 'inherit', color: '#37474F' }}
                />
              </div>

              {/* Current urgency display */}
              {cart.urgency !== 'normal' && (
                <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: cart.urgency === 'critical' ? '#FFEBEE' : '#FFF3E0', color: cart.urgency === 'critical' ? '#C62828' : '#E65100', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> This order is marked as {cart.urgency.toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* Tab 4 Panel: Order Summary */}
          {activeCartTab === 'summary' && (
            <div style={{ background: 'white', padding: '12px', borderBottom: '1px solid #E0E0E0', fontSize: '13px', animation: 'slideDown 0.2s ease-out' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#37474F', marginBottom: '8px', borderBottom: '1px solid #ECEFF1', paddingBottom: '6px' }}>📋 Order Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '8px' }}>
                <div><span style={{ color: '#78909C' }}>Type:</span> <strong>{cart.orderType?.replace('_', ' ').toUpperCase()}</strong></div>
                {cart.tableNumber && <div><span style={{ color: '#78909C' }}>Table:</span> <strong>{cart.tableNumber}</strong></div>}
                {cart.customerName && <div><span style={{ color: '#78909C' }}>Customer:</span> <strong>{cart.customerName}</strong></div>}
                {cart.customerPhone && <div><span style={{ color: '#78909C' }}>Phone:</span> <strong>{cart.customerPhone}</strong></div>}
                <div><span style={{ color: '#78909C' }}>Urgency:</span> <strong style={{ color: cart.urgency === 'critical' ? '#C62828' : cart.urgency === 'urgent' ? '#E65100' : '#2E7D32' }}>{(cart.urgency || 'normal').toUpperCase()}</strong></div>
              </div>
              {cart.chefInstructions && (
                <div style={{ padding: '6px 8px', background: '#FFF8E1', borderRadius: '6px', border: '1px solid #FFE082', marginBottom: '8px', fontSize: '12px' }}>
                  <strong style={{ color: '#E65100' }}>Chef Notes:</strong> {cart.chefInstructions}
                </div>
              )}
              {cart.items.length > 0 && (
                <div style={{ borderTop: '1px dashed #CFD8DC', paddingTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#546E7A', marginBottom: '6px' }}>Items ({cart.items.reduce((s, i) => s + i.quantity, 0)})</div>
                  {cart.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '6px', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{ fontWeight: 600 }}>₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.addons?.length > 0 && <div style={{ fontSize: '11px', color: '#78909C', marginTop: '2px' }}>+ {item.addons.map(a => a.name).join(', ')}</div>}
                      {item.specialInstructions && <div style={{ fontSize: '11px', color: '#E65100', fontStyle: 'italic', marginTop: '2px' }}>📝 {item.specialInstructions}</div>}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '6px', fontSize: '14px', color: '#D32F2F' }}>
                    <span>Grand Total</span>
                    <span>₹{cart.getGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}
              {cart.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#E65100', fontStyle: 'italic' }}>Notes: {cart.notes}</div>}
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
                    {item.specialInstructions && (
                      <div style={{ fontSize: '11px', color: '#E65100', fontStyle: 'italic', marginTop: '2px', paddingLeft: '22px' }}>
                        📝 {item.specialInstructions}
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
            {/* Strict Design Bill Breakdown - Matches pos2.jpeg */}
            <div className="pos-bill-breakdown">
              <div className="pos-bill-row">
                <span className="pos-bill-label">Sub Total</span>
                <span className="pos-bill-value">₹{cart.getSubtotal().toFixed(2)}</span>
              </div>

              {cart.getDiscountAmount() > 0 && (
                <div className="pos-bill-row discount">
                  <span className="pos-bill-label">Discount ({cart.discountType === 'percentage' ? `${cart.discountValue}%` : 'Flat'})</span>
                  <span className="pos-bill-value">- ₹{cart.getDiscountAmount().toFixed(2)}</span>
                </div>
              )}

              <div className="pos-bill-row">
                <span className="pos-bill-label">SGST 2.5%</span>
                <span className="pos-bill-value">₹{cart.getTaxBreakdown().sgst.toFixed(2)}</span>
              </div>

              <div className="pos-bill-row">
                <span className="pos-bill-label">CGST 2.5%</span>
                <span className="pos-bill-value">₹{cart.getTaxBreakdown().cgst.toFixed(2)}</span>
              </div>

              {cart.getServiceCharge() > 0 && (
                <div className="pos-bill-row">
                  <span className="pos-bill-label">Service Charge ({cart.serviceChargePercent}%)</span>
                  <span className="pos-bill-value">₹{cart.getServiceCharge().toFixed(2)}</span>
                </div>
              )}

              <div className="pos-bill-divider"></div>

              <div className="pos-bill-total-row">
                <span className="pos-bill-total-label">Grand Total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pos-bill-total-value">₹{cart.getGrandTotal().toFixed(2)}</span>
                  <button
                    onClick={() => setShowBillSheet(true)}
                    style={{ background: '#ECEFF1', border: '1px solid #CFD8DC', borderRadius: '4px', cursor: 'pointer', color: '#546E7A', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="View Detailed Bill"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>

              <div className="pos-bill-controls">
                <button
                  className="pos-bill-toggle-btn"
                  onClick={() => setShowDiscountModal(true)}
                >
                  <Percent size={14} /> Add Discount
                </button>
                <div className="pos-bill-toggles">
                  <label className={`pos-bill-checkbox ${cart.isComplimentary ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={cart.isComplimentary}
                      onChange={(e) => cart.setIsComplimentary(e.target.checked)}
                    />
                    <span>Complimentary</span>
                  </label>
                  <label className={`pos-bill-checkbox ${cart.isSalesReturn ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={cart.isSalesReturn}
                      onChange={(e) => cart.setIsSalesReturn(e.target.checked)}
                    />
                    <span>Return</span>
                  </label>
                </div>
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
                <Check size={20} style={{ marginBottom: '4px' }} strokeWidth={3} />
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
              <button className="pos-action-btn btn-hold" onClick={handleHoldOrder} style={{ position: 'relative' }}>
                <PauseCircle size={18} style={{ marginBottom: '4px' }} />
                Hold
                {cart.heldOrders.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#D32F2F',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white'
                  }}>
                    {cart.heldOrders.length}
                  </span>
                )}
              </button>
              <button className="pos-action-btn btn-secondary" onClick={() => setShowHeldOrders(true)} title="View Held Orders">
                <ClipboardList size={18} style={{ marginBottom: '4px' }} />
                Recall
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
          orders={cart.heldOrders}
          onClose={() => setShowHeldOrders(false)}
          onResume={handleResumeOrder}
          onDelete={handleDeleteHeldOrder}
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
              <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} /><br />
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
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#37474F' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>₹{cart.getSubtotal().toFixed(2)}</span>
          </div>

          {/* Editable Discount */}
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#37474F' }}>
              Discount
              <button onClick={() => setShowDiscountModal(true)} style={{ background: '#E3F2FD', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#1565C0', padding: '2px 6px', display: 'flex', alignItems: 'center' }}>
                <Edit2 size={10} style={{ marginRight: '2px' }} /> Edit
              </button>
            </span>
            <span style={{ color: cart.discountValue > 0 ? '#388e3c' : '#78909c', fontWeight: cart.discountValue > 0 ? 600 : 400 }}>
              {cart.discountValue > 0 ? `-₹${cart.getDiscountAmount().toFixed(2)}` : '₹0.00'}
            </span>
          </div>

          {/* Taxes breakdown */}
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#78909C' }}>
            <span>SGST 2.5%</span>
            <span>₹{cart.getTaxBreakdown().sgst.toFixed(2)}</span>
          </div>
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#78909C' }}>
            <span>CGST 2.5%</span>
            <span>₹{cart.getTaxBreakdown().cgst.toFixed(2)}</span>
          </div>

          {/* Editable Container Charge - Only for delivery orders */}
          {cart.orderType === 'delivery' && (
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '14px', color: '#37474F' }}>
            <span>Container Charge</span>
            <input
              type="number"
              value={cart.containerCharge || ''}
              onChange={(e) => cart.setContainerCharge(parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{ width: '80px', textAlign: 'right', border: '1px solid #CFD8DC', padding: '4px 8px', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
            />
          </div>
          )}

          {/* Editable Delivery Charge - Only for delivery orders */}
          {cart.orderType === 'delivery' && (
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '14px', color: '#37474F' }}>
            <span>Delivery Charge</span>
            <input
              type="number"
              value={cart.deliveryCharge || ''}
              onChange={(e) => cart.setDeliveryCharge(parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{ width: '80px', textAlign: 'right', border: '1px solid #CFD8DC', padding: '4px 8px', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
            />
          </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: '#eee', marginBottom: '16px' }}></div>

          {/* Grand Total */}
          <div className="bill-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#D32F2F' }}>
            <span>Grand Total</span>
            <span>₹{cart.getGrandTotal().toFixed(2)}</span>
          </div>

          {/* Return Calculation */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#E0F2F1', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#00695C' }}>Customer Paid</span>
              <input
                type="number"
                value={cart.customerPaid || ''}
                onChange={(e) => cart.setCustomerPaid(parseFloat(e.target.value) || 0)}
                placeholder="Amount"
                style={{ width: '100px', textAlign: 'right', border: '1px solid #80CBC4', padding: '6px', borderRadius: '4px', fontWeight: 'bold' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#004D40', fontWeight: 'bold' }}>
              <span>Return to Customer</span>
              <span style={{ fontSize: '18px' }}>
                ₹{Math.max(0, (cart.customerPaid || 0) - cart.getGrandTotal()).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Save & Send to KOT Button */}
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleSaveAndKOT}
              disabled={cart.items.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                background: cart.items.length === 0 ? '#ccc' : '#37474F',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: cart.items.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ChefHat size={18} />
              Save & Send to KOT
            </button>
          </div>
        </div>
      </div>

      {/* Main Sidebar Overlay */}
      <MainSidebar isOpen={showMainSidebar} onClose={() => setShowMainSidebar(false)} />

      {/* Confirmation Modal */}
      <ConfirmOrderModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={pendingOrderAction}
        total={cart.getGrandTotal()}
        itemsCount={cart.items.reduce((acc, item) => acc + item.quantity, 0)}
      />

      <CustomAlert 
        isOpen={alertState.isOpen}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
        onConfirm={alertState.onConfirm}
      />

    </div>
  );
};

// Addon Selection Modal Component - Redesigned to match reference
const AddonSelectionModal = ({ item, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(item.parsedVariants.length > 0 ? item.parsedVariants[0] : null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonSearch, setAddonSearch] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const calculateTotal = () => {
    let total = selectedVariant ? parseFloat(selectedVariant.price) : item.price;
    selectedAddons.forEach(addon => {
      total += parseFloat(addon.price) * (addon.quantity || 1);
    });
    return total * quantity;
  };

  const toggleAddon = (addon) => {
    const existing = selectedAddons.find(a => a.name === addon.name);
    if (existing) {
      // If already selected, increase quantity
      setSelectedAddons(selectedAddons.map(a => 
        a.name === addon.name ? { ...a, quantity: (a.quantity || 1) + 1 } : a
      ));
    } else {
      // Add new with quantity 1
      setSelectedAddons([...selectedAddons, { ...addon, quantity: 1 }]);
    }
  };

  const decreaseAddon = (e, addon) => {
    e.stopPropagation(); // Prevent toggling
    const existing = selectedAddons.find(a => a.name === addon.name);
    if (existing) {
      if (existing.quantity > 1) {
        setSelectedAddons(selectedAddons.map(a => 
          a.name === addon.name ? { ...a, quantity: a.quantity - 1 } : a
        ));
      } else {
        // Remove if quantity becomes 0
        setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
      }
    }
  };

  // Filter addons by search
  const filteredAddons = item.parsedAddons.filter(addon =>
    addon.name.toLowerCase().includes(addonSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div className="modal addon-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', height: 'auto' }}>
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
                <span className="addon-group-info" style={{ fontSize: '12px', color: '#78909C' }}>Click to add/increase quantity</span>
              </div>
              <div className="addon-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {filteredAddons.map((addon, idx) => {
                  const selected = selectedAddons.find(a => a.name === addon.name);
                  const isSelected = !!selected;
                  const qty = selected?.quantity || 0;
                  
                  return (
                    <div
                      key={idx}
                      className={`addon-item ${addon.type !== 'veg' ? 'nonveg' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleAddon(addon)}
                      style={{ position: 'relative', overflow: 'hidden' }}
                    >
                      <span className="addon-item-name">{addon.name}</span>
                      <span className="addon-item-price">₹{parseFloat(addon.price).toFixed(0)}</span>
                      
                      {isSelected && (
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          background: '#E49B0F', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '0 0 0 8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {qty > 1 && (
                            <div 
                              onClick={(e) => decreaseAddon(e, addon)}
                              style={{ 
                                cursor: 'pointer',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '4px'
                              }}
                            >
                              -
                            </div>
                          )}
                          x{qty}
                        </div>
                      )}
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

        {/* Special Instructions */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #ECEFF1' }}>
          <label style={{ fontWeight: 600, fontSize: '13px', color: '#546E7A', display: 'block', marginBottom: '6px' }}>
            📝 Special Instructions
          </label>
          <textarea
            placeholder="e.g. Less sugar, Extra spicy, No onions..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            style={{ width: '100%', border: '1px solid #CFD8DC', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', resize: 'vertical', minHeight: '50px', maxHeight: '80px', outline: 'none', fontFamily: 'inherit', color: '#37474F' }}
          />
        </div>

        {/* Modal Footer */}
        <div className="addon-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-save"
            onClick={() => onAddToCart(item, quantity, specialInstructions, selectedVariant, selectedAddons)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// HeldOrdersModal was defined here but is now defined at the end of the file. Removing duplicate.



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
                <div key={idx}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-sm)',
                    padding: '2px 0'
                  }}>
                    <span style={{ flex: 2 }}>{item.item_name}</span>
                    <span style={{ flex: 0.5, textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>₹{(item.item_total || 0).toFixed(2)}</span>
                  </div>
                  {item.special_instructions && (
                    <div style={{ fontSize: '11px', color: '#E65100', fontStyle: 'italic', paddingLeft: '4px', marginBottom: '2px' }}>
                      📝 {item.special_instructions}
                    </div>
                  )}
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
      {/* Modals & Overlays */}
      <MainSidebar
        isOpen={showMainSidebar}
        onClose={() => setShowMainSidebar(false)}
      />

      {showDiscountModal && (
        <DiscountModal
          currentType={cart.discountType || 'percentage'}
          currentValue={cart.discountValue || 0}
          subtotal={cart.getSubtotal()}
          onApply={(type, val, reason) => {
            cart.applyDiscount(type, val, reason);
            setShowDiscountModal(false);
          }}
          onClear={() => {
            cart.clearDiscount();
            setShowDiscountModal(false);
          }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}
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
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1005 }}>
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

// Held Orders Modal
const HeldOrdersModal = ({ orders, onClose, onResume, onDelete }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '700px', maxHeight: '80vh' }}>
        <div className="modal-header" style={{ background: '#37474F', color: 'white' }}>
          <h3 className="modal-title" style={{ color: 'white' }}>Held Orders ({orders.length})</h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: 'white' }}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '0' }}>
          {orders.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PauseCircle size={48} color="#CFD8DC" />
              <p style={{ marginTop: '16px', color: '#90A4AE' }}>No held orders found</p>
            </div>
          ) : (
            <div className="held-orders-list">
              {orders.map(order => (
                <div key={order.id} style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Order #{order.orderNumber}</div>
                      <span style={{ fontSize: '11px', background: '#ECEFF1', padding: '2px 6px', borderRadius: '4px', color: '#546E7A' }}>
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {order.items.length} Items • {order.orderType?.toUpperCase()}
                    </div>
                    {(order.customerName || order.customerPhone) && (
                      <div style={{ fontSize: '12px', color: '#1976D2', marginTop: '2px' }}>
                        <User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                      </div>
                    )}
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#90A4AE' }}>
                        - {item.quantity} x {item.name}
                      </div>
                    ))}
                    {order.items.length > 3 && <div style={{ fontSize: '11px', color: '#90A4AE' }}>... +{order.items.length - 3} more</div>}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#D32F2F' }}>
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onDelete(order.id)}
                        className="btn"
                        style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #FFCDD2', background: '#FFEBEE', color: '#D32F2F' }}
                      >
                        <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Delete
                      </button>
                      <button
                        onClick={() => onResume(order)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <PlayCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Resume
                      </button>
                    </div>
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
