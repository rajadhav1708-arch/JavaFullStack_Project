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
    customCart?: CartItem[],
    /** Staff only: the signed-in customer the order (and Khata charge) belongs to. */
    customerUserId?: number
  ) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  /** Staff may pass { q, status } — the server filters; customers always get their own. */
  fetchKhata: (filters?: { q?: string; status?: string }) => Promise<void>;
  khataRecords: KhataRecord[];
  addKhataPayment: (recordId: string, amount: number, notes: string, paymentMethod?: string) => Promise<boolean>;
  
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
  const { user, isLoading, csrfToken, setCsrfToken } = useAuth();
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
  
  // Saved items are a local convenience, not a server record. Keyed per user
  // so one account never sees another account's wishlist on the same browser.
  const wishlistKey = user?.id ? `hindavi_wishlist:${user.id}` : 'hindavi_wishlist:guest';
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistHydratedKey, setWishlistHydratedKey] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderForTracking, setActiveOrderForTracking] = useState<Order | null>(null);

  const [khataRecords, setKhataRecords] = useState<KhataRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Load this user's wishlist whenever the signed-in identity changes.
  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = window.localStorage.getItem(wishlistKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      stored = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      stored = [];
    }
    setWishlist(stored);
    setWishlistHydratedKey(wishlistKey);
  }, [wishlistKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setCsrfToken(data.csrfToken);
        }
      } catch {
        /* offline */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setCsrfToken]);

  // Wait until the matching wishlist has been loaded so we never persist
  // the previous user's list under the new user's key.
  useEffect(() => {
    if (wishlistHydratedKey !== wishlistKey) return;
    try {
      window.localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
    } catch {
      /* private mode: keep the in-memory list */
    }
  }, [wishlist, wishlistKey, wishlistHydratedKey]);

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

  /** Abort handles for the per-user refetches, so a slow response issued under
   *  one account cannot overwrite the next account's data. */
  const ordersAbortRef = React.useRef<AbortController | null>(null);
  const khataAbortRef = React.useRef<AbortController | null>(null);

  /** Loads the signed-in user's orders from the API. Clears the list when
   *  signed out so the previous user's orders never linger. */
  const refreshOrders = async (): Promise<void> => {
    ordersAbortRef.current?.abort();
    if (!user) {
      setOrders([]);
      return;
    }
    const controller = new AbortController();
    ordersAbortRef.current = controller;
    try {
      const res = await fetch('/api/orders', { signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Keep the current list if the API is unreachable.
    }
  };

  /** Loads the Khata ledger from the API. Staff see every account (optionally
   *  filtered server-side by search text and lifecycle status); a customer sees
   *  only their own (the server enforces this). Clears when signed out. */
  const khataFiltersRef = React.useRef<{ q?: string; status?: string }>({});
  const fetchKhata = async (filters?: { q?: string; status?: string }): Promise<void> => {
    if (filters) khataFiltersRef.current = filters;
    khataAbortRef.current?.abort();
    if (!user) {
      setKhataRecords([]);
      return;
    }
    const controller = new AbortController();
    khataAbortRef.current = controller;
    try {
      const params = new URLSearchParams();
      const active = khataFiltersRef.current;
      if (active.q) params.set('q', active.q);
      if (active.status) params.set('status', active.status);
      const qs = params.toString();
      const res = await fetch(`/api/khata${qs ? `?${qs}` : ''}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { accounts: KhataRecord[] };
      setKhataRecords(data.accounts);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Keep the current list if the API is unreachable.
    }
  };

  // On sign-in, sign-out, or account switch: wipe every session-scoped store
  // so customer and admin (or two customers) never share identity state.
  useEffect(() => {
    setOrders([]);
    setKhataRecords([]);
    khataFiltersRef.current = {};
    setCart([]);
    setNotifications([]);
    setActiveOrderForTracking(null);
    setSelectedProduct(null);
    setSearchQuery('');
    setSelectedCategory('All');
    void refreshOrders();
    void fetchKhata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const placeOrder = async (
    shippingAddress: ShippingAddress,
    paymentMethod: Order['paymentMethod'],
    deliveryType: Order['deliveryType'],
    customCart?: CartItem[],
    customerUserId?: number
  ): Promise<Order> => {
    const itemsToOrder = customCart || cart;

    // The server re-prices every line from the database, computes GST and
    // decrements stock in one transaction. If it cannot be reached there is no
    // trustworthy order to record, so fail loudly instead of inventing one.
    let res: Response;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
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
          ...(customerUserId ? { customerUserId } : {}),
        }),
      });
    } catch {
      const message = 'Could not reach the store server. Check your connection and try again.';
      addToast(message, 'error');
      throw new Error(message);
    }

    if (res.ok) {
      const data = (await res.json()) as { order: Order };
      finishOrder(data.order, itemsToOrder);
      return data.order;
    }

    const errorBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    const message =
      res.status === 503
        ? 'Ordering is temporarily unavailable. Please try again shortly or call the store.'
        : errorBody.message ?? 'Could not place the order. Please try again.';
    addToast(message, 'error');
    throw new Error(message);
  };

  const finishOrder = (newOrder: Order, itemsToOrder: CartItem[]) => {
    setOrders((prev) => [newOrder, ...prev]);

    if (itemsToOrder === cart) {
      clearCart();
    }

    setActiveOrderForTracking(newOrder);
    addToast(`Order #${newOrder.orderNumber} placed successfully!`, 'success');

    // Reconcile the ledger with the server, especially for Khata Credit orders
    // which wrote a purchase entry inside the order's transaction.
    void fetchKhata();
  };


  const addKhataPayment = async (
    recordId: string,
    amount: number,
    notes: string,
    paymentMethod = 'Cash'
  ): Promise<boolean> => {
    const id = Number(String(recordId).replace(/^kht-/, ''));
    if (!Number.isInteger(id) || id < 1) {
      addToast('Invalid Khata record.', 'error');
      return false;
    }
    try {
      const res = await fetch(`/api/khata/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
        body: JSON.stringify({ amount, notes, paymentMethod }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        addToast(body.message ?? 'Could not record the payment.', 'error');
        return false;
      }
      await fetchKhata();
      addToast(`Recorded ₹${amount} payment for Khata ledger!`, 'success');
      return true;
    } catch {
      addToast('Could not record the payment. Please try again.', 'error');
      return false;
    }
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
