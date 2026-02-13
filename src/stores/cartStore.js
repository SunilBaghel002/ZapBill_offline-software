import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'dine_in',
      tableNumber: '',
      customerName: '',
      customerPhone: '',
      notes: '',
      // Enhanced billing fields
      discountType: 'none', // 'none', 'percentage', 'flat', 'coupon'
      discountValue: 0,
      discountReason: '',
      couponCode: '',
      serviceChargePercent: 0, // e.g., 5 for 5%
      serviceChargeEnabled: false,
      paymentMethod: 'cash', // 'cash', 'card', 'upi', 'split', 'due'
      paymentDetails: {}, // For split payments or additional info
      isPaid: false,
      isComplimentary: false,
      isSalesReturn: false,
      
      // Local Held Orders
      heldOrders: [],

      // Bill Sheet Edits
      deliveryCharge: 0,
      containerCharge: 0,
      customerPaid: 0,

      // Add item to cart
      addItem: (menuItem, quantity = 1, specialInstructions = '', variant = null, addons = []) => {
        const { items } = get();
        
        // Create a unique key for comparison (include variant and addons)
        const getCompositeId = (v, a) => {
          const vId = v ? v.name : '';
          const aId = a ? a.map(add => add.name).sort().join(',') : '';
          return `${vId}|${aId}`;
        };

        const newItemCompositeId = getCompositeId(variant, addons);

        const existingIndex = items.findIndex(
          item => item.menuItemId === menuItem.id && 
                  item.specialInstructions === specialInstructions &&
                  getCompositeId(item.variant, item.addons) === newItemCompositeId
        );

        if (existingIndex >= 0) {
          // Update quantity of existing item
          const newItems = [...items];
          newItems[existingIndex].quantity += quantity;
          set({ items: newItems });
        } else {
          // Calculate unit price based on variant and addons
          let finalPrice = menuItem.price;
          if (variant) finalPrice = parseFloat(variant.price);
          
          const addonsTotal = addons.reduce((sum, addon) => sum + parseFloat(addon.price), 0);
          finalPrice += addonsTotal;

          // Add new item
          set({
            items: [...items, {
              id: Date.now().toString(),
              menuItemId: menuItem.id,
              name: menuItem.name,
              unitPrice: finalPrice,
              quantity,
              taxRate: menuItem.tax_rate || 0,
              isVegetarian: menuItem.is_vegetarian,
              specialInstructions,
              variant,
              addons
            }]
          });
        }
      },

      // Remove item from cart
      removeItem: (itemId) => {
        const { items } = get();
        set({ items: items.filter(item => item.id !== itemId) });
      },

      // Update item quantity
      updateQuantity: (itemId, quantity) => {
        const { items } = get();
        if (quantity <= 0) {
          set({ items: items.filter(item => item.id !== itemId) });
        } else {
          set({
            items: items.map(item =>
              item.id === itemId ? { ...item, quantity } : item
            )
          });
        }
      },

      // Update special instructions
      updateInstructions: (itemId, instructions) => {
        const { items } = get();
        set({
          items: items.map(item =>
            item.id === itemId ? { ...item, specialInstructions: instructions } : item
          )
        });
      },

      // Set order details
      setOrderType: (type) => set({ orderType: type }),
      setTableNumber: (number) => set({ tableNumber: number }),
      setCustomerName: (name) => set({ customerName: name }),
      setCustomerPhone: (phone) => set({ customerPhone: phone }),
      setNotes: (notes) => set({ notes }),
      
      // Enhanced discount setters
      setDiscountType: (type) => set({ discountType: type }),
      setDiscountValue: (value) => set({ discountValue: value }),
      setDiscountReason: (reason) => set({ discountReason: reason }),
      setCouponCode: (code) => set({ couponCode: code }),
      applyDiscount: (type, value, reason = '') => set({
        discountType: type,
        discountValue: value,
        discountReason: reason
      }),
      clearDiscount: () => set({
        discountType: 'none',
        discountValue: 0,
        discountReason: '',
        couponCode: ''
      }),
      
      // Service charge
      setServiceCharge: (percent, enabled = true) => set({
        serviceChargePercent: percent,
        serviceChargeEnabled: enabled
      }),
      
      // Payment method
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setPaymentDetails: (details) => set({ paymentDetails: details }),
      setIsPaid: (paid) => set({ isPaid: paid }),
      setIsComplimentary: (comp) => set({ isComplimentary: comp }),
      setIsComplimentary: (comp) => set({ isComplimentary: comp }),
      setIsSalesReturn: (ret) => set({ isSalesReturn: ret }),
      
      setDeliveryCharge: (amount) => set({ deliveryCharge: amount }),
      setContainerCharge: (amount) => set({ containerCharge: amount }),
      setCustomerPaid: (amount) => set({ customerPaid: amount }),

      // Calculate subtotal
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      },

      // Calculate discount amount based on type
      getDiscountAmount: () => {
        const { discountType, discountValue, isComplimentary } = get();
        const subtotal = get().getSubtotal();
        
        if (isComplimentary) return subtotal; // 100% discount
        
        switch (discountType) {
          case 'percentage':
            return (subtotal * discountValue) / 100;
          case 'flat':
            return Math.min(discountValue, subtotal); // Can't discount more than subtotal
          case 'coupon':
            return discountValue; // Coupon provides fixed discount
          default:
            return 0;
        }
      },

      // Calculate taxable amount (after discount)
      getTaxableAmount: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal - discount);
      },

      // Calculate tax with breakdown (CGST + SGST)
      getTaxBreakdown: () => {
        const { items } = get();
        const taxableAmount = get().getTaxableAmount();
        const subtotal = get().getSubtotal();
        
        if (subtotal === 0) return { cgst: 0, sgst: 0, total: 0 };
        
        // Calculate weighted average tax rate
        const totalTax = items.reduce((sum, item) => {
          const itemTotal = item.unitPrice * item.quantity;
          const itemTax = itemTotal * (item.taxRate / 100);
          return sum + itemTax;
        }, 0);
        
        // Scale tax proportionally to taxable amount
        const scaledTax = (totalTax / subtotal) * taxableAmount;
        const cgst = scaledTax / 2;
        const sgst = scaledTax / 2;
        
        return {
          cgst: cgst,
          sgst: sgst,
          total: cgst + sgst
        };
      },

      // Calculate total tax amount
      getTaxAmount: () => {
        return get().getTaxBreakdown().total;
      },

      // Calculate service charge
      getServiceCharge: () => {
        const { serviceChargeEnabled, serviceChargePercent } = get();
        if (!serviceChargeEnabled) return 0;
        const taxableAmount = get().getTaxableAmount();
        return (taxableAmount * serviceChargePercent) / 100;
      },

      // Calculate grand total
      getGrandTotal: () => {
        const { isSalesReturn, deliveryCharge, containerCharge } = get();
        const taxableAmount = get().getTaxableAmount();
        const tax = get().getTaxBreakdown().total;
        const serviceCharge = get().getServiceCharge();
        const total = taxableAmount + tax + serviceCharge + (deliveryCharge || 0) + (containerCharge || 0);
        return isSalesReturn ? -total : total;
      },

      // Legacy method for compatibility
      getTax: () => get().getTaxBreakdown().total,
      getTotal: () => get().getGrandTotal(),

      // Get item count
      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Clear cart
      clearCart: () => set({
        items: [],
        orderType: 'dine_in',
        tableNumber: '',
        customerName: '',
        customerPhone: '',
        notes: '',
        discountType: 'none',
        discountValue: 0,
        discountReason: '',
        couponCode: '',
        serviceChargePercent: 0,
        serviceChargeEnabled: false,
        paymentMethod: 'cash',
        paymentDetails: {},
        isPaid: false,
        isComplimentary: false,
        isSalesReturn: false,
        deliveryCharge: 0,
        containerCharge: 0,
        customerPaid: 0,
      }),

      // Create order from cart
      createOrder: async (cashierId, status = 'active', isHold = 0) => {
        const state = get();
        
        if (state.items.length === 0) {
          return { success: false, error: 'Cart is empty' };
        }

        // Build order object with snake_case for database
        const order = {
          order_type: state.orderType,
          table_number: state.tableNumber || null,
          customer_name: state.customerName || null,
          customer_phone: state.customerPhone || null,
          notes: state.notes || null,
          subtotal: state.getSubtotal(),
          tax_amount: state.getTax(),
          discount_amount: state.getDiscountAmount(),
          discount_type: state.discountType,
          discount_reason: state.discountReason || null,
          service_charge: state.getServiceCharge(),
          total_amount: state.getGrandTotal(),
          payment_method: state.paymentMethod,
          is_complimentary: state.isComplimentary ? 1 : 0,
          is_sales_return: state.isSalesReturn ? 1 : 0,
          delivery_charge: state.deliveryCharge || 0,
          container_charge: state.containerCharge || 0,
          customer_paid: state.customerPaid || 0,
          status: status,
          is_hold: isHold
        };

        // Build items array with correct field names
        const items = state.items.map(item => ({
          menu_item_id: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || 0,
          special_instructions: item.specialInstructions || null,
          variant: item.variant ? JSON.stringify(item.variant) : null,
          addons: item.addons && item.addons.length > 0 ? JSON.stringify(item.addons) : null,
        }));

        try {
          const result = await window.electronAPI.invoke('order:create', { order, items });
          
          if (result && result.id) {
            get().clearCart();
            return { success: true, id: result.id, orderNumber: result.orderNumber };
          }
          
          return result || { success: false, error: 'Order creation failed' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Hold current order locally
      holdOrder: () => {
        const state = get();
        if (state.items.length === 0) return { success: false, error: 'Cart is empty' };

        const newHeldOrder = {
          id: Date.now().toString(), // Unique ID for held order
          timestamp: Date.now(),
          orderNumber: `HOLD-${state.heldOrders.length + 1}`, // Temporary number
          items: state.items,
          orderType: state.orderType,
          tableNumber: state.tableNumber,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          notes: state.notes,
          discountType: state.discountType,
          discountValue: state.discountValue,
          discountReason: state.discountReason,
          serviceChargeEnabled: state.serviceChargeEnabled,
          serviceChargePercent: state.serviceChargePercent,
          paymentMethod: state.paymentMethod,
          isComplimentary: state.isComplimentary,
          isSalesReturn: state.isSalesReturn,
          deliveryCharge: state.deliveryCharge,
          containerCharge: state.containerCharge,
          customerPaid: state.customerPaid,
          totalAmount: state.getGrandTotal()
        };

        set({
          heldOrders: [...state.heldOrders, newHeldOrder]
        });
        
        get().clearCart();
        return { success: true };
      },

      // Remove a held order
      removeHeldOrder: (heldOrderId) => {
        const { heldOrders } = get();
        set({ heldOrders: heldOrders.filter(order => order.id !== heldOrderId) });
      },

      // Resume a held order (populate cart from held order object)
      resumeOrder: (heldOrder) => {
        // Clear current cart first
        get().clearCart();

        set({
          items: heldOrder.items,
          orderType: heldOrder.orderType || 'dine_in',
          tableNumber: heldOrder.tableNumber || '',
          customerName: heldOrder.customerName || '',
          customerPhone: heldOrder.customerPhone || '',
          notes: heldOrder.notes || '',
          discountType: heldOrder.discountType || 'none',
          discountValue: heldOrder.discountValue || 0,
          discountReason: heldOrder.discountReason || '',
          serviceChargeEnabled: heldOrder.serviceChargeEnabled,
          serviceChargePercent: heldOrder.serviceChargePercent || 0,
          paymentMethod: heldOrder.paymentMethod || 'cash',
          isComplimentary: heldOrder.isComplimentary,
          isSalesReturn: heldOrder.isSalesReturn,
          deliveryCharge: heldOrder.deliveryCharge || 0,
          containerCharge: heldOrder.containerCharge || 0,
          customerPaid: heldOrder.customerPaid || 0,
        });

        // Remove from held orders list
        get().removeHeldOrder(heldOrder.id);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        tableNumber: state.tableNumber,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        notes: state.notes,
        discountType: state.discountType,
        discountValue: state.discountValue,
        discountReason: state.discountReason,
        couponCode: state.couponCode,
        serviceChargePercent: state.serviceChargePercent,
        serviceChargeEnabled: state.serviceChargeEnabled,
        paymentMethod: state.paymentMethod,
        isComplimentary: state.isComplimentary,
        isSalesReturn: state.isSalesReturn,
        heldOrders: state.heldOrders, // Persist held orders
        deliveryCharge: state.deliveryCharge,
        containerCharge: state.containerCharge,
        customerPaid: state.customerPaid,
      }),
    }
  )
);
