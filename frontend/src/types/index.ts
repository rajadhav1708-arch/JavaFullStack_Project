export type UserRole = 'customer' | 'admin' | 'employee';

/** The signed-in user as returned by GET /api/auth/me. Never carries the password hash. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  village: string | null;
}

export type MainView =
  | 'home'
  | 'shop'
  | 'nutrition-quiz'
  | 'services'
  | 'subscriptions'
  | 'offers'
  | 'cart'
  | 'checkout'
  | 'order-tracking'
  | 'customer-dashboard'
  | 'admin-dashboard'
  | 'account'
  | 'login';

export type AdminTab =
  | 'overview'
  | 'analytics'
  | 'inventory'
  | 'pos'
  | 'khata'
  | 'crm'
  | 'suppliers'
  | 'delivery'
  | 'offers'
  | 'reports'
  | 'access'
  | 'settings';


export type ProductCategory =
  | 'Dairy Cattle Feed'
  | 'Buffalo Feed'
  | 'Calf Starter Feed'
  | 'Mineral & Calcium'
  | 'Protein & Bypass Fat'
  | 'Feed Pellets & Concentrates'
  | 'Silage & Fodder'
  | 'Veterinary Care'
  // Non-consumables. The catalogue covers hardware and machinery as well as
  // feed, so these sit alongside the nutrition categories rather than under
  // a separate top-level grouping.
  | 'Dairy Equipment'
  | 'Dairy Hygiene'
  | 'Animal Husbandry'
  | 'Farm Hardware'
  | 'Field Equipment';

/**
 * A pack size or quantity, with the unit its label should use. `weightKg` is
 * deliberately not renamed: it predates this change and already stored litres
 * (5) and bale weights (500) rather than kilograms.
 */
export type ProductUnit = 'kg' | 'g' | 'L' | 'ml' | 'unit' | 'pcs' | 'pack' | 'coil' | 'box' | 'set' | 'roll' | 'metre';

export interface ProductVariant {
  weightKg: number;
  unit: ProductUnit;
  price: number;
  stock: number;
}

export interface NutritionalInfo {
  crudeProtein: string;
  crudeFiber: string;
  crudeFat: string;
  calcium: string;
  phosphorus: string;
  tdnEnergy: string;
  vitamins: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  verifiedFarmer: boolean;
  farmSize?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  /**
   * Animal this product is fed to. Empty for hardware and machinery, which
   * would otherwise have to falsely claim to suit a cow to pass the animal
   * filter. `tags` carries the descriptor those products show instead.
   */
  suitableFor: ('Cow' | 'Buffalo' | 'Calf' | 'Pregnant Heifer')[];
  /** Product descriptor chips, shown when there is no animal to show. */
  tags: string[];
  description: string;
  nutritionalInfo: NutritionalInfo;
  ingredients: string[];
  feedingInstructions: string;
  benefits: string[];
  /** The three feature bullets a product card shows above the price. */
  highlights: string[];
  weightOptions: ProductVariant[];
  selectedWeightKg: number;
  /** Default unit for this product, used when a variant predates the column. */
  unit: ProductUnit;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  minStockLevel: number;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  image: string;
  /** Full-size image for the detail modal, when a larger derivative exists. */
  detailImage?: string;
  isBestSeller?: boolean;
  isRecommended?: boolean;
}

export interface ProductCategoryMeta {
  id: ProductCategory;
  name: string;
  description: string;
  image: string;
  productCount: number;
}

export interface CartItem {
  product: Product;
  weightKg: number;
  price: number;
  quantity: number;
  isSubscription?: boolean;
  subscriptionFrequencyDays?: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  villageTown: string;
  talukaDistrict: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  weightKg: number;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerVillage: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Cash on Delivery' | 'Khata Credit' | 'Netbanking' | 'Card';
  paymentStatus: 'Paid' | 'Pending' | 'Khata Due';
  status: OrderStatus;
  deliveryType: 'Standard Farm Delivery' | 'Express Tractor Express' | 'Store Pickup';
  shippingAddress: ShippingAddress;
  estimatedDeliveryDate: string;
  trackingStepIndex: number;
  assignedDriver?: {
    name: string;
    phone: string;
    vehicleNo: string;
  };
}

export interface KhataRecord {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  village: string;
  /** Member number at the village milk union, when the farmer has one. */
  milkUnionMemberId?: string;
  totalCreditLimit: number;
  totalOutstanding: number;
  paidAmount: number;
  lastPurchaseDate: string;
  dueDate: string;
  status: 'Paid' | 'Partially Paid' | 'Due' | 'Overdue';
  transactions: {
    id: string;
    date: string;
    type: 'Purchase' | 'Payment';
    amount: number;
    notes: string;
    orderNumber?: string;
  }[];
}

export type KhataAccount = KhataRecord;

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
  activeOrders: number;
  rating: number;
}

export interface Subscription {
  id: string;
  productName: string;
  brand: string;
  weightKg: number;
  quantity: number;
  frequencyDays: number;
  nextDeliveryDate: string;
  status: 'Active' | 'Paused' | 'Cancelled';
  deliveryAddress: string;
  pricePerDelivery: number;
}

export interface RationRecommendationInput {
  animalType: 'Cow' | 'Buffalo' | 'Calf' | 'Pregnant Heifer';
  breed?: string;
  milkYieldLiters: number;
  fatPercentTarget: number;
  lactationStage: 'Early (1-3 Mo)' | 'Peak (3-6 Mo)' | 'Late (6-10 Mo)' | 'Dry Period';
  currentFeedType: string;
  healthGoals: string[];
  numberOfAnimals: number;
}

export interface FeedRecommendationResult {
  dailyRationKg: number;
  recommendedProducts: {
    product: Product;
    dailyQtyKg: number;
    reasoning: string;
  }[];
  expectedYieldIncrease: string;
  estimatedFatBoost: string;
  healthBenefits: string[];
  monthlyCostEstimate: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'order' | 'inventory' | 'credit' | 'system' | 'offer';
  read: boolean;
}
