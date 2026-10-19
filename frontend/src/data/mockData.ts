/**
 * All demo/sample data has been removed. Orders, Khata, subscriptions,
 * notifications, reviews and analytics are now backed by real database rows
 * (or start empty until real data exists). This file is kept only so existing
 * imports do not break; every export is an empty collection.
 */

import type { Order, KhataRecord, Subscription, NotificationItem, Review } from '../types';

export const MOCK_REVIEWS: Review[] = [];

export const MOCK_ORDERS: Order[] = [];

export const MOCK_KHATA_RECORDS: KhataRecord[] = [];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [];

export const MOCK_SALES_ANALYTICS = {
  todaySales: 0,
  todayOrdersCount: 0,
  monthlyRevenue: 0,
  monthlyRevenueGrowthPercent: 0,
  totalCustomersCount: 0,
  totalKhataOutstanding: 0,
  lowStockItemsCount: 0,
  dailySalesTrend: [] as { day: string; sales: number; orders: number }[],
  categoryShare: [] as { name: string; percentage: number; color: string }[],
};
