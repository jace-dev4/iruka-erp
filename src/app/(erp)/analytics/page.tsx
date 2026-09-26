"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import ProtectedRoute from "@/components/ProtectedRoute";

import ExecutiveHeader from "@/components/analytics/ExecutiveHeader";

import RevenueChart from "@/components/analytics/RevenueChart";
import ProductionChart from "@/components/analytics/ProductionChart";
import SalesChart from "@/components/analytics/SalesChart";
import CustomerGrowthChart from "@/components/analytics/CustomerGrowthChart";
import InventoryChart from "@/components/analytics/InventoryChart";

import CustomerAnalytics from "@/components/analytics/CustomerAnalytics";
import BestSellingProducts from "@/components/analytics/BestSellingProducts";
import TopCustomers from "@/components/analytics/TopCustomers";

type Period = "today" | "week" | "month" | "year";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("today");

  const [loading, setLoading] = useState(true);

  const [sales, setSales] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  /* =========================================================
     FETCH ANALYTICS
  ========================================================= */

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);

    try {
      let startDate = new Date();

      switch (period) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;

        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;

        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;

        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const fromDate = startDate.toISOString();

      const [
        salesRes,
        ordersRes,
        customersRes,
        productionRes,
        inventoryRes,
        expensesRes,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select("*")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),

        supabase
          .from("customers")
          .select("*")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),

        supabase
          .from("production_logs")
          .select("*")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),

        supabase
          .from("inventory")
          .select("*"),

        supabase
          .from("expenses")
          .select("*")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),
      ]);

      if (salesRes.error) {
        console.error("Analytics Sales Error:", salesRes.error);
      }

      if (ordersRes.error) {
        console.error("Analytics Orders Error:", ordersRes.error);
      }

      if (customersRes.error) {
        console.error("Analytics Customers Error:", customersRes.error);
      }

      if (productionRes.error) {
        console.error(
          "Analytics Production Error:",
          productionRes.error
        );
      }

      if (inventoryRes.error) {
        console.error(
          "Analytics Inventory Error:",
          inventoryRes.error
        );
      }

      if (expensesRes.error) {
        console.error(
          "Analytics Expenses Error:",
          expensesRes.error
        );
      }

      setSales(salesRes.data || []);
      setOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
      setProduction(productionRes.data || []);
      setInventory(inventoryRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error("Analytics Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     REALTIME UPDATES
  ========================================================= */

  useEffect(() => {
    const channel = supabase
      .channel("analytics-live-updates")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          fetchAnalytics();
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
          fetchAnalytics();
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
          fetchAnalytics();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          fetchAnalytics();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_logs",
        },
        () => {
          fetchAnalytics();
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
          fetchAnalytics();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period]);

  /* =========================================================
     REVENUE + EXPENSE CHART
  ========================================================= */

  const revenueChartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return months.map((month, index) => {
      const monthSales = sales.filter((sale: any) => {
        if (!sale.created_at) return false;

        return new Date(sale.created_at).getMonth() === index;
      });

      const monthExpenses = expenses.filter((expense: any) => {
        if (!expense.created_at) return false;

        return (
          new Date(expense.created_at).getMonth() === index
        );
      });

      const revenue = monthSales.reduce(
        (sum, sale) =>
          sum + Number(sale.total_amount || 0),
        0
      );

      const expenseTotal = monthExpenses.reduce(
        (sum, expense) =>
          sum + Number(expense.amount || 0),
        0
      );

      return {
        name: month,
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
      };
    });
  }, [sales, expenses]);

  /* =========================================================
     PRODUCTION CHART
  ========================================================= */

  const productionChartData = useMemo(() => {
    return production.map((item: any) => ({
      product:
        item.bread ||
        item.product_name ||
        item.name ||
        "Unknown",

      produced: Number(item.quantity || 0),

      waste: Number(item.waste_quantity || 0),
    }));
  }, [production]);

  /* =========================================================
     SALES CHART
  ========================================================= */

  const salesChartData = useMemo(() => {
    return sales.map((item: any) => ({
      product:
        item.product_name ||
        "Unknown",

      quantity: Number(item.quantity || 0),

      revenue: Number(item.total_amount || 0),
    }));
  }, [sales]);

  /* =========================================================
     CUSTOMER GROWTH
  ========================================================= */

  const customerPerformanceChartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return months.map((month, index) => {
      const monthOrders = orders.filter(
        (order: any) => {
          if (!order.created_at) return false;

          return (
            new Date(order.created_at).getMonth() === index
          );
        }
      );

      return {
        month,
        orders: monthOrders.length,
      };
    });
  }, [orders]);

  /* =========================================================
     INVENTORY CHART
  ========================================================= */

  const inventoryChartData = useMemo(() => {
    return inventory.map((item: any) => ({
      name:
        item.material_name ||
        item.name ||
        "Unknown",

      value: Number(
        item.current_stock ||
        item.quantity ||
        0
      ),
    }));
  }, [inventory]);

  /* =========================================================
     BEST SELLING PRODUCTS
  ========================================================= */

  const bestSellingProducts = useMemo(() => {
    const grouped: Record<
      string,
      {
        quantity: number;
        revenue: number;
      }
    > = {};

    sales.forEach((sale: any) => {
      const product = sale.product_name;

      if (!product) return;

      if (!grouped[product]) {
        grouped[product] = {
          quantity: 0,
          revenue: 0,
        };
      }

      grouped[product].quantity +=
        Number(sale.quantity || 0);

      grouped[product].revenue +=
        Number(sale.total_amount || 0);
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        quantity: value.quantity,
        revenue: value.revenue,
      }))
      .sort(
        (a, b) =>
          b.quantity - a.quantity
      )
      .slice(0, 5);
  }, [sales]);

  /* =========================================================
     TOP CUSTOMERS
  ========================================================= */

  const topCustomers = useMemo(() => {
    const grouped: Record<
      string,
      {
        orders: number;
        spent: number;
      }
    > = {};

    sales.forEach((sale: any) => {
      const customer =
        sale.customer_name ||
        "Walk-in";

      if (!grouped[customer]) {
        grouped[customer] = {
          orders: 0,
          spent: 0,
        };
      }

      grouped[customer].orders++;

      grouped[customer].spent +=
        Number(
          sale.total_amount || 0
        );
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        orders: value.orders,
        spent: value.spent,
      }))
      .sort(
        (a, b) =>
          b.spent - a.spent
      )
      .slice(0, 5);
  }, [sales]);

  /* =========================================================
     EXPORT REPORT
  ========================================================= */

  function exportReport() {
    try {
      const rows: string[][] = [];

      rows.push([
        "IRUKA INDUSTRIES LTD - ANALYTICS REPORT",
      ]);

      rows.push([
        `Period: ${period.toUpperCase()}`,
      ]);

      rows.push([
        `Generated: ${new Date().toLocaleString()}`,
      ]);

      rows.push([]);

      /* SALES */

      rows.push([
        "SALES",
      ]);

      rows.push([
        "Date",
        "Product",
        "Customer",
        "Quantity",
        "Revenue",
      ]);

      sales.forEach((sale: any) => {
        rows.push([
          sale.created_at
            ? new Date(
                sale.created_at
              ).toLocaleString()
            : "",

          sale.product_name || "",

          sale.customer_name || "Walk-in",

          String(
            Number(
              sale.quantity || 0
            )
          ),

          String(
            Number(
              sale.total_amount || 0
            )
          ),
        ]);
      });

      rows.push([]);

      /* PRODUCTION */

      rows.push([
        "PRODUCTION",
      ]);

      rows.push([
        "Date",
        "Product",
        "Shift",
        "Batch",
        "Dough Batches",
        "Produced",
        "Waste",
        "Net Production",
      ]);

      production.forEach((item: any) => {
        const produced =
          Number(item.quantity || 0);

        const waste =
          Number(
            item.waste_quantity || 0
          );

        rows.push([
          item.created_at
            ? new Date(
                item.created_at
              ).toLocaleString()
            : "",

          item.bread ||
            item.product_name ||
            "",

          item.shift || "",

          item.batch || "",

          String(
            Number(
              item.dough_batches || 0
            )
          ),

          String(produced),

          String(waste),

          String(
            produced - waste
          ),
        ]);
      });

      rows.push([]);

      /* EXPENSES */

      rows.push([
        "EXPENSES",
      ]);

      rows.push([
        "Date",
        "Description",
        "Amount",
      ]);

      expenses.forEach((expense: any) => {
        rows.push([
          expense.created_at
            ? new Date(
                expense.created_at
              ).toLocaleString()
            : "",

          expense.description ||
            expense.category ||
            "",

          String(
            Number(
              expense.amount || 0
            )
          ),
        ]);
      });

      rows.push([]);

      /* INVENTORY */

      rows.push([
        "CURRENT INVENTORY",
      ]);

      rows.push([
        "Material",
        "Quantity",
        "Unit Cost",
      ]);

      inventory.forEach((item: any) => {
        rows.push([
          item.name ||
            item.material_name ||
            "",

          String(
            Number(
              item.quantity ||
                item.current_stock ||
                0
            )
          ),

          String(
            Number(
              item.unit_cost || 0
            )
          ),
        ]);
      });

      /* CSV ESCAPING */

      const csv = rows
        .map((row) =>
          row
            .map((value) => {
              const text =
                String(value ?? "");

              return `"${text.replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `IRUKA-Analytics-${period}-${new Date()
          .toISOString()
          .split("T")[0]}.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Report export error:",
        error
      );

      alert(
        "Unable to export analytics report."
      );
    }
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <ProtectedRoute
      allowedRoles={[
        "admin",
        "management",
        "accountant",
      ]}
    >
      {loading ? (
        <div className="min-h-screen bg-slate-950" />
      ) : (
        <div className="min-h-screen bg-slate-950 p-6">

          {/* =====================================================
              HEADER
          ===================================================== */}

          <ExecutiveHeader
            period={period}
            setPeriod={setPeriod}
            onRefresh={fetchAnalytics}
            onExport={exportReport}
          />

          {/* =====================================================
              REVENUE + PRODUCTION
          ===================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

            <RevenueChart
              data={revenueChartData}
            />

            <ProductionChart
              data={productionChartData}
            />

          </div>

          {/* =====================================================
              SALES + CUSTOMER GROWTH
          ===================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

            <SalesChart
              data={salesChartData}
            />

            <CustomerGrowthChart
              data={
                customerPerformanceChartData
              }
            />

          </div>

          {/* =====================================================
              INVENTORY
          ===================================================== */}

          <div className="mt-8">

            <InventoryChart
              data={inventoryChartData}
            />

          </div>

          {/* =====================================================
              BEST SELLING + TOP CUSTOMERS
          ===================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

            <BestSellingProducts
              products={
                bestSellingProducts
              }
            />

            <TopCustomers
              customers={topCustomers}
            />

          </div>

          {/* =====================================================
              CUSTOMER ANALYTICS
          ===================================================== */}

          <div className="mt-8">

            <CustomerAnalytics
              customers={customers}
              orders={orders}
            />

          </div>

        </div>
      )}
    </ProtectedRoute>
  );
}