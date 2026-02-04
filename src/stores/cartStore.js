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
      discountAmount: 0,
      discountReason: '',

      // Add item to cart
      addItem: (menuItem, quantity = 1, specialInstructions = '') => {
        const { items } = get();
        const existingIndex = items.findIndex(
          item => item.menuItemId === menuItem.id && 
                  item.specialInstructions === specialInstructions
        );

        if (existingIndex >= 0) {
          // Update quantity of existing item
          const newItems = [...items];
          newItems[existingIndex].quantity += quantity;
          set({ items: newItems });
        } else {
          // Add new item
          set({
            items: [...items, {
              id: Date.now().toString(),
              menuItemId: menuItem.id,
              name: menuItem.name,
              unitPrice: menuItem.price,
              quantity,
              taxRate: menuItem.tax_rate || 0,
              isVegetarian: menuItem.is_vegetarian,
              specialInstructions,
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
      setDiscount: (amount, reason = '') => set({ 
        discountAmount: amount, 
        discountReason: reason 
      }),

      // Calculate subtotal
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      },

      // Calculate tax
      getTax: () => {
        const { items } = get();
        return items.reduce((sum, item) => {
          const itemTotal = item.unitPrice * item.quantity;
          const itemTax = itemTotal * (item.taxRate / 100);
          return sum + itemTax;
        }, 0);
      },

      // Calculate total
      getTotal: () => {
        const { discountAmount } = get();
        const subtotal = get().getSubtotal();
        const tax = get().getTax();
        return subtotal + tax - discountAmount;
      },

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
        discountAmount: 0,
        discountReason: '',
      }),

      // Create order from cart
      createOrder: async (cashierId) => {
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
          discount_amount: state.discountAmount,
          discount_reason: state.discountReason || null,
          total_amount: state.getTotal(),
        };

        // Build items array with correct field names
        const items = state.items.map(item => ({
          menu_item_id: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || 0,
          special_instructions: item.specialInstructions || null,
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
        discountAmount: state.discountAmount,
        discountReason: state.discountReason,
      }),
    }
  )
);
