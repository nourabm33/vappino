/** Shapes returned by the admin API (client-safe, no customer contact data). */

export interface AdminOrderItem {
  productId: string;
  productName: string;
  specification: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface AdminOrder {
  orderRef: string;
  createdAt: string;
  customerName: string;
  items: AdminOrderItem[];
  total: number;
  status: string;
}

export interface DailyStat {
  date: string;
  orderCount: number;
  revenue: number;
  profit: number | null;
}

export interface WeeklyStat {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  revenue: number;
  profit: number | null;
}

export interface ProductStat {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  profit: number | null;
}

export interface Stats {
  orderCount: number;
  /** Orders that count towards sales (every status except "cancelled"). */
  salesOrderCount: number;
  revenue: number;
  itemsSold: number;
  averageOrder: number;
  /** Null unless a cost is configured for every product sold in the range. */
  profit: number | null;
  cost: number | null;
  costsConfigured: boolean;
  missingCosts: string[];
  daily: DailyStat[];
  weekly: WeeklyStat[];
  topProducts: ProductStat[];
}

export interface PeriodInfo {
  key: string;
  start: string;
  /** Exclusive end; also the moment the dashboard starts a new reporting period. */
  end: string;
}

export interface ArchiveSummary {
  key: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  revenue: number;
  profit: number | null;
  generatedAt: string;
}

export interface DashboardResponse {
  success: true;
  generatedAt: string;
  timezone: string;
  period: PeriodInfo;
  range: { from: string; to: string };
  stats: Stats;
  orders: AdminOrder[];
  archives: ArchiveSummary[];
}

export interface WeeklyReportResponse {
  success: true;
  status: "open" | "archived";
  period: PeriodInfo;
  generatedAt: string;
  stats: Stats;
  orders: AdminOrder[];
}
