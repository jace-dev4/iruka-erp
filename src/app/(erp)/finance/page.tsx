
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import {
  CalendarDays,
  ChevronDown,
  RefreshCw,
  X,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { Toaster, toast } from "sonner";

import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function FinancePage() {
  // ===============================
  // DATA
  // ===============================

  const [showPL, setShowPL] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showCashFlow, setShowCashFlow] = useState(false);

  const [title, setTitle] = useState("");

  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const [reportPeriod, setReportPeriod] = useState("week");

  const [lastUpdated, setLastUpdated] = useState(new Date());

  const PERIOD_OPTIONS = [
  { key: "day", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

  // ===============================
  // EXPENSE FORM
  // ===============================

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // ===============================
  // FINANCE SUMMARY
  // ===============================

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [cashAvailable, setCashAvailable] = useState(0);
  const [debtRepayments, setDebtRepayments] = useState(0);

  // ===============================
  // TODAY SUMMARY
  // ===============================

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [cashFlow, setCashFlow] = useState(0);

  // ===============================
  // MONTHLY SUMMARY
  // ===============================

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  // ===============================
  // LOADING
  // ===============================

  const [loading, setLoading] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

    // ===============================
  // EDIT / DELETE EXPENSE
  // ===============================

  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const [showDeleteExpenseModal, setShowDeleteExpenseModal] =
    useState(false);

  const [expenseToDelete, setExpenseToDelete] =
    useState<any | null>(null);

  const [editExpenseTitle, setEditExpenseTitle] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseCategory, setEditExpenseCategory] = useState("");
  const [editExpenseDescription, setEditExpenseDescription] =
    useState("");

  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseDeleting, setExpenseDeleting] = useState(false);

  // ===============================
  // LOAD DATA
  // ===============================

  useEffect(() => {
    fetchFinance();
  }, [reportPeriod]);

  /* =========================
   LIVE DATE & TIME
========================= */

useEffect(() => {
  const timer = setInterval(() => {
    setLastUpdated(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

  // ===============================
  // SUPABASE REALTIME
  // ===============================

  useEffect(() => {
    const channel = supabase
      .channel("finance-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          fetchFinance();
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
          fetchFinance();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "debtor_payments",
        },
        () => {
          fetchFinance();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_transactions",
        },
        () => {
          fetchFinance();
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
          fetchFinance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportPeriod]);

  // ===============================
  // MANUAL REFRESH
  // ===============================

  async function handleRefresh() {
    await fetchFinance();
  }

  // ===============================
  // FETCH FINANCE DATA
  // ===============================

  async function fetchFinance() {
    setLoading(true);

    try {
      // ===============================
      // SALES
      // ===============================

      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select("*");

      if (salesError) throw salesError;

      // ===============================
      // DEBT REPAYMENTS
      // ===============================

      const {
        data: debtorPaymentsData,
        error: debtorPaymentsError,
      } = await supabase
        .from("debtor_payments")
        .select("*")
        .order("payment_date", {
          ascending: false,
        });

      if (debtorPaymentsError) {
        throw debtorPaymentsError;
      }

      // ===============================
      // EXPENSES
      // ===============================

      const {
        data: expenseData,
        error: expenseError,
      } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (expenseError) throw expenseError;

      const allSales = salesData || [];
      const allExpenses = expenseData || [];
      const allDebtorPayments =
        debtorPaymentsData || [];

      const now = new Date();

      let salesList = allSales;
      let expenseList = allExpenses;
      let debtorPaymentList =
        allDebtorPayments;

      // ===============================
      // FILTER BY REPORTING PERIOD
      // ===============================

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);

      const dayOfWeek = weekStart.getDay();

      const daysFromMonday =
        dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      weekStart.setDate(
        weekStart.getDate() - daysFromMonday
      );

      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      monthStart.setHours(0, 0, 0, 0);

      const yearStart = new Date(
        now.getFullYear(),
        0,
        1
      );

      yearStart.setHours(0, 0, 0, 0);

      let periodStart = todayStart;

      if (reportPeriod === "week") {
        periodStart = weekStart;
      } else if (reportPeriod === "month") {
        periodStart = monthStart;
      } else if (reportPeriod === "year") {
        periodStart = yearStart;
      }

      salesList = allSales.filter((sale) => {
        if (!sale.created_at) return false;

        return (
          new Date(sale.created_at) >= periodStart
        );
      });

      expenseList = allExpenses.filter(
        (expense) => {
          if (!expense.created_at) return false;

          return (
            new Date(expense.created_at) >=
            periodStart
          );
        }
      );

      debtorPaymentList =
        allDebtorPayments.filter(
          (payment) => {
            if (!payment.payment_date) return false;

            return (
              new Date(payment.payment_date) >=
              periodStart
            );
          }
        );

      setSales(salesList);
      setExpenses(expenseList);



      // ==========================================================
      // ACCOUNTING LOGIC
      // ==========================================================
      //
      // SALES = REVENUE
      //
      // Debtor repayments are NOT revenue.
      // The original credit sale already belongs to revenue
      // when the sale was recorded.
      //
      // MATERIAL COST:
      // Material purchases/costs are already recorded inside
      // the expenses table.
      //
      // Therefore:
      //
      // NET PROFIT =
      // SALES REVENUE - ALL EXPENSES
      //
      // Inventory AUTO_DEDUCTION / ISSUED transactions are
      // inventory movements, NOT additional expenses.
      //
      // ==========================================================

      // ===============================
      // SALES REVENUE
      // ===============================

      const salesRevenue = salesList.reduce(
        (sum, sale) =>
          sum +
          Number(sale.total_amount || 0),
        0
      );

      // ===============================
      // DEBTOR REPAYMENTS
      // ===============================
      //
      // These affect CASH FLOW only.
      // They do NOT increase revenue.
      //
      // ===============================

      const debtRepayments =
        debtorPaymentList.reduce(
          (sum, payment) =>
            sum +
            Number(payment.amount_paid || 0),
          0
        );

      setDebtRepayments(debtRepayments);

      // ===============================
      // TOTAL EXPENSES
      // ===============================
      //
      // IMPORTANT:
      // This already includes:
      //
      // Flour Purchase
      // Material
      // Packaging
      // Fuel / Diesel
      // Electricity
      // Staff Salary
      // Staff Welfare
      // Transportation
      // Maintenance
      // Tax
      // Office Expense
      // Miscellaneous
      //
      // Therefore DO NOT add inventory material
      // cost again.
      //
      // ===============================

      const expenseTotal =
        expenseList.reduce(
          (sum, expense) =>
            sum +
            Number(expense.amount || 0),
          0
        );

      // ===============================
      // NET PROFIT
      // ===============================

      const profit =
        salesRevenue - expenseTotal;

      setTotalRevenue(salesRevenue);
      setTotalExpenses(expenseTotal);
      setNetProfit(profit);

      // ===============================
      // CASH AVAILABLE / PERIOD CASH
      // ===============================
      //
      // Sales cash
      // + debtor repayments
      // - all recorded expenses
      //
      // ===============================

      const periodCash =
        salesRevenue +
        debtRepayments -
        expenseTotal;

      setCashAvailable(periodCash);

      // ==========================================================
      // TODAY SUMMARY
      // ==========================================================

      const today =
        new Date()
          .toISOString()
          .split("T")[0];

      const todaySales =
        allSales.filter((sale) =>
          sale.created_at?.startsWith(today)
        );

      const todayExpenseList =
        allExpenses.filter((expense) =>
          expense.created_at?.startsWith(today)
        );

      const todayDebtorPayments =
        allDebtorPayments.filter(
          (payment) => {
            const paymentDate =
              new Date(payment.payment_date);

            return (
              paymentDate.getDate() ===
                now.getDate() &&
              paymentDate.getMonth() ===
                now.getMonth() &&
              paymentDate.getFullYear() ===
                now.getFullYear()
            );
          }
        );

      // ===============================
      // TODAY SALES
      // ===============================

      const todaySalesRevenue =
        todaySales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.total_amount || 0
            ),
          0
        );

      // ===============================
      // TODAY DEBT REPAYMENTS
      // ===============================

      const todayDebtRepaymentTotal =
        todayDebtorPayments.reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount_paid || 0
            ),
          0
        );

      // ===============================
      // TODAY EXPENSES
      // ===============================

      const todayExpenseTotal =
        todayExpenseList.reduce(
          (sum, expense) =>
            sum +
            Number(expense.amount || 0),
          0
        );

      // ===============================
      // TODAY PROFIT
      // ===============================
      //
      // Debtor repayments are excluded
      // because they are not revenue.
      //
      // ===============================

      const todayProfitTotal =
        todaySalesRevenue -
        todayExpenseTotal;

      setTodayRevenue(
        todaySalesRevenue
      );

      setTodayExpenses(
        todayExpenseTotal
      );

      setTodayProfit(
        todayProfitTotal
      );

      // ===============================
      // TODAY CASH FLOW
      // ===============================
      //
      // Sales cash
      // + debtor collections
      // - all expenses
      //
      // Material is NOT added separately.
      //
      // ===============================

      const todayCashIn =
        todaySalesRevenue +
        todayDebtRepaymentTotal;

      const todayCashOut =
        todayExpenseTotal;

      const todayNetCashFlow =
        todayCashIn -
        todayCashOut;

      setCashFlow(
        todayNetCashFlow
      );

      // ===============================
      // MONTHLY SUMMARY
      // ===============================

      setMonthlyRevenue(
        salesRevenue
      );

      setMonthlyExpenses(
        expenseTotal
      );

      setLastUpdated(
        new Date()
      );
    } catch (error: any) {
      console.error(
        "Finance Error:",
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

// ===============================
// ADD EXPENSE
// ===============================

async function addExpense() {
  if (expenseSubmitting) return;

  if (!title.trim()) {
    toast.error("Expense title is required", {
      description: "Please enter a title for this expense.",
    });
    return;
  }

  if (!amount || Number(amount) <= 0) {
    toast.error("Invalid expense amount", {
      description: "Please enter an amount greater than ₦0.",
    });
    return;
  }

  if (!category) {
    toast.error("Expense category is required", {
      description: "Please select a category before recording the expense.",
    });
    return;
  }

  setExpenseSubmitting(true);

  try {
    const { error } = await supabase
      .from("expenses")
      .insert([
        {
          title: title.trim(),
          amount: Number(amount),
          category,
          description: description.trim(),
        },
      ]);

    if (error) {
      throw error;
    }

    setTitle("");
    setAmount("");
    setCategory("");
    setDescription("");

    toast.success("Expense recorded successfully", {
      description: `${title.trim()} has been added to your financial records.`,
    });

    await fetchFinance();
  } catch (error: any) {
    console.error("Add Expense Error:", error);

    toast.error("Unable to record expense", {
      description:
        error?.message ||
        "Something went wrong while saving the expense.",
    });
  } finally {
    setExpenseSubmitting(false);
  }
}

  // ===============================
  // EDIT EXPENSE
  // ===============================

  function openEditExpense(expense: any) {
    setEditingExpense(expense);

    setEditExpenseTitle(expense.title || "");
    setEditExpenseAmount(String(expense.amount || ""));
    setEditExpenseCategory(expense.category || "");
    setEditExpenseDescription(expense.description || "");
  }

  function closeEditExpense() {
    if (expenseSaving) return;

    setEditingExpense(null);
    setEditExpenseTitle("");
    setEditExpenseAmount("");
    setEditExpenseCategory("");
    setEditExpenseDescription("");
  }

  async function updateExpense() {
    if (expenseSaving || !editingExpense) return;

    if (!editExpenseTitle.trim()) {
      toast.error("Expense title is required", {
        description: "Please enter a title for this expense.",
      });
      return;
    }

    if (
      !editExpenseAmount ||
      Number(editExpenseAmount) <= 0
    ) {
      toast.error("Invalid expense amount", {
        description: "Please enter an amount greater than ₦0.",
      });
      return;
    }

    if (!editExpenseCategory) {
      toast.error("Expense category is required", {
        description: "Please select an expense category.",
      });
      return;
    }

    setExpenseSaving(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          title: editExpenseTitle.trim(),
          amount: Number(editExpenseAmount),
          category: editExpenseCategory,
          description: editExpenseDescription.trim(),
        })
        .eq("id", editingExpense.id);

      if (error) {
        throw error;
      }

      toast.success("Expense updated successfully", {
        description: `${editExpenseTitle.trim()} has been updated.`,
      });

      closeEditExpense();

      await fetchFinance();
    } catch (error: any) {
      console.error("Update Expense Error:", error);

      toast.error("Unable to update expense", {
        description:
          error?.message ||
          "Something went wrong while updating the expense.",
      });
    } finally {
      setExpenseSaving(false);
    }
  }

  // ===============================
  // DELETE EXPENSE
  // ===============================

  function openDeleteExpense(expense: any) {
    setExpenseToDelete(expense);
    setShowDeleteExpenseModal(true);
  }

  function closeDeleteExpense() {
    if (expenseDeleting) return;

    setExpenseToDelete(null);
    setShowDeleteExpenseModal(false);
  }

  async function deleteExpense() {
    if (expenseDeleting || !expenseToDelete) return;

    setExpenseDeleting(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseToDelete.id);

      if (error) {
        throw error;
      }

      toast.success("Expense deleted successfully", {
        description: `"${expenseToDelete.title}" has been removed from your financial records.`,
      });

      setExpenseToDelete(null);
      setShowDeleteExpenseModal(false);

      await fetchFinance();
    } catch (error: any) {
      console.error("Delete Expense Error:", error);

      toast.error("Unable to delete expense", {
        description:
          error?.message ||
          "Something went wrong while deleting the expense.",
      });
    } finally {
      setExpenseDeleting(false);
    }
  }

  // ===============================
  // REPORT PERIOD LABEL
  // ===============================

  const reportPeriodLabel =
    reportPeriod === "day"
      ? "Today"
      : reportPeriod === "week"
      ? "This Week"
      : reportPeriod === "month"
      ? "This Month"
      : "This Year";

  // ===============================
  // REPORT MODAL
  // ===============================

  function ReportModal({
    type,
    onClose,
  }: {
    type:
      | "pl"
      | "income"
      | "cashflow";
    onClose: () => void;
  }) {
    const isPL = type === "pl";
    const isIncome = type === "income";

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#122C4B] border border-white/10 shadow-2xl">

          <button
            onClick={onClose}
            className="absolute right-6 top-6 w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X size={22} />
          </button>

          <div className="p-10">

            {/* REPORT HEADER */}

            <div className="border-b border-white/10 pb-8 mb-8">

              <p className="text-xs uppercase tracking-[0.25em] text-blue-300 font-bold">
                NKIRUKA INDUSTRIES LTD.
              </p>

              <h2 className="text-4xl font-black text-white mt-3">
                {isPL
                  ? "Profit & Loss Statement"
                  : isIncome
                  ? "Income Statement"
                  : "Cash Flow Statement"}
              </h2>

              <p className="text-slate-400 mt-3">
                Reporting Period:{" "}
                <span className="text-white font-semibold">
                  {reportPeriodLabel}
                </span>
              </p>

            </div>

            {/* PROFIT & LOSS */}

            {isPL && (
              <div className="space-y-5">

                {/* SALES REVENUE */}

                <div className="flex justify-between items-center rounded-2xl bg-white/5 border border-white/10 px-7 py-5">

                  <span className="text-slate-300">
                    Sales Revenue
                  </span>

                  <span className="text-xl font-black text-emerald-400">
                    ₦
                    {sales
                      .reduce(
                        (sum, sale) =>
                          sum +
                          Number(
                            sale.total_amount ||
                              0
                          ),
                        0
                      )
                      .toLocaleString()}
                  </span>

                </div>

                {/* DEBT REPAYMENTS */}

                <div className="flex justify-between items-center rounded-2xl bg-blue-500/10 border border-blue-500/20 px-7 py-5">

                  <div>
                    <span className="text-slate-300">
                      Debtor Repayments
                    </span>

                    <p className="text-xs text-slate-500 mt-1">
                      Cash collection only — not new revenue
                    </p>
                  </div>

                  <span className="text-xl font-black text-blue-400">
                    ₦
                    {debtRepayments.toLocaleString()}
                  </span>

                </div>

                {/* BUSINESS EXPENSES */}

                <div className="flex justify-between items-center rounded-2xl bg-red-500/10 border border-red-500/20 px-7 py-5">

                  <div>
                    <span className="text-slate-300">
                      Business Expenses
                    </span>

                    <p className="text-xs text-slate-500 mt-1">
                      Includes materials, flour, fuel, salaries and all recorded expenses
                    </p>
                  </div>

                  <span className="text-xl font-black text-red-400">
                    ₦
                    {expenses
                      .reduce(
                        (sum, expense) =>
                          sum +
                          Number(
                            expense.amount ||
                              0
                          ),
                        0
                      )
                      .toLocaleString()}
                  </span>

                </div>

                <div className="border-t border-white/10 pt-5">

                  <div className="flex justify-between items-center rounded-3xl bg-yellow-500/10 border border-yellow-500/20 px-7 py-7">

                    <div>
                      <span className="text-xl font-bold text-white">
                        Net Profit
                      </span>

                      <p className="text-xs text-slate-500 mt-2">
                        Sales Revenue − Total Expenses
                      </p>
                    </div>

                    <span className="text-4xl font-black text-yellow-400">
                      ₦
                      {netProfit.toLocaleString()}
                    </span>

                  </div>

                </div>

              </div>
            )}

            {/* INCOME STATEMENT */}

            {isIncome && (
              <div className="space-y-5">

                <div className="rounded-3xl bg-white/5 border border-white/10 p-7">

                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Operating Income
                  </p>

                  <h3 className="text-4xl font-black text-emerald-400 mt-3">
                    ₦
                    {totalRevenue.toLocaleString()}
                  </h3>

                  <p className="text-xs text-slate-500 mt-3">
                    Sales revenue only
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 border border-white/10 p-7">

                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Operating Costs
                  </p>

                  <h3 className="text-4xl font-black text-red-400 mt-3">
                    ₦
                    {totalExpenses.toLocaleString()}
                  </h3>

                  <p className="text-xs text-slate-500 mt-3">
                    All expenses including material costs
                  </p>

                </div>

                <div className="rounded-3xl bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/20 p-7">

                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">
                    Net Income
                  </p>

                  <h3 className="text-5xl font-black text-white mt-3">
                    ₦
                    {netProfit.toLocaleString()}
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6">

                    <p className="text-slate-400 text-sm">
                      Revenue
                    </p>

                    <p className="text-2xl font-black text-emerald-400 mt-2">
                      ₦
                      {totalRevenue.toLocaleString()}
                    </p>

                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6">

                    <p className="text-slate-400 text-sm">
                      Profit Margin
                    </p>

                    <p className="text-2xl font-black text-yellow-400 mt-2">

                      {totalRevenue > 0
                        ? (
                            (netProfit /
                              totalRevenue) *
                            100
                          ).toFixed(1)
                        : "0.0"}

                      %

                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* CASH FLOW */}

            {!isPL && !isIncome && (
              <div className="space-y-5">

                {/* MONEY IN */}

                <div className="flex justify-between items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-7 py-6">

                  <div>

                    <p className="text-slate-300">
                      Money In
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Sales + debtor repayments
                    </p>

                  </div>

                  <span className="text-3xl font-black text-emerald-400">

                    ₦
                    {(
                      totalRevenue +
                      debtRepayments
                    ).toLocaleString()}

                  </span>

                </div>

                {/* MONEY OUT */}

                <div className="flex justify-between items-center rounded-2xl bg-red-500/10 border border-red-500/20 px-7 py-6">

                  <div>

                    <p className="text-slate-300">
                      Money Out
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      All recorded business expenses
                    </p>

                  </div>

                  <span className="text-3xl font-black text-red-400">

                    ₦
                    {totalExpenses.toLocaleString()}

                  </span>

                </div>

                <div className="border-t border-white/10 pt-5">

                  <div className="rounded-3xl bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 p-8">

                    <p className="text-slate-300 text-sm uppercase tracking-[0.2em]">
                      Net Cash Flow
                    </p>

                    <h3 className="text-5xl font-black text-white mt-3">

                      ₦
                      {(
                        totalRevenue +
                        debtRepayments -
                        totalExpenses
                      ).toLocaleString()}

                    </h3>

                  </div>

                </div>

              </div>
            )}

            <div className="mt-10 pt-6 border-t border-white/10 flex justify-end">

              <button
                onClick={onClose}
                className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-8 py-4 text-white font-bold transition"
              >
                Close Report
              </button>

            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute
      allowedRoles={[
        "admin",
        "accountant",
      ]}
    >
      <Toaster
  position="top-right"
  expand={true}
  richColors
  closeButton
  toastOptions={{
    style: {
      background: "#0D1728",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#ffffff",
      borderRadius: "18px",
      boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    },
  }}
/>
      <div className="min-h-screen bg-slate-200 p-8">

        {/* ==========================
            PREMIUM HEADER
        ========================== */}

        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0B1F3A] to-[#102B52] p-10 mb-10 shadow-2xl border border-white/10">

          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute -bottom-28 -left-24 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="absolute right-10 top-6 w-40 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 rotate-[-18deg]" />

          <div className="absolute right-8 top-10 w-40 h-[2px] rounded-full bg-yellow-200/60 rotate-[-18deg]" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">

            <div className="flex items-center gap-6">

              <div className="relative">

                <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-xl scale-150" />

                <div className="relative w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">

                  <Image
                    src="/logo/nkiruka-logo.png"
                    alt="NKIRUKA"
                    width={70}
                    height={70}
                  />

                </div>

              </div>

              <div>

                <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                  Finance Department
                </span>

                <h1 className="text-5xl font-black text-white mt-4 tracking-tight">
                  Finance Management
                </h1>

                <p className="text-slate-300 text-lg mt-3 max-w-2xl leading-8">
                  Manage revenue, expenses, profitability, cash flow and financial reports for NKIRUKA INDUSTRIES LTD.
                </p>

              </div>

            </div>

            <div className="flex flex-wrap gap-5">

              {/* REFRESH */}

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5 min-w-[170px] text-white font-bold hover:bg-white/10 transition flex items-center justify-center gap-3"
              >

                <RefreshCw
                  size={20}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                {loading
                  ? "Refreshing..."
                  : "Refresh Data"}

              </button>


              {/* REPORTING PERIOD */}

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5 min-w-[250px]">

                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Reporting Period
                </p>

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-xl flex items-center">

                  {PERIOD_OPTIONS.map(
                    (option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() =>
                          setReportPeriod(
                            option.key
                          )
                        }
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                          reportPeriod ===
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

              </div>


              {/* LAST UPDATED */}

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-7 py-5 min-w-[250px]">

                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Last Updated
                </p>

                <p className="text-white text-xl font-bold mt-3">
                  {lastUpdated.toLocaleDateString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}{" "}
                  {lastUpdated.toLocaleTimeString(
                    "en-GB",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }
                  )}
                </p>

                <p className="text-emerald-400 text-sm mt-2 font-medium">
                  ● Live Financial Data
                </p>

              </div>

            </div>

          </div>

        </div>
        {/* ==========================
            PREMIUM FINANCE KPI
        ========================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7 mb-7">

          <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-[1px] shadow-2xl">

            <div className="h-full rounded-[30px] bg-[#0D1728] p-7">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-emerald-300 text-sm uppercase tracking-[0.25em]">
                    Revenue
                  </p>

                  <h2 className="text-4xl font-black text-white mt-4">
                    ₦
                    {totalRevenue.toLocaleString()}
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">
                  💰
                </div>

              </div>

            </div>

          </div>

          <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-red-500 to-rose-700 p-[1px] shadow-2xl">

            <div className="h-full rounded-[30px] bg-[#0D1728] p-7">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-red-300 text-sm uppercase tracking-[0.25em]">
                    Expenses
                  </p>

                  <h2 className="text-4xl font-black text-white mt-4">
                    ₦
                    {totalExpenses.toLocaleString()}
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-3xl">
                  💸
                </div>

              </div>

            </div>

          </div>

          <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-yellow-400 to-amber-600 p-[1px] shadow-2xl">

            <div className="h-full rounded-[30px] bg-[#0D1728] p-7">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-yellow-300 text-sm uppercase tracking-[0.25em]">
                    Net Profit
                  </p>

                  <h2 className="text-4xl font-black text-white mt-4">
                    ₦
                    {netProfit.toLocaleString()}
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-3xl">
                  📈
                </div>

              </div>

            </div>

          </div>

          <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-cyan-400 to-blue-700 p-[1px] shadow-2xl">

            <div className="h-full rounded-[30px] bg-[#0D1728] p-7">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-cyan-300 text-sm uppercase tracking-[0.25em]">
                    Cash Available
                  </p>

                  <h2 className="text-4xl font-black text-white mt-4">
                    ₦
                    {cashAvailable.toLocaleString()}
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-3xl">
                  🏦
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ==========================
            TODAY SUMMARY
        ========================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7 mb-10">

          <div className="rounded-[28px] border border-white/10 bg-[#101D33] p-6 shadow-xl">

            <p className="text-slate-400 uppercase text-xs tracking-[0.2em]">
              Today Revenue
            </p>

            <h3 className="text-3xl font-black text-emerald-400 mt-4">
              ₦
              {todayRevenue.toLocaleString()}
            </h3>

          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#101D33] p-6 shadow-xl">

            <p className="text-slate-400 uppercase text-xs tracking-[0.2em]">
              Today Expenses
            </p>

            <h3 className="text-3xl font-black text-red-400 mt-4">
              ₦
              {todayExpenses.toLocaleString()}
            </h3>

          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#101D33] p-6 shadow-xl">

            <p className="text-slate-400 uppercase text-xs tracking-[0.2em]">
              Today Profit
            </p>

            <h3 className="text-3xl font-black text-yellow-400 mt-4">
              ₦
              {todayProfit.toLocaleString()}
            </h3>

          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#101D33] p-6 shadow-xl">

            <p className="text-slate-400 uppercase text-xs tracking-[0.2em]">
              Cash Flow
            </p>

            <h3 className="text-3xl font-black text-cyan-400 mt-4">
              ₦
              {cashFlow.toLocaleString()}
            </h3>

          </div>

        </div>

        {/* ==========================
            PREMIUM EXPENSE RECORDING
        ========================== */}

        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0D1D34] to-[#132B4A] border border-white/10 shadow-2xl mb-10">

          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative p-10">

            <div className="flex items-center justify-between mb-10">

              <div>

                <span className="inline-flex px-4 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-bold uppercase tracking-[0.25em]">
                  Expense Management
                </span>

                <h2 className="text-4xl font-black text-white mt-4">
                  Record New Expense
                </h2>

                <p className="text-slate-400 mt-3 text-lg">
                  Record every business expense to maintain accurate financial records.
                </p>

              </div>

              <div className="w-20 h-20 rounded-3xl bg-red-500/15 flex items-center justify-center text-5xl">
                💳
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

              <div>

                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Expense Title
                </label>

                <input
                  type="text"
                  placeholder="Diesel Purchase"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#162844] text-white px-5 py-4 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Amount
                </label>

                <input
                  type="number"
                  placeholder="₦0.00"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#162844] text-white px-5 py-4 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />

              </div>

              {/* Category */}

              <div>

                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#162844] text-white px-5 py-4 outline-none"
                >

                  <option value="">
                    Select Category
                  </option>

                  <option>
                    Flour Purchase
                  </option>

                  <option>
                    Material
                  </option>

                  <option>
                    Transportation
                  </option>

                  <option>
                    Fuel / Diesel
                  </option>

                  <option>
                    Electricity
                  </option>

                  <option>
                    Staff Salary
                  </option>

                  <option>
                    Staff Welfare
                  </option>

                  <option>
                    Maintenance
                  </option>

                  <option>
                    Packaging
                  </option>

                  <option>
                    Tax
                  </option>

                  <option>
                    Office Expense
                  </option>

                  <option>
                    Miscellaneous
                  </option>

                </select>

              </div>

              {/* Description */}

              <div className="lg:col-span-2">

                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Description
                </label>

                <textarea
                  placeholder="Add additional details about this expense..."
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#162844] text-white px-5 py-4 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none"
                />

              </div>

            </div>

            <div className="flex justify-end mt-10">

<button
  type="button"
  onClick={addExpense}
  disabled={expenseSubmitting}
  className={`group relative inline-flex min-w-[220px] items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-4 text-white font-bold shadow-2xl transition-all duration-300 ${
    expenseSubmitting
      ? "cursor-not-allowed bg-slate-700/80 opacity-80"
      : "bg-gradient-to-r from-blue-700 via-blue-800 to-[#102A4D] hover:from-blue-600 hover:via-blue-700 hover:to-[#163B68] hover:-translate-y-0.5 hover:shadow-blue-900/40"
  }`}
>
  {!expenseSubmitting && (
    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  )}

  {expenseSubmitting ? (
    <>
      <Loader2
        size={20}
        className="relative animate-spin"
      />

      <span className="relative">
        Recording Expense...
      </span>
    </>
  ) : (
    <>
      <span className="relative text-xl leading-none">
        +
      </span>

      <span className="relative">
        Record Expense
      </span>
    </>
  )}
</button>

            </div>

          </div>

        </div>

        {/* ==========================
            PREMIUM FINANCIAL SUMMARY
        ========================== */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">

          {/* Revenue Summary */}

          <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#132C4A] border border-white/10 shadow-2xl">

            <div className="absolute -top-20 -right-16 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative p-8">

              <div className="flex items-center justify-between mb-8">

                <div>

                  <span className="inline-flex px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-[0.25em]">
                    Financial Overview
                  </span>

                  <h2 className="text-3xl font-black text-white mt-4">
                    Revenue vs Expenses
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-3xl">
                  📊
                </div>

              </div>

              <div className="space-y-7">

                <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-6 py-5">

                  <span className="text-slate-300 font-medium">
                    Total Revenue
                  </span>

                  <span className="text-3xl font-black text-emerald-400">
                    ₦
                    {totalRevenue.toLocaleString()}
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-6 py-5">

                  <span className="text-slate-300 font-medium">
                    Total Expenses
                  </span>

                  <span className="text-3xl font-black text-red-400">
                    ₦
                    {totalExpenses.toLocaleString()}
                  </span>

                </div>

                <div className="h-px bg-white/10" />

                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/20 px-6 py-6">

                  <span className="text-lg font-bold text-white">
                    Net Profit
                  </span>

                  <span className="text-4xl font-black text-yellow-400">
                    ₦
                    {netProfit.toLocaleString()}
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* Cash Flow */}

          <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#102040] to-[#12355D] border border-white/10 shadow-2xl">

            <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative p-8">

              <div className="flex items-center justify-between mb-8">

                <div>

                  <span className="inline-flex px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-[0.25em]">
                    Cash Position
                  </span>

                  <h2 className="text-3xl font-black text-white mt-4">
                    Cash Flow Summary
                  </h2>

                </div>

                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-3xl">
                  🏦
                </div>

              </div>

              <div className="space-y-7">

                <div className="flex justify-between items-center rounded-2xl bg-white/5 border border-white/10 px-6 py-5">

                  <span className="text-slate-300">
                    Money In
                  </span>

                  <span className="text-2xl font-black text-emerald-400">

                    ₦
                    {(
                      totalRevenue +
                      debtRepayments
                    ).toLocaleString()}

                  </span>

                </div>

                <div className="flex justify-between items-center rounded-2xl bg-white/5 border border-white/10 px-6 py-5">

                  <span className="text-slate-300">
                    Money Out
                  </span>

                  <span className="text-2xl font-black text-red-400">

                    ₦
                    {totalExpenses.toLocaleString()}

                  </span>

                </div>

                <div className="h-px bg-white/10" />

                <div className="rounded-3xl bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 p-7">

                  <p className="text-slate-300 text-sm uppercase tracking-[0.2em]">
                    Available Cash
                  </p>

                  <h2 className="text-5xl font-black text-white mt-3">

                    ₦
                    {cashAvailable.toLocaleString()}

                  </h2>

                  <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">

                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ==========================
            PREMIUM FINANCIAL REPORTS
        ========================== */}

        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#122C4B] border border-white/10 shadow-2xl mb-10">

          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative p-10">

            <div className="flex items-center justify-between mb-10">

              <div>

                <span className="inline-flex px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-[0.25em]">
                  Executive Reports
                </span>

                <h2 className="text-4xl font-black text-white mt-4">
                  Financial Statements
                </h2>

                <p className="text-slate-400 mt-3 text-lg">
                  Generate official accounting reports for management and executive decision making.
                </p>

              </div>

              <div className="w-20 h-20 rounded-3xl bg-yellow-500/15 flex items-center justify-center text-5xl">
                📑
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

              {/* Profit & Loss */}

              <button
                onClick={() =>
                  setShowPL(true)
                }
                className="group rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-yellow-400/40 hover:bg-white/10 transition-all duration-300 text-left"
              >

                <div className="flex items-center justify-between">

                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-3xl">
                    📈
                  </div>

                  <span className="text-yellow-300 text-xs uppercase tracking-[0.2em]">
                    Report
                  </span>

                </div>

                <h3 className="text-2xl font-black text-white mt-8">
                  Profit & Loss
                </h3>

                <p className="text-slate-400 mt-4 leading-7">
                  View revenue, expenses and overall profitability for the selected reporting period.
                </p>

              </button>

              {/* Income Statement */}

              <button
                onClick={() =>
                  setShowIncome(true)
                }
                className="group rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-emerald-400/40 hover:bg-white/10 transition-all duration-300 text-left"
              >

                <div className="flex items-center justify-between">

                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">
                    💹
                  </div>

                  <span className="text-emerald-300 text-xs uppercase tracking-[0.2em]">
                    Report
                  </span>

                </div>

                <h3 className="text-2xl font-black text-white mt-8">
                  Income Statement
                </h3>

                <p className="text-slate-400 mt-4 leading-7">
                  Review company income, operating costs and financial performance.
                </p>

              </button>

              {/* Cash Flow */}

              <button
                onClick={() =>
                  setShowCashFlow(true)
                }
                className="group rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-cyan-400/40 hover:bg-white/10 transition-all duration-300 text-left"
              >

                <div className="flex items-center justify-between">

                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-3xl">
                    🏦
                  </div>

                  <span className="text-cyan-300 text-xs uppercase tracking-[0.2em]">
                    Report
                  </span>

                </div>

                <h3 className="text-2xl font-black text-white mt-8">
                  Cash Flow Statement
                </h3>

                <p className="text-slate-400 mt-4 leading-7">
                  Monitor money entering and leaving the business throughout the reporting period.
                </p>

              </button>

            </div>

          </div>

        </div>

        {/* ==========================
            PREMIUM EXPENSE HISTORY
        ========================== */}

        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#122C4B] shadow-2xl">
          {/* Background glow effects */}
          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative p-6 md:p-10">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-red-400/30 bg-red-500/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  Financial Records
                </span>

                <h2 className="mt-4 text-3xl font-black text-white md:text-4xl">
                  Expense History
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                  View, manage, edit, and delete recorded company expenses.
                  All changes are saved to your financial records.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 sm:px-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                    Expense Records
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-red-400 sm:text-3xl">
                    {expenses.length.toLocaleString()}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Total transactions
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 sm:px-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                    Total Value
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-emerald-400 sm:text-3xl">
                    ₦
                    {Number(totalExpenses || 0).toLocaleString("en-NG", {
                      maximumFractionDigits: 2,
                    })}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Recorded expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Expense table */}
            <div className="overflow-x-auto rounded-3xl border border-white/10">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="bg-[#132844]">
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Expense
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Category
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Description
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Amount
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Date
                    </th>

                    <th className="px-6 py-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center px-6">
                          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                            <span className="text-4xl">📄</span>
                          </div>

                          <h3 className="text-2xl font-bold text-white">
                            No Expense Records
                          </h3>

                          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                            Your expense transactions will appear here after
                            you record your first expense.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-t border-white/5 transition-colors duration-200 hover:bg-white/[0.04]"
                      >
                        {/* Expense name */}
                        <td className="px-6 py-5">
                          <div>
                            <p className="font-semibold text-white">
                              {expense.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Expense ID #{expense.id}
                            </p>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-5">
                          <span className="inline-flex whitespace-nowrap rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300">
                            {expense.category || "Uncategorized"}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="max-w-[260px] px-6 py-5">
                          <p
                            className="break-words text-sm leading-6 text-slate-400"
                            title={expense.description || ""}
                          >
                            {expense.description?.trim() || "No description"}
                          </p>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-5">
                          <span className="whitespace-nowrap text-lg font-black text-red-400">
                            ₦
                            {Number(expense.amount || 0).toLocaleString(
                              "en-NG",
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-300">
                          {expense.created_at
                            ? new Date(
                                expense.created_at
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit expense */}
                            <button
                              type="button"
                              onClick={() => openEditExpense(expense)}
                              title="Edit expense"
                              aria-label={`Edit ${expense.title}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300 transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-200"
                            >
                              <Pencil size={17} />
                            </button>

                            {/* Delete expense */}
                            <button
                              type="button"
                              onClick={() => openDeleteExpense(expense)}
                              title="Delete expense"
                              aria-label={`Delete ${expense.title}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {expenses.length > 0 && (
              <div className="mt-5 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing{" "}
                  <span className="font-semibold text-slate-300">
                    {expenses.length.toLocaleString()}
                  </span>{" "}
                  expense record{expenses.length === 1 ? "" : "s"}.
                </p>

                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Changes are saved to your financial records.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ==========================
            REPORT MODALS
        ========================== */}

        {showPL && (
          <ReportModal
            type="pl"
            onClose={() =>
              setShowPL(false)
            }
          />
        )}

        {showIncome && (
          <ReportModal
            type="income"
            onClose={() =>
              setShowIncome(false)
            }
          />
        )}

        {showCashFlow && (
          <ReportModal
            type="cashflow"
            onClose={() =>
              setShowCashFlow(false)
            }
          />
        )}

                {/* ==========================
            EDIT EXPENSE MODAL
        ========================== */}

        {editingExpense && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">

            <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0D1728] shadow-2xl">

              <div className="flex items-center justify-between border-b border-white/10 px-7 py-6">

                <div>

                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Expense Management
                  </span>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    Edit Expense
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Update the details of this financial record.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closeEditExpense}
                  disabled={expenseSaving}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="space-y-6 p-7">

                {/* TITLE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Expense Title
                  </label>

                  <input
                    type="text"
                    value={editExpenseTitle}
                    onChange={(e) =>
                      setEditExpenseTitle(e.target.value)
                    }
                    placeholder="e.g. Diesel Purchase"
                    className="w-full rounded-2xl border border-white/10 bg-[#162844] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                </div>

                {/* AMOUNT */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Amount
                  </label>

                  <div className="relative">

                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={editExpenseAmount}
                      onChange={(e) =>
                        setEditExpenseAmount(e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-white/10 bg-[#162844] px-5 py-4 pl-10 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />

                  </div>

                </div>

                {/* CATEGORY */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Category
                  </label>

                  <select
                    value={editExpenseCategory}
                    onChange={(e) =>
                      setEditExpenseCategory(e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-[#162844] px-5 py-4 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >

                    <option value="">
                      Select Category
                    </option>

                    <option>Flour Purchase</option>
                    <option>Material</option>
                    <option>Transportation</option>
                    <option>Fuel / Diesel</option>
                    <option>Electricity</option>
                    <option>Staff Salary</option>
                    <option>Staff Welfare</option>
                    <option>Maintenance</option>
                    <option>Packaging</option>
                    <option>Tax</option>
                    <option>Office Expense</option>
                    <option>Miscellaneous</option>

                  </select>

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Description
                  </label>

                  <textarea
                    value={editExpenseDescription}
                    onChange={(e) =>
                      setEditExpenseDescription(e.target.value)
                    }
                    rows={4}
                    placeholder="Add additional details about this expense..."
                    className="w-full resize-none rounded-2xl border border-white/10 bg-[#162844] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 bg-black/10 px-7 py-5">

                <button
                  type="button"
                  onClick={closeEditExpense}
                  disabled={expenseSaving}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={updateExpense}
                  disabled={expenseSaving}
                  className={`inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl px-7 py-3 font-bold text-white shadow-xl transition-all duration-300 ${
                    expenseSaving
                      ? "cursor-not-allowed bg-slate-700 opacity-80"
                      : "bg-gradient-to-r from-blue-700 via-blue-800 to-[#102A4D] hover:-translate-y-0.5 hover:from-blue-600 hover:via-blue-700 hover:to-[#163B68]"
                  }`}
                >

                  {expenseSaving ? (

                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Saving Changes...
                    </>

                  ) : (

                    <>
                      <Pencil size={18} />

                      Save Changes
                    </>

                  )}

                </button>

              </div>

            </div>

          </div>

        )}

                {/* ==========================
            DELETE EXPENSE MODAL
        ========================== */}

        {showDeleteExpenseModal && expenseToDelete && (

          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">

            <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-red-400/20 bg-[#0D1728] shadow-2xl">

              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

              <div className="relative p-7">

                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">

                  <AlertTriangle
                    size={30}
                    className="text-red-400"
                  />

                </div>

                <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">
                  Permanent Action
                </span>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Delete Expense?
                </h2>

                <p className="mt-3 leading-7 text-slate-400">
                  You are about to permanently delete:
                </p>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">

                  <p className="font-bold text-white">
                    {expenseToDelete.title}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {expenseToDelete.category}
                  </p>

                  <p className="mt-3 text-xl font-black text-red-400">
                    ₦
                    {Number(
                      expenseToDelete.amount || 0
                    ).toLocaleString()}
                  </p>

                </div>

                <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3">

                  <p className="text-sm leading-6 text-amber-300">
                    This action cannot be undone. The expense will be removed from your financial records.
                  </p>

                </div>

                <div className="mt-7 flex gap-3">

                  <button
                    type="button"
                    onClick={closeDeleteExpense}
                    disabled={expenseDeleting}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={deleteExpense}
                    disabled={expenseDeleting}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-white shadow-xl transition-all ${
                      expenseDeleting
                        ? "cursor-not-allowed bg-red-950/60 opacity-80"
                        : "bg-gradient-to-r from-red-700 to-red-900 hover:-translate-y-0.5 hover:from-red-600 hover:to-red-800"
                    }`}
                  >

                    {expenseDeleting ? (

                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Deleting...
                      </>

                    ) : (

                      <>
                        <Trash2 size={18} />

                        Delete Expense
                      </>

                    )}

                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>
    </ProtectedRoute>
  );
}