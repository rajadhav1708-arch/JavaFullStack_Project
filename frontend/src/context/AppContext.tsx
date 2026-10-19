import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
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
  ProductCategoryMeta,
} from '../types';

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
  categories: ProductCategoryMeta[];
  /** False on the first load, so screens can hold off showing an empty shop. */
  isCatalogueLoading: boolean;
  /** Set when the catalogue could not be loaded, so the UI can say why. */
  catalogueError: string | null;
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
  ) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  fetchKhata: () => Promise<void>;
  
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentViewState] = useState<MainView>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryMeta[]>([]);
  const [isCatalogueLoading, setIsCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [wishlist, setWishlist] = useState<string[]>(['prod-1', 'prod-3']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderForTracking, setActiveOrderForTracking] = useState<Order | null>(null);
  
  const [khataRecords, setKhataRecords] = useState<KhataRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  /**
   * Legacy view-switcher bridge (router migration): dozens of components still
   * call setCurrentView('shop') etc. from the pre-router era. Update the state
   * AND navigate so the URL (which is what Routes renders) follows. The
   * pathname guard prevents pushing a duplicate history entry when the sync
   * effect in routes.tsx echoes a location change back into state.
   */
  const VIEW_TO_PATH: Record<MainView, string | null> = {
    home: '/home',
    shop: '/shop',
    'nutrition-quiz': '/nutrition-quiz',
    services: '/services',
    subscriptions: '/subscriptions',
    offers: '/offers',
    cart: null, // no route: opens the cart drawer instead
    checkout: '/checkout',
    'order-tracking': '/order-tracking',
    'customer-dashboard': '/customer-dashboard',
    'admin-dashboard': '/admin-dashboard',
    account: '/account',
    login: '/login',
  };

  const setCurrentView = useCallback(
    (view: MainView) => {
      setCurrentViewState(view);
      const path = VIEW_TO_PATH[view];
      if (path) {
        if (window.location.pathname !== path) navigate(path);
      } else if (view === 'cart') {
        setIsCartDrawerOpen(true);
      }
    },
    [navigate]
  );

  /**
   * The catalogue is the first thing backed by a database, so it is fetched
   * rather than bundled. Browsing still works with no account; only this read
   * needs the API, and a failure is surfaced instead of showing an empty shop.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products', { signal: controller.signal }),
          fetch('/api/categories', { signal: controller.signal }),
        ]);

        if (!productsRes.ok || !categoriesRes.ok) {
          throw new Error(`Catalogue request failed (${productsRes.status}/${categoriesRes.status})`);
        }

        const productsData = (await productsRes.json()) as { products: Product[] };
        const categoriesData = (await categoriesRes.json()) as { categories: ProductCategoryMeta[] };

        setProducts(productsData.products);
        setCategories(categoriesData.categories);
        setCatalogueError(null);
      } catch (error) {
        // An aborted request is unmount cleanup, not a failure worth showing.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not load the catalogue:', error);
        setCatalogueError(
          'We could not load the product catalogue. Please check that the API is running and refresh.'
        );
      } finally {
        if (!controller.signal.aborted) setIsCatalogueLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

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

  /** Loads the signed-in user's orders from the API; no-ops when signed out
   *  or when the database is not configured. */
  const refreshOrders = async (): Promise<void> => {
    if (!user) return;
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders);
    } catch {
      // Keep the current list if the API is unreachable.
    }
  };

  /** Loads the Khata ledger from the API. Staff see every account; a customer
   *  sees only their own (the server enforces this). No-ops when signed out. */
  const fetchKhata = async (): Promise<void> => {
    if (!user) return;
    try {
      const res = await fetch('/api/khata');
      if (!res.ok) return;
      const data = (await res.json()) as { accounts: KhataRecord[] };
      setKhataRecords(data.accounts);
    } catch {
      // Keep the current list if the API is unreachable.
    }
  };

  useEffect(() => {
    void refreshOrders();
    void fetchKhata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const placeOrder = async (
    shippingAddress: ShippingAddress,
    paymentMethod: Order['paymentMethod'],
    deliveryType: Order['deliveryType'],
    customCart?: CartItem[]
  ): Promise<Order> => {
    const itemsToOrder = customCart || cart;

    // Try the real API first. The server re-prices every line from the
    // database, computes GST and decrements stock in one transaction.
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToOrder.map((item) => ({
            productId: item.product.id,
            weightKg: item.weightKg,
            quantity: item.quantity,
            isSubscription: item.isSubscription,
          })),
          shippingAddress,
          paymentMethod,
          deliveryType,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { order: Order };
        finishOrder(data.order, itemsToOrder);
        return data.order;
      }

      const errorBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.status !== 503) {
        // A real failure (out of stock, validation) should stop the flow.
        addToast(errorBody.message ?? 'Could not place the order.', 'error');
        throw new Error(errorBody.message ?? 'Could not place the order. Please try again.');
      }
      // 503 means the DB is not configured: fall through to local demo flow.
    } catch (error) {
      if (error instanceof TypeError) {
        // Network error - no API at all; fall through to local flow.
      } else {
        throw error;
      }
    }

    const localOrder = buildLocalOrder(itemsToOrder, shippingAddress, paymentMethod, deliveryType);
    finishOrder(localOrder, itemsToOrder);
    return localOrder;
  };

  const finishOrder = (newOrder: Order, itemsToOrder: CartItem[]) => {
    setOrders((prev) => [newOrder, ...prev]);

    if (newOrder.paymentMethod === 'Khata Credit') {
      setKhataRecords((prev) => {
        const existing = prev.find((k) => k.customerName.toLowerCase().includes(newOrder.shippingAddress.fullName.toLowerCase()));
        if (existing) {
          return prev.map((k) => {
            if (k.id === existing.id) {
              return {
                ...k,
                totalOutstanding: k.totalOutstanding + newOrder.totalAmount,
                lastPurchaseDate: newOrder.date,
                status: 'Due' as const,
                transactions: [
                  {
                    id: `tx-${Date.now()}`,
                    date: newOrder.date,
                    type: 'Purchase' as const,
                    amount: newOrder.totalAmount,
                    notes: `Order #${newOrder.orderNumber} via Khata Credit`,
                    orderNumber: newOrder.orderNumber,
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

    if (itemsToOrder === cart) {
      clearCart();
    }

    setActiveOrderForTracking(newOrder);
    addToast(`Order #${newOrder.orderNumber} placed successfully!`, 'success');

    // Reconcile the ledger with the server, especially for Khata Credit orders
    // which wrote a purchase entry inside the order's transaction.
    void fetchKhata();
  };

  /** Offline/demo path used only when the API or database is unavailable. */
  const buildLocalOrder = (
    itemsToOrder: CartItem[],
    shippingAddress: ShippingAddress,
    paymentMethod: Order['paymentMethod'],
    deliveryType: Order['deliveryType']
  ): Order => {
    const subtotal = itemsToOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discount = subtotal > 5000 ? Math.round(subtotal * 0.05) : 0;
    const deliveryCharge = deliveryType === 'Express Tractor Express' ? 250 : 0;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = Math.round(taxBase * 0.05 * 100) / 100;
    const totalAmount = Math.round((taxBase + deliveryCharge + tax) * 100) / 100;

    return {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      customerName: shippingAddress.fullName,
      customerPhone: shippingAddress.phone,
      customerVillage: `${shippingAddress.villageTown}, ${shippingAddress.talukaDistrict}`,
      items: itemsToOrder.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        brand: item.product.brand,
        weightKg: item.weightKg,
        // Frozen from the chosen variant so order history keeps the right label
        // even if the product is re-packed later.
        unit:
          item.product.weightOptions.find((w) => w.weightKg === item.weightKg)?.unit ??
          item.product.unit ??
          'kg',
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        image: item.product.image,
      })),
      subtotal,
      discount,
      deliveryCharge,
      tax,
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
  };

  const addKhataPayment = async (recordId: string, amount: number, notes: string) => {
    const id = Number(String(recordId).replace(/^kht-/, ''));
    if (!Number.isInteger(id) || id < 1) {
      addToast('Invalid Khata record.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/khata/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        addToast(body.message ?? 'Could not record the payment.', 'error');
        return;
      }
      await fetchKhata();
      addToast(`Recorded ₹${amount} payment for Khata ledger!`, 'success');
    } catch {
      addToast('Could not record the payment. Please try again.', 'error');
    }
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
        categories,
        isCatalogueLoading,
        catalogueError,
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
        refreshOrders,
        fetchKhata,
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
