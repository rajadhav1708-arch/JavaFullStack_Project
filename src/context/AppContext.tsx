import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MainView,
  AdminTab,
  Product,
  CartItem,
  Order,
  KhataRecord,
  Subscription,
  NotificationItem,
  ShippingAddress,
  ProductCategory,
} from '../types';
import {
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_KHATA_RECORDS,
  MOCK_SUBSCRIPTIONS,
  MOCK_NOTIFICATIONS,
} from '../data/mockData';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}

interface AppContextType {
  currentView: MainView;
  setCurrentView: (view: MainView) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  selectedCategory: ProductCategory | 'All';
  setSelectedCategory: (cat: ProductCategory | 'All') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  
  cart: CartItem[];
  addToCart: (product: Product, weightKg?: number, qty?: number, isSub?: boolean, freqDays?: number) => void;
  removeFromCart: (productId: string, weightKg: number) => void;
  updateCartQuantity: (productId: string, weightKg: number, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  
  orders: Order[];
  activeOrderForTracking: Order | null;
  setActiveOrderForTracking: (order: Order | null) => void;
  placeOrder: (
    shippingAddress: ShippingAddress,
    paymentMethod: Order['paymentMethod'],
    deliveryType: Order['deliveryType'],
    customCart?: CartItem[]
  ) => Order;
  
  khataRecords: KhataRecord[];
  addKhataPayment: (recordId: string, amount: number, notes: string) => void;
  
  subscriptions: Subscription[];
  addSubscription: (product: Product, weightKg: number, qty: number, freqDays: number) => void;
  cancelSubscription: (subId: string) => void;
  
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  unreadNotificationCount: number;
  
  toasts: ToastMessage[];
  addToast: (text: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  
  // Modal controllers
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isAIChatOpen: boolean;
  setIsAIChatOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<MainView>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    // default 1 item for quick demo
    return [
      {
        product: MOCK_PRODUCTS[0],
        weightKg: 50,
        price: 1800,
        quantity: 2,
      },
    ];
  });
  
  const [wishlist, setWishlist] = useState<string[]>(['prod-1', 'prod-3']);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [activeOrderForTracking, setActiveOrderForTracking] = useState<Order | null>(MOCK_ORDERS[0]);
  
  const [khataRecords, setKhataRecords] = useState<KhataRecord[]>(MOCK_KHATA_RECORDS);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const addToast = (text: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToCart = (
    product: Product,
    weightKg: number = product.selectedWeightKg || 50,
    qty: number = 1,
    isSub: boolean = false,
    freqDays: number = 30
  ) => {
    const weightOpt = product.weightOptions.find((w) => w.weightKg === weightKg);
    const unitPrice = weightOpt ? weightOpt.price : product.price;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.weightKg === weightKg && item.isSubscription === isSub
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            weightKg,
            price: unitPrice,
            quantity: qty,
            isSubscription: isSub,
            subscriptionFrequencyDays: freqDays,
          },
        ];
      }
    });

    addToast(`Added ${product.name} (${weightKg}kg x${qty}) to cart!`, 'success');
  };

  const removeFromCart = (productId: string, weightKg: number) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.weightKg === weightKg)));
    addToast('Item removed from cart', 'info');
  };

  const updateCartQuantity = (productId: string, weightKg: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId, weightKg);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.weightKg === weightKg) {
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        addToast('Removed from wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        addToast('Added to wishlist', 'success');
        return [...prev, productId];
      }
    });
  };

  const placeOrder = (
    shippingAddress: ShippingAddress,
    paymentMethod: Order['paymentMethod'],
    deliveryType: Order['deliveryType'],
    customCart?: CartItem[]
  ): Order => {
    const itemsToOrder = customCart || cart;
    const subtotal = itemsToOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discount = subtotal > 5000 ? Math.round(subtotal * 0.05) : 0;
    const deliveryCharge = deliveryType === 'Express Tractor Express' ? 250 : 0;
    const totalAmount = subtotal - discount + deliveryCharge;

    const newOrderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNumber,
      date: new Date().toISOString().split('T')[0],
      customerName: shippingAddress.fullName,
      customerPhone: shippingAddress.phone,
      customerVillage: `${shippingAddress.villageTown}, ${shippingAddress.talukaDistrict}`,
      items: itemsToOrder.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        brand: item.product.brand,
        weightKg: item.weightKg,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        image: item.product.image,
      })),
      subtotal,
      discount,
      deliveryCharge,
      tax: 0,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'Khata Credit' ? 'Khata Due' : paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
      status: 'Placed',
      deliveryType,
      shippingAddress,
      estimatedDeliveryDate: 'Within 24-36 Hours',
      trackingStepIndex: 1,
      assignedDriver: {
        name: 'Ramesh Sawant (Village Van Dispatch)',
        phone: '+91 94211 88920',
        vehicleNo: 'MH-09-EQ-4421',
      },
    };

    setOrders((prev) => [newOrder, ...prev]);

    // If Khata Credit payment, update Khata ledger
    if (paymentMethod === 'Khata Credit') {
      setKhataRecords((prev) => {
        const existing = prev.find((k) => k.customerName.toLowerCase().includes(shippingAddress.fullName.toLowerCase()));
        if (existing) {
          return prev.map((k) => {
            if (k.id === existing.id) {
              return {
                ...k,
                totalOutstanding: k.totalOutstanding + totalAmount,
                lastPurchaseDate: new Date().toISOString().split('T')[0],
                status: 'Due',
                transactions: [
                  {
                    id: `tx-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    type: 'Purchase',
                    amount: totalAmount,
                    notes: `Order #${newOrderNumber} via Khata Credit`,
                    orderNumber: newOrderNumber,
                  },
                  ...k.transactions,
                ],
              };
            }
            return k;
          });
        }
        return prev;
      });
    }

    if (!customCart) {
      clearCart();
    }

    setActiveOrderForTracking(newOrder);
    addToast(`Order #${newOrderNumber} placed successfully!`, 'success');
    return newOrder;
  };

  const addKhataPayment = (recordId: string, amount: number, notes: string) => {
    setKhataRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          const newOutstanding = Math.max(0, rec.totalOutstanding - amount);
          const newStatus = newOutstanding === 0 ? 'Paid' : 'Partially Paid';
          return {
            ...rec,
            totalOutstanding: newOutstanding,
            paidAmount: rec.paidAmount + amount,
            status: newStatus,
            transactions: [
              {
                id: `tx-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'Payment',
                amount,
                notes: notes || 'Cash/UPI Payment at shop counter',
              },
              ...rec.transactions,
            ],
          };
        }
        return rec;
      })
    );
    addToast(`Recorded ₹${amount} payment for Khata ledger!`, 'success');
  };

  const addSubscription = (product: Product, weightKg: number, qty: number, freqDays: number) => {
    const unitPrice = product.weightOptions.find((w) => w.weightKg === weightKg)?.price || product.price;
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      productName: product.name,
      brand: product.brand,
      weightKg,
      quantity: qty,
      frequencyDays: freqDays,
      nextDeliveryDate: new Date(Date.now() + freqDays * 86400000).toISOString().split('T')[0],
      status: 'Active',
      deliveryAddress: 'Default Farm Address (Kagal Village)',
      pricePerDelivery: unitPrice * qty,
    };
    setSubscriptions((prev) => [newSub, ...prev]);
    addToast(`Subscribed to auto-delivery every ${freqDays} days!`, 'success');
  };

  const cancelSubscription = (subId: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    addToast('Subscription cancelled', 'info');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        adminTab,
        setAdminTab,
        products,
        setProducts,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        selectedProduct,
        setSelectedProduct,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartItemCount,
        wishlist,
        toggleWishlist,
        orders,
        activeOrderForTracking,
        setActiveOrderForTracking,
        placeOrder,
        khataRecords,
        addKhataPayment,
        subscriptions,
        addSubscription,
        cancelSubscription,
        notifications,
        markNotificationAsRead,
        unreadNotificationCount,
        toasts,
        addToast,
        removeToast,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isAIChatOpen,
        setIsAIChatOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
