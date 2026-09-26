"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

import {
  DollarSign,
  Wallet,
  Users,
  Wheat,
  Trophy,
  Crown,
  RefreshCw,
  Package,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#22C55E",
  "#FACC15",
  "#F97316",
  "#8B5CF6",
  "#EC4899",
];

type ProductSalesSummary = {
  quantity: number;
  revenue: number;
};

type CustomerSalesSummary = {
  total: number;
  orders: number;
};

type PeriodKey = "today" | "7days" | "30days" | "all";

const PERIOD_OPTIONS: {
  key: PeriodKey;
  label: string;
}[] = [
  {
    key: "today",
    label: "Today",
  },
  {
    key: "7days",
    label: "7 Days",
  },
  {
    key: "30days",
    label: "30 Days",
  },
  {
    key: "all",
    label: "All Time",
  },
];

/* ============================
      LAGOS TIME HELPERS
============================ */

function getLagosDateParts() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  return {
    year,
    month,
    day,
  };
}

function getLagosDayKey(dateValue: string | Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(dateValue));
}

function getLagosGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "Good Evening";
  }

  return "Good Night";
}

function getLagosTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());
}

function getLagosDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/* ============================
      PERIOD HELPERS
============================ */

function getPeriodLabel(period: PeriodKey) {
  const option = PERIOD_OPTIONS.find(
    (item) => item.key === period
  );

  return option?.label || "All Time";
}

function getPeriodStartDate(period: PeriodKey) {
  if (period === "all") {
    return null;
  }

  const { year, month, day } = getLagosDateParts();

  const today = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (period === "today") {
    return today;
  }

  if (period === "7days") {
    today.setUTCDate(today.getUTCDate() - 6);
    return today;
  }

  if (period === "30days") {
    today.setUTCDate(today.getUTCDate() - 29);
    return today;
  }

  return null;
}

function isDateInsidePeriod(
  value: string | null | undefined,
  period: PeriodKey
) {
  if (!value) return false;

  if (period === "all") {
    return true;
  }

  const startDate = getPeriodStartDate(period);

  if (!startDate) {
    return true;
  }

  const dayKey = getLagosDayKey(value);

  const startKey = `${startDate.getUTCFullYear()}-${String(
    startDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    startDate.getUTCDate()
  ).padStart(2, "0")}`;

  const { year, month, day } = getLagosDateParts();

  const endKey = `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;

  return dayKey >= startKey && dayKey <= endKey;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "management"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();

  /* ============================
        DATABASE STATES
  ============================ */

  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<any | null>(null);

  const [showOrderModal, setShowOrderModal] =
    useState(false);

  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodKey>("7days");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentTime, setCurrentTime] = useState(
    getLagosTime()
  );

  const [currentGreeting, setCurrentGreeting] =
    useState(getLagosGreeting());

  /* ============================
        LIVE CLOCK
  ============================ */

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(getLagosTime());
      setCurrentGreeting(getLagosGreeting());
    };

    updateClock();

    const interval = setInterval(
      updateClock,
      1000
    );

    return () => clearInterval(interval);
  }, []);

  /* ============================
        FETCH DASHBOARD
  ============================ */

  const fetchDashboard = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        }

        const [
          salesRes,
          productRes,
          inventoryRes,
          expenseRes,
          ordersRes,
          debtorRes,
        ] = await Promise.all([
          supabase.from("sales").select("*"),

          supabase.from("products").select("*"),

          supabase.from("inventory").select("*"),

          supabase.from("expenses").select("*"),

          supabase
            .from("orders")
            .select("*")
            .order("created_at", {
              ascending: false,
            })
            .limit(10),

          supabase.from("debtors").select("*"),
        ]);

        if (salesRes.error) {
          console.error(
            "Sales fetch error:",
            salesRes.error
          );
        }

        if (productRes.error) {
          console.error(
            "Products fetch error:",
            productRes.error
          );
        }

        if (inventoryRes.error) {
          console.error(
            "Inventory fetch error:",
            inventoryRes.error
          );
        }

        if (expenseRes.error) {
          console.error(
            "Expenses fetch error:",
            expenseRes.error
          );
        }

        if (ordersRes.error) {
          console.error(
            "Orders fetch error:",
            ordersRes.error
          );
        }

        if (debtorRes.error) {
          console.error(
            "Debtors fetch error:",
            debtorRes.error
          );
        }

        setSales(salesRes.data || []);
        setProducts(productRes.data || []);
        setInventory(inventoryRes.data || []);
        setExpenses(expenseRes.data || []);
        setRecentOrders(ordersRes.data || []);
        setDebtors(debtorRes.data || []);
      } catch (error) {
        console.error(
          "Dashboard fetch error:",
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* ============================
        INITIAL LOAD
  ============================ */

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ============================
        REALTIME
  ============================ */

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          fetchDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          fetchDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          fetchDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "debtors",
        },
        () => {
          fetchDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchDashboard();
        }
      )

      .subscribe((status) => {
        console.log(
          "Dashboard realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboard]);

  /* ============================
        FILTERED KPI DATA
  ============================ */

  const filteredSales = sales.filter((sale) =>
    isDateInsidePeriod(
      sale.created_at,
      selectedPeriod
    )
  );

  const filteredExpenses = expenses.filter(
    (expense) =>
      isDateInsidePeriod(
        expense.created_at,
        selectedPeriod
      )
  );

  /* ============================
        KPI CALCULATIONS
  ============================ */

  const revenue = filteredSales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_amount || 0),
    0
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount || 0),
    0
  );

  /* ============================
        DEBTS REMAIN CURRENT
  ============================ */

  const totalDebts = debtors.reduce(
    (sum, debtor) =>
      sum + Number(debtor.balance || 0),
    0
  );

  /* ============================
        FLOUR REMAINS CURRENT
  ============================ */

  const flour = inventory.find((item) =>
    item.name?.toLowerCase().includes("flour")
  );

  const flourBags = Number(
    flour?.quantity || 0
  );

  /* ============================
        REVENUE GRAPH
  ============================ */

  const revenueChart = Object.values(
    filteredSales.reduce((acc: any, sale: any) => {
      const day = new Date(
        sale.created_at
      ).toLocaleDateString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
      });

      if (!acc[day]) {
        acc[day] = {
          day,
          sales: 0,
        };
      }

      acc[day].sales += Number(
        sale.total_amount || 0
      );

      return acc;
    }, {})
  );

  /* ============================
        PRODUCT STOCK PIE
  ============================ */

  const stockChart = products
    .filter(
      (product) =>
        Number(product.stock) > 0
    )
    .map((product) => ({
      name: product.name,
      value: Number(product.stock),
    }));

  /* ============================
        BEST SELLING PRODUCT
  ============================ */

  const productSales: Record<
    string,
    ProductSalesSummary
  > = {};

  sales.forEach((sale) => {
    const productName =
      sale.product_name;

    if (!productName) return;

    if (!productSales[productName]) {
      productSales[productName] = {
        quantity: 0,
        revenue: 0,
      };
    }

    productSales[productName].quantity +=
      Number(sale.quantity || 0);

    productSales[productName].revenue +=
      Number(sale.total_amount || 0);
  });

  const bestSellingProducts =
    Object.entries(productSales) as [
      string,
      ProductSalesSummary
    ][];

  bestSellingProducts.sort(
    (a, b) =>
      b[1].quantity - a[1].quantity
  );

  const topProduct =
    bestSellingProducts[0];

  const bestProduct = products.find(
    (product) =>
      product.name === topProduct?.[0]
  );

  /* ============================
        BEST CUSTOMER
  ============================ */

  const customerSales: Record<
    string,
    CustomerSalesSummary
  > = {};

  sales.forEach((sale) => {
    const customerName =
      sale.customer_name ||
      "Walk-in Customer";

    if (!customerSales[customerName]) {
      customerSales[customerName] = {
        total: 0,
        orders: 0,
      };
    }

    customerSales[customerName].total +=
      Number(sale.total_amount || 0);

    customerSales[customerName].orders += 1;
  });

  const bestCustomers =
    Object.entries(customerSales) as [
      string,
      CustomerSalesSummary
    ][];

  bestCustomers.sort(
    (a, b) =>
      b[1].total - a[1].total
  );

  const topCustomer =
    bestCustomers[0];

  const averageOrderValue =
    topCustomer
      ? topCustomer[1].total /
        topCustomer[1].orders
      : 0;



  /* ============================
        DASHBOARD
  ============================ */

  return (
    <div className="min-h-screen bg-[#08111f] -m-6 p-8">

      {/* ============================
            EXECUTIVE HEADER
      ============================ */}

      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-8 mb-10">

        <div className="flex items-center gap-6">

          <Image
            src="/logo/nkiruka-logo.png"
            alt="NKIRUKA"
            width={90}
            height={90}
            priority
          />

          <div>

            <p className="text-blue-400 text-lg font-semibold">
              👋 {currentGreeting},
            </p>

            <h1 className="text-5xl font-black text-white mt-2">
              Admin
            </h1>

            <p className="text-slate-400 mt-2 text-lg">
              Chief Executive Officer
            </p>

            <p className="text-slate-500 mt-1">
              Real-time Business Intelligence
            </p>

          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">

          {/* DATE FILTER */}

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-xl flex items-center">

            {PERIOD_OPTIONS.map(
              (option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setSelectedPeriod(
                      option.key
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    selectedPeriod ===
                    option.key
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              )
            )}

          </div>

          {/* REFRESH BUTTON */}

          <button
            type="button"
            onClick={() =>
              fetchDashboard(true)
            }
            disabled={refreshing}
            className="flex items-center justify-center gap-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl transition shadow-xl"
          >

            <RefreshCw
              size={19}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

          <div className="bg-slate-900 border border-slate-700 rounded-3xl px-8 py-6 shadow-2xl">

            <p className="text-slate-400">
              Today
            </p>

            <h2 className="text-white text-2xl font-bold mt-1">
              {getLagosDate()}
            </h2>

            <p className="text-blue-400 mt-2 font-semibold">
              {currentTime}
            </p>

            <p className="text-yellow-400 mt-1 font-semibold">
              CEO Analytics Center
            </p>

          </div>

        </div>

      </div>

      {/* ============================
            KPI CARDS
      ============================ */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

        {/* REVENUE */}

        <div className="bg-gradient-to-br from-green-900 to-slate-900 rounded-3xl border border-green-700 shadow-2xl p-7">

          <div className="flex flex-col md:flex-col xl:flex-row justify-between gap-5 xl:gap-0">

            <div className="min-w-0">

              <p className="text-green-300">
                Total Revenue
              </p>

              <h2 className="text-3xl md:text-3xl xl:text-4xl font-black text-white mt-4 break-words leading-tight">
                ₦{revenue.toLocaleString()}
              </h2>

              <p className="text-green-200 mt-3">
                Sales Recorded
              </p>

            </div>

            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">

              <DollarSign
                className="text-green-400"
                size={34}
              />

            </div>

          </div>

          <div className="mt-6 text-sm text-green-300">
            {filteredSales.length} Transactions
          </div>

        </div>

        {/* EXPENSES */}

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-3xl border border-blue-700 shadow-2xl p-7">

          <div className="flex flex-col md:flex-col xl:flex-row justify-between gap-5 xl:gap-0">

            <div className="min-w-0">

              <p className="text-blue-300">
                Expenses
              </p>

              <h2 className="text-3xl md:text-3xl xl:text-4xl font-black text-white mt-4 break-words leading-tight">
                ₦{totalExpenses.toLocaleString()}
              </h2>

              <p className="text-blue-200 mt-3">
                Total Expenses
              </p>

            </div>

            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">

              <Wallet
                className="text-blue-400"
                size={34}
              />

            </div>

          </div>

          <div className="mt-6 text-sm text-blue-300">
            {filteredExpenses.length} Expense Records
          </div>

        </div>

        {/* DEBTORS */}

        <div className="bg-gradient-to-br from-yellow-900 to-slate-900 rounded-3xl border border-yellow-700 shadow-2xl p-7">

          <div className="flex flex-col md:flex-col xl:flex-row justify-between gap-5 xl:gap-0">

            <div className="min-w-0">

              <p className="text-yellow-300">
                Outstanding Debts
              </p>

              <h2 className="text-3xl md:text-3xl xl:text-4xl font-black text-white mt-4 break-words leading-tight">
                ₦{totalDebts.toLocaleString()}
              </h2>

              <p className="text-yellow-200 mt-3">
                Money Yet To Be Collected
              </p>

            </div>

            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0">

              <Users
                className="text-yellow-400"
                size={34}
              />

            </div>

          </div>

          <div className="mt-6 text-sm text-yellow-300">
            {debtors.length} Active Debtors
          </div>

        </div>

        {/* FLOUR */}

        <div className="bg-gradient-to-br from-red-900 to-slate-900 rounded-3xl border border-red-700 shadow-2xl p-7">

          <div className="flex flex-col md:flex-col xl:flex-row justify-between gap-5 xl:gap-0">

            <div className="min-w-0">

              <p className="text-red-300">
                Flour Remaining
              </p>

              <h2 className="text-3xl md:text-3xl xl:text-4xl font-black text-white mt-4 break-words leading-tight">
                {flourBags.toLocaleString()} Bags
              </h2>

              <p className="text-red-200 mt-3">
                Current Flour Inventory
              </p>

            </div>

            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">

              <Wheat
                className="text-red-400"
                size={34}
              />

            </div>

          </div>

          <div className="mt-6">

            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">

              <div
                className={`h-full rounded-full ${
                  flourBags > 100
                    ? "bg-green-500"
                    : flourBags > 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(
                    (flourBags / 200) * 100,
                    100
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>

      </div>

      {/* ============================
            ANALYTICS
      ============================ */}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-10">

        {/* REVENUE */}

        <div className="xl:col-span-5 bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl">

          <div className="flex items-center justify-between mb-8">

            <div>

              <h2 className="text-3xl font-bold text-white">
                Revenue Analytics
              </h2>

              <p className="text-slate-400 mt-2">
                Live Revenue Performance
              </p>

            </div>

            <div className="rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold">
              {revenueChart.length} Days
            </div>

          </div>

          <div className="h-[220px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={revenueChart}
              >

                <defs>

                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="5%"
                      stopColor="#3B82F6"
                      stopOpacity={0.8}
                    />

                    <stop
                      offset="95%"
                      stopColor="#3B82F6"
                      stopOpacity={0.05}
                    />

                  </linearGradient>

                </defs>

                <CartesianGrid
                  stroke="#334155"
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                />

                <YAxis
                  stroke="#94A3B8"
                />

                <Tooltip
                  contentStyle={{
                    background: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "14px",
                    color: "#fff",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  strokeWidth={4}
                  fill="url(#revenueGradient)"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

          <div className="grid grid-cols-3 gap-5 mt-4">

            <div className="rounded-2xl bg-[#0F172A] p-5">

              <p className="text-slate-400 text-sm">
                Total Revenue
              </p>

              <h2 className="mt-2 text-3xl font-bold text-green-400">
                ₦{revenue.toLocaleString()}
              </h2>

            </div>

            <div className="rounded-2xl bg-[#0F172A] p-4">

              <p className="text-slate-400 text-sm">
                Sales Transactions
              </p>

              <h2 className="mt-2 text-3xl font-bold text-blue-400">
                {filteredSales.length}
              </h2>

            </div>

            <div className="rounded-2xl bg-[#0F172A] p-5">

              <p className="text-slate-400 text-sm">
                Average Sale
              </p>

              <h2 className="mt-2 text-3xl font-bold text-yellow-400">

                ₦
                {filteredSales.length > 0
                  ? Math.round(
                      revenue /
                        filteredSales.length
                    ).toLocaleString()
                  : "0"}

              </h2>

            </div>

          </div>

        </div>

        {/* PRODUCT STOCK */}

        <div className="xl:col-span-4 rounded-3xl bg-[#111C44] border border-slate-700 p-8 shadow-2xl overflow-hidden">

          <div className="mb-6">

            <h2 className="text-3xl font-bold text-white">
              Product Stock
            </h2>

            <p className="text-slate-400 mt-2">
              Current Inventory Distribution
            </p>

          </div>

          <div className="w-full h-[190px] flex items-center justify-center overflow-hidden">

            {stockChart.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={stockChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                  >

                    {stockChart.map(
                      (entry, index) => (

                        <Cell
                          key={`stock-${entry.name}-${index}`}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>

            ) : (

              <div className="flex flex-col items-center justify-center">

                <Package
                  size={42}
                  className="text-slate-600"
                />

                <p className="text-slate-500 mt-3">
                  No Stock Data
                </p>

              </div>

            )}

          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">

            <div className="rounded-2xl bg-[#0F172A] p-5">

              <p className="text-slate-400 text-sm">
                Products
              </p>

              <h2 className="text-3xl font-bold text-blue-400 mt-2">
                {products.length}
              </h2>

            </div>

            <div className="rounded-2xl bg-[#0F172A] p-5">

              <p className="text-slate-400 text-sm">
                Total Stock
              </p>

              <h2 className="text-3xl font-bold text-green-400 mt-2">

                {products.reduce(
                  (sum, p) =>
                    sum +
                    Number(
                      p.stock || 0
                    ),
                  0
                )}

              </h2>

            </div>

          </div>

          <div className="mt-3 space-y-2">

            {[...stockChart]
              .sort(
                (a, b) =>
                  b.value - a.value
              )
              .slice(0, 5)
              .map((item, index) => (

                <div
                  key={item.name}
                  className="flex justify-between items-center rounded-xl bg-[#0F172A] px-4 py-2"
                >

                  <div className="flex items-center gap-3 min-w-0">

                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{
                        background:
                          COLORS[
                            index %
                              COLORS.length
                          ],
                      }}
                    />

                    <span className="text-white font-medium truncate">
                      {item.name}
                    </span>

                  </div>

                  <span className="text-blue-400 font-bold ml-3">
                    {item.value}
                  </span>

                </div>

              ))}

          </div>

        </div>

        {/* RIGHT SIDE */}

        <div className="xl:col-span-3 flex flex-col gap-6">

          {/* BEST PRODUCT */}

          <div className="bg-slate-900 border border-yellow-600 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">

              <Trophy
                className="text-yellow-400"
                size={28}
              />

              <h2 className="text-xl font-bold text-white">
                Best Selling Product
              </h2>

            </div>

            <div className="flex gap-4">

              <div className="w-24 h-24 rounded-2xl bg-slate-800 overflow-hidden flex items-center justify-center">

                <img
                  src={
                    bestProduct?.image_url ||
                    "/placeholder.png"
                  }
                  alt={
                    bestProduct?.name ||
                    "Product"
                  }
                  className="w-20 h-20 object-contain"
                />

              </div>

              <div className="min-w-0">

                <h3 className="text-2xl font-bold text-white">
                  {bestProduct?.name ||
                    "No Sales"}
                </h3>

                <p className="text-green-400 mt-2">
                  #1 Best Seller
                </p>

                <p className="text-slate-400 mt-4">
                  Units Sold
                </p>

                <h2 className="text-3xl font-black text-white">
                  {topProduct
                    ? topProduct[1]
                        .quantity
                    : 0}
                </h2>

                <div className="mt-5 border-t border-slate-700 pt-4">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Revenue
                    </span>

                    <span className="text-green-400 font-bold">

                      ₦
                      {topProduct
                        ? Number(
                            topProduct[1]
                              .revenue
                          ).toLocaleString()
                        : "0"}

                    </span>

                  </div>

                  <div className="flex justify-between mt-3">

                    <span className="text-slate-400">
                      Avg Price
                    </span>

                    <span className="text-blue-400 font-bold">

                      ₦
                      {topProduct
                        ? Math.round(
                            topProduct[1]
                              .revenue /
                              topProduct[1]
                                .quantity
                          ).toLocaleString()
                        : "0"}

                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* BEST CUSTOMER */}

          <div className="bg-slate-900 border border-purple-700 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center gap-3 mb-5">

              <Crown
                className="text-purple-400"
                size={28}
              />

              <h2 className="text-xl font-bold text-white">
                Best Customer
              </h2>

            </div>

            <div className="flex items-center gap-5">

              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center">

                <Users
                  className="text-white"
                  size={34}
                />

              </div>

              <div>

                <h3 className="text-xl font-bold text-white">
                  {topCustomer?.[0] ??
                    "No Customer"}
                </h3>

                <p className="text-purple-300 mt-2">
                  Top Customer
                </p>

                <h2 className="text-2xl font-black text-white mt-3">

                  ₦
                  {topCustomer
                    ? Number(
                        topCustomer[1]
                          .total
                      ).toLocaleString()
                    : "0"}

                </h2>

                <div className="mt-4 border-t border-slate-700 pt-4">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Orders
                    </span>

                    <span className="text-white font-bold">
                      {topCustomer?.[1]
                        .orders ?? 0}
                    </span>

                  </div>

                  <div className="flex justify-between mt-3">

                    <span className="text-slate-400">
                      Avg Order
                    </span>

                    <span className="text-green-400 font-bold">

                      ₦
                      {averageOrderValue.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 0,
                        }
                      )}

                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ============================
            PRODUCT INVENTORY
      ============================ */}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-8 mb-10">

        <div className="flex items-center justify-between mb-8">

          <div>

            <h2 className="text-3xl font-bold text-white">
              Product Inventory
            </h2>

            <p className="text-slate-400 mt-2">
              Live Finished Goods Inventory
            </p>

          </div>

          <div className="bg-blue-600 px-5 py-3 rounded-xl">

            <span className="text-white font-semibold">
              {products.length} Products
            </span>

          </div>

        </div>

        {products.length === 0 ? (

          <div className="text-center py-20">

            <h2 className="text-white text-2xl font-bold">
              No Products Found
            </h2>

            <p className="text-slate-400 mt-3">
              Add products from the Products module.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

            {products.map(
              (product) => {

                const stock = Number(
                  product.stock || 0
                );

                const percentage =
                  Math.min(
                    (stock / 5000) * 100,
                    100
                  );

                return (

                  <button
                    type="button"
                    key={product.id}
                    onClick={() =>
                      router.push(
                        `/products/${product.id}?from=dashboard`
                      )
                    }
                    className="text-left bg-[#111c2d] border border-slate-700 rounded-3xl overflow-hidden hover:border-blue-500 transition duration-300 hover:-translate-y-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <div className="bg-slate-800 h-44 flex items-center justify-center">

                      <img
                        src={
                          product.image_url ||
                          "/placeholder.png"
                        }
                        alt={product.name}
                        className="h-32 object-contain"
                      />

                    </div>

                    <div className="p-5">

                      <h3 className="text-xl font-bold text-white">
                        {product.name}
                      </h3>

                      <p className="text-slate-400 text-sm mt-1">
                        SKU:{" "}
                        {product.sku ||
                          "N/A"}
                      </p>

                      <div className="mt-5">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            stock > 300
                              ? "bg-green-600/20 text-green-400"
                              : stock > 100
                              ? "bg-yellow-600/20 text-yellow-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {stock > 300
                            ? "In Stock"
                            : stock > 100
                            ? "Running Low"
                            : "Critical"}
                        </span>

                      </div>

                      <div className="mt-5">

                        <h2 className="text-4xl font-black text-white">
                          {stock.toLocaleString()}
                        </h2>

                        <p className="text-slate-400">
                          Units Available
                        </p>

                      </div>

                      <div className="mt-5 flex justify-between">

                        <span className="text-slate-400">
                          Price
                        </span>

                        <span className="text-green-400 font-bold">

                          ₦
                          {Number(
                            product.price ||
                              0
                          ).toLocaleString()}

                        </span>

                      </div>

                      <div className="mt-6">

                        <div className="bg-slate-700 rounded-full h-2">

                          <div
                            className={`h-2 rounded-full ${
                              stock > 300
                                ? "bg-green-500"
                                : stock > 100
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>

                      <div className="mt-6 border-t border-slate-700 pt-4">

                        <div className="flex justify-between text-sm">

                          <span className="text-slate-400">
                            Inventory Value
                          </span>

                          <span className="text-green-400 font-bold">

                            ₦
                            {(
                              Number(
                                product.stock ||
                                  0
                              ) *
                              Number(
                                product.price ||
                                  0
                              )
                            ).toLocaleString()}

                          </span>

                        </div>

                      </div>

                      <div className="mt-4 text-blue-400 text-sm font-semibold">
                        Click to view product →
                      </div>

                    </div>

                  </button>

                );
              }
            )}

          </div>

        )}

      </div>

      {/* ============================
            RECENT CUSTOMER ORDERS
      ============================ */}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-8">

        <div className="flex items-center justify-between mb-8">

          <div>

            <h2 className="text-3xl font-bold text-white">
              Recent Customer Orders
            </h2>

            <p className="text-slate-400 mt-2">
              Latest 10 Orders
            </p>

          </div>

          <div className="bg-slate-800 px-5 py-3 rounded-xl">

            <span className="text-white font-semibold">
              {recentOrders.length} Orders
            </span>

          </div>

        </div>

        {recentOrders.length === 0 ? (

          <div className="py-24 text-center">

            <DollarSign
              className="mx-auto text-slate-600"
              size={60}
            />

            <h2 className="text-white text-2xl font-bold mt-5">
              No Customer Orders
            </h2>

            <p className="text-slate-400 mt-2">
              Customer orders will automatically appear here.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-slate-700">

                  <th className="text-left py-4 text-slate-400">
                    Customer
                  </th>

                  <th className="text-left py-4 text-slate-400">
                    Order No.
                  </th>

                  <th className="text-center py-4 text-slate-400">
                    Status
                  </th>

                  <th className="text-right py-4 text-slate-400">
                    Total
                  </th>

                  <th className="text-center py-4 text-slate-400">
                    Date
                  </th>

                  <th className="text-center py-4 text-slate-400">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {recentOrders.map(
                  (order) => (

                    <tr
                      key={order.id}
                      className="border-b border-slate-800 hover:bg-slate-800 transition"
                    >

                      <td className="py-5">

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold">

                            {(
                              order.customer_name ||
                              "C"
                            ).charAt(0)}

                          </div>

                          <div>

                            <h3 className="font-semibold text-white">
                              {order.customer_name ||
                                "Customer"}
                            </h3>

                          </div>

                        </div>

                      </td>

                      <td className="text-slate-300 font-medium">
                        {order.order_number ||
                          order.id}
                      </td>

                      <td className="text-center">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status ===
                            "Completed"
                              ? "bg-green-500/20 text-green-400"
                              : order.status ===
                                "Pending"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {order.status ||
                            "Processing"}
                        </span>

                      </td>

                      <td className="text-right font-bold text-green-400">

                        ₦
                        {Number(
                          order.total_amount ||
                            0
                        ).toLocaleString()}

                      </td>

                      <td className="text-center text-slate-400">

                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleDateString(
                              "en-GB",
                              {
                                timeZone:
                                  "Africa/Lagos",
                              }
                            )
                          : "-"}

                      </td>

                      <td className="text-center">

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(
                              order
                            );
                            setShowOrderModal(
                              true
                            );
                          }}
                          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
                        >
                          View Details
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ============================
            ORDER DETAILS MODAL
      ============================ */}

      {showOrderModal &&
        selectedOrder && (

          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">

            <div className="bg-slate-900 w-[650px] max-w-[95%] rounded-3xl border border-slate-700 p-8">

              <div className="flex justify-between items-center mb-8">

                <h2 className="text-3xl font-bold text-white">
                  Order Details
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowOrderModal(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>

              </div>

              <div className="space-y-5">

                <div>

                  <p className="text-slate-400">
                    Customer
                  </p>

                  <h3 className="text-xl font-bold text-white">
                    {selectedOrder.customer_name ||
                      "Customer"}
                  </h3>

                </div>

                <div>

                  <p className="text-slate-400">
                    Order Number
                  </p>

                  <h3 className="text-white">
                    {selectedOrder.order_number ||
                      selectedOrder.id}
                  </h3>

                </div>

                <div>

                  <p className="text-slate-400">
                    Total Amount
                  </p>

                  <h2 className="text-3xl font-black text-green-400">
                    ₦
                    {Number(
                      selectedOrder.total_amount ||
                        0
                    ).toLocaleString()}
                  </h2>

                </div>

                <div>

                  <p className="text-slate-400">
                    Status
                  </p>

                  <h3 className="text-blue-400">
                    {selectedOrder.status ||
                      "Processing"}
                  </h3>

                </div>

                <div>

                  <p className="text-slate-400">
                    Payment Status
                  </p>

                  <h3 className="text-green-400">
                    {selectedOrder.payment_status ||
                      "Unknown"}
                  </h3>

                </div>

              </div>

              <div className="mt-8 flex justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setShowOrderModal(
                      false
                    )
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-white"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}