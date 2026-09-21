"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Users,
  Wallet,
  AlertTriangle,
  Search,
  Plus,
} from "lucide-react";

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  

  // ================================
// VIEW / PAYMENT STATES
// ================================

const [selectedDebtor, setSelectedDebtor] = useState<any>(null);

const [viewModalOpen, setViewModalOpen] = useState(false);

const [paymentModalOpen, setPaymentModalOpen] = useState(false);

const [paymentAmount, setPaymentAmount] = useState("");

const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchDebtors();
  }, []);

  async function fetchDebtors() {
    setLoading(true);

    const { data } = await supabase
      .from("debtors")
      .select("*")
      .order("id", { ascending: false });

    setDebtors(data || []);

    setLoading(false);
  }


  async function recordDebtorPayment() {
  if (!selectedDebtor) {
    alert("No debtor selected.");
    return;
  }

  const amount = Number(paymentAmount);

  if (!amount || amount <= 0) {
    alert("Enter a valid payment amount.");
    return;
  }

  const currentDebt = Number(
    selectedDebtor.balance || 0
  );

  if (amount > currentDebt) {
    alert(
      `Payment cannot be greater than the outstanding debt of ₦${currentDebt.toLocaleString()}.`
    );
    return;
  }

  setPaymentLoading(true);

  try {

    // ==========================================
    // FIND CUSTOMER'S OUTSTANDING ORDERS
    // ==========================================

    const {
      data: outstandingOrders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select("*")
      .eq("phone", selectedDebtor.phone)
      .in(
        "payment_status",
        [
          "Partially Paid",
          "Pending",
        ]
      )
      .order("created_at", {
        ascending: true,
      });

    if (ordersError) {
      throw ordersError;
    }

    let remainingPayment = amount;

    // ==========================================
    // APPLY PAYMENT TO ORDERS
    // ==========================================

    for (
      const order of outstandingOrders || []
    ) {

      if (remainingPayment <= 0) {
        break;
      }

      const total =
        Number(order.total_amount || 0);

      const alreadyPaid =
        Number(order.amount_paid || 0);

      const orderBalance =
        Math.max(
          total - alreadyPaid,
          0
        );

      if (orderBalance <= 0) {
        continue;
      }

      const paymentForOrder =
        Math.min(
          remainingPayment,
          orderBalance
        );

      const newAmountPaid =
        alreadyPaid +
        paymentForOrder;

      const newBalance =
        total -
        newAmountPaid;

      let newPaymentStatus =
        "Partially Paid";

      if (newBalance <= 0) {
        newPaymentStatus = "Paid";
      }

      // ========================================
      // UPDATE ORDER
      // ========================================

      const {
        error: updateOrderError,
      } = await supabase
        .from("orders")
        .update({
          amount_paid:
            newAmountPaid,

          payment_status:
            newPaymentStatus,
        })
        .eq(
          "id",
          order.id
        );

      if (updateOrderError) {
        throw updateOrderError;
      }

      remainingPayment -=
        paymentForOrder;
    }

    // ==========================================
    // CALCULATE NEW DEBTOR BALANCE
    // ==========================================

    const newDebtorBalance =
      Math.max(
        currentDebt - amount,
        0
      );

    const newDebtorStatus =
      newDebtorBalance === 0
        ? "Paid"
        : "Owing";

    // ==========================================
    // UPDATE DEBTOR
    // ==========================================

    const {
      error: debtorUpdateError,
    } = await supabase
      .from("debtors")
      .update({
        balance:
          newDebtorBalance,

        status:
          newDebtorStatus,
      })
      .eq(
        "id",
        selectedDebtor.id
      );

    if (debtorUpdateError) {
      throw debtorUpdateError;
    }

// ==========================================
// RECORD DEBTOR PAYMENT
// ==========================================

const {
  error: paymentRecordError,
} = await supabase
  .from("debtor_payments")
  .insert({
    debtor_id: selectedDebtor.id,
    amount_paid: amount,
    payment_date: new Date().toISOString(),
    notes: `Payment received from ${selectedDebtor.customer_name}`,
  });

if (paymentRecordError) {
  throw paymentRecordError;
}


// ==========================================
// RECORD PAYMENT IN FINANCE
// ==========================================

const {
  error: financeError,
} = await supabase
  .from("finance_transactions")
  .insert({
    transaction_type: "Debt Repayment",

    description:
      `Debt repayment received from ${selectedDebtor.customer_name}`,

    amount: amount,

    category: "Debt Recovery",

    reference:
      `DEBT-${selectedDebtor.id}-${Date.now()}`,

    payment_method: "Cash",

    status: "Completed",

    created_by:
      localStorage.getItem("full_name") ||
      "System",
  });

if (financeError) {
  throw financeError;
}

    // ==========================================
    // REFRESH
    // ==========================================

    setPaymentAmount("");

    setPaymentModalOpen(false);

    setSelectedDebtor(null);

    await fetchDebtors();

    alert(
      `Payment of ₦${amount.toLocaleString()} recorded successfully.\n\nRemaining balance: ₦${newDebtorBalance.toLocaleString()}`
    );

  } catch (error: any) {

    console.error(
      "Debtor payment error:",
      error
    );

    alert(
      error?.message ||
      "Unable to record debtor payment."
    );

  } finally {

    setPaymentLoading(false);
  }
}

  const totalDebt = debtors.reduce(
    (sum, debtor) => sum + Number(debtor.balance || 0),
    0
  );

  const overdueAccounts = debtors.filter(
    (d) =>
      d.status === "Overdue"
  ).length;

const filteredDebtors = useMemo(() => {
  const query = search.toLowerCase().trim();

  return debtors.filter((d) => {
    return (
      d.customer_name?.toLowerCase().includes(query) ||
      d.phone?.toLowerCase().includes(query) ||
      d.location?.toLowerCase().includes(query) ||
      d.status?.toLowerCase().includes(query)
    );
  });
}, [debtors, search]);
return (
  <ProtectedRoute
    allowedRoles={[
      "admin",
      "cashier",
    ]}
  >
    <div className="space-y-8">


{/* ==========================
    PREMIUM HEADER
========================== */}

<div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0B1F3A] to-[#102B52] p-10 shadow-2xl border border-white/10">

  {/* Background Glow */}

  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl" />

  <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl" />

  <div className="absolute right-10 top-6 w-40 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 rotate-[-18deg]" />

  <div className="absolute right-8 top-10 w-40 h-[2px] rounded-full bg-yellow-200/60 rotate-[-18deg]" />

  <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">

    {/* LEFT */}

    <div className="flex items-center gap-6">

      <div className="relative">

        <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-xl scale-150" />

        <div className="relative w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">

          <img
            src="/logo/nkiruka-logo.png"
            alt="NKIRUKA"
            className="w-16 h-16 object-contain"
          />

        </div>

      </div>

      <div>

        <span className="inline-flex items-center rounded-full bg-orange-500/20 border border-orange-400/30 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-orange-300">

          Credit Management

        </span>

        <h1 className="text-5xl font-black text-white mt-4 tracking-tight">

          Debtors Management

        </h1>

        <p className="text-slate-300 text-lg mt-3 max-w-2xl leading-8">

          Manage customer credit accounts, monitor outstanding balances, receive repayments and track overdue accounts across NKIRUKA INDUSTRIES LTD.

        </p>

      </div>

    </div>

    {/* RIGHT */}

    <div className="grid grid-cols-2 gap-5">

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5 min-w-[180px]">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

          Active Debtors

        </p>

        <h2 className="text-4xl font-black text-white mt-3">

          {debtors.length}

        </h2>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5 min-w-[180px]">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

          Outstanding Debt

        </p>

        <h2 className="text-3xl font-black text-red-400 mt-3">

          ₦{totalDebt.toLocaleString()}

        </h2>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

          Overdue

        </p>

        <h2 className="text-4xl font-black text-orange-400 mt-3">

          {overdueAccounts}

        </h2>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-5">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

          Credit Health

        </p>

        <h2 className="text-3xl font-black text-emerald-400 mt-3">

          {debtors.length === 0
            ? "100%"
            : `${Math.round(
                ((debtors.length - overdueAccounts) /
                  debtors.length) *
                  100
              )}%`}

        </h2>

      </div>

    </div>

  </div>

</div>

{/* ==========================
    PREMIUM KPI CARDS
========================== */}

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">

  {/* Total Debtors */}

  <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-500 to-indigo-700 p-[1px] shadow-2xl">

    <div className="rounded-[30px] bg-[#0D1728] p-7 h-full">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-blue-300 text-sm uppercase tracking-[0.25em]">

            Total Debtors

          </p>

          <h2 className="text-5xl font-black text-white mt-4">

            {debtors.length}

          </h2>

          <p className="text-slate-400 mt-3">

            Customer Credit Accounts

          </p>

        </div>

        <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center">

          <Users
            size={40}
            className="text-blue-300"
          />

        </div>

      </div>

    </div>

  </div>

  {/* Outstanding Debt */}

  <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-red-500 to-rose-700 p-[1px] shadow-2xl">

    <div className="rounded-[30px] bg-[#0D1728] p-7 h-full">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-red-300 text-sm uppercase tracking-[0.25em]">

            Outstanding Debt

          </p>

          <h2 className="text-4xl font-black text-white mt-4">

            ₦{totalDebt.toLocaleString()}

          </h2>

          <p className="text-slate-400 mt-3">

            Total Customer Balance

          </p>

        </div>

        <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center">

          <Wallet
            size={40}
            className="text-red-300"
          />

        </div>

      </div>

    </div>

  </div>

  {/* Overdue Accounts */}

  <div className="group relative overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-500 to-amber-700 p-[1px] shadow-2xl">

    <div className="rounded-[30px] bg-[#0D1728] p-7 h-full">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-orange-300 text-sm uppercase tracking-[0.25em]">

            Overdue Accounts

          </p>

          <h2 className="text-5xl font-black text-white mt-4">

            {overdueAccounts}

          </h2>

          <p className="text-slate-400 mt-3">

            Immediate Follow-up Required

          </p>

        </div>

        <div className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center">

          <AlertTriangle
            size={40}
            className="text-orange-300"
          />

        </div>

      </div>

    </div>

  </div>

</div>


{/* ==========================
    PREMIUM SEARCH
========================== */}

<div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#122C4B] border border-white/10 shadow-2xl">

  <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl" />

  <div className="relative p-6">

    <div className="flex items-center gap-5">

      <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">

        <Search
          size={24}
          className="text-blue-300"
        />

      </div>

      <div className="flex-1">

        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">

          Search Debtors

        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone number..."
          className="w-full rounded-2xl border border-white/10 bg-[#162844] px-5 py-4 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
        />

      </div>

      <div className="hidden lg:block text-right">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">

          Results

        </p>

        <h2 className="text-3xl font-black text-white">

          {filteredDebtors.length}

        </h2>

      </div>

    </div>

  </div>

</div>

{/* ==========================
    PREMIUM DEBTORS TABLE
========================== */}

<div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#071426] via-[#0C1D36] to-[#122C4B] border border-white/10 shadow-2xl">

  {/* Decorative Glow */}

  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

  <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

  <div className="relative">

    {/* Header */}

    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-8 py-8 border-b border-white/10">

      <div>

        <span className="inline-flex px-4 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold uppercase tracking-[0.25em]">

          Customer Credit Ledger

        </span>

        <h2 className="text-4xl font-black text-white mt-4">

          Debtors List

        </h2>

        <p className="text-slate-400 mt-2">

          Manage customer credit accounts, repayments and outstanding balances.

        </p>

      </div>

      <div className="flex gap-4">

        <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-5">

          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

            Showing

          </p>

          <h3 className="text-3xl font-black text-white mt-2">

            {filteredDebtors.length}

          </h3>

        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-5">

          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

            Outstanding

          </p>

          <h3 className="text-2xl font-black text-red-400 mt-2">

            ₦{totalDebt.toLocaleString()}

          </h3>

        </div>

      </div>

    </div>

    {/* TABLE */}

    <div className="overflow-x-auto">

      <table className="w-full min-w-[1350px]">

        <thead>

          <tr className="bg-[#132844] border-b border-white/10">

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Customer

            </th>

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Phone

            </th>

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Location

            </th>

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Credit Limit

            </th>

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Balance Owed

            </th>

            <th className="px-8 py-5 text-left text-slate-300 uppercase tracking-[0.2em] text-xs">

              Status

            </th>

            <th className="px-8 py-5 text-center text-slate-300 uppercase tracking-[0.2em] text-xs">

              Actions

            </th>

          </tr>

        </thead>

        <tbody>

          {loading ? (

            <tr>

              <td
                colSpan={7}
                className="py-20 text-center text-slate-400"
              >

                Loading customer credit accounts...

              </td>

            </tr>

          ) : filteredDebtors.length === 0 ? (

            <tr>

              <td
                colSpan={7}
                className="py-24"
              >

                <div className="flex flex-col items-center">

                  <Users
                    size={70}
                    className="text-slate-600"
                  />

                  <h3 className="text-2xl font-bold text-white mt-6">

                    No Debtors Found

                  </h3>

                  <p className="text-slate-400 mt-3">

                    Register your first customer credit account.

                  </p>

                </div>

              </td>

            </tr>

          ) : (

            filteredDebtors.map((debtor) => (

              <tr
                key={debtor.id}
                className="border-b border-white/5 hover:bg-white/5 transition-all duration-300"
              >
                <td className="px-8 py-6">

  <div className="flex items-center gap-4">

    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-lg shadow-lg">

      {debtor.customer_name?.charAt(0)?.toUpperCase()}

    </div>

    <div>

      <h3 className="text-white font-bold text-lg">

        {debtor.customer_name}

      </h3>

      <p className="text-slate-400 text-sm">

        Customer ID #{debtor.id}

      </p>

    </div>

  </div>

</td>

<td className="px-8 py-6">

  <div className="text-slate-200 font-medium">

    {debtor.phone || "--"}

  </div>

</td>

<td className="px-8 py-6">

  <div className="text-slate-300">

    {debtor.location || "--"}

  </div>

</td>

<td className="px-8 py-6">

  <span className="font-bold text-blue-300 text-lg">

    ₦{Number(debtor.credit_limit || 0).toLocaleString()}

  </span>

</td>

<td className="px-8 py-6">

  <span
    className={`font-black text-lg ${
      Number(debtor.balance) > 0
        ? "text-red-400"
        : "text-emerald-400"
    }`}
  >

    ₦{Number(debtor.balance || 0).toLocaleString()}

  </span>

</td>

<td className="px-8 py-6">

  {Number(debtor.balance) === 0 ? (

    <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300">

      Paid

    </span>

  ) : Number(debtor.balance) >= Number(debtor.credit_limit) ? (

    <span className="inline-flex items-center rounded-full bg-red-500/20 border border-red-400/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300">

      Overdue

    </span>

  ) : (

    <span className="inline-flex items-center rounded-full bg-orange-500/20 border border-orange-400/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-300">

      Owing

    </span>

  )}

</td>

<td className="px-8 py-6">

  <div className="flex items-center justify-center gap-3">

    {/* =========================
        PAYMENT BUTTON
    ========================= */}

    <button
      type="button"
      onClick={() => {
        setSelectedDebtor(debtor);
        setPaymentAmount("");
        setPaymentModalOpen(true);
      }}
      disabled={Number(debtor.balance || 0) <= 0}
      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-all shadow-lg"
    >
      Payment
    </button>


    {/* =========================
        DELETE BUTTON
    ========================= */}

    <button
      type="button"
      onClick={async () => {

        const confirmed = window.confirm(
          `Delete ${debtor.customer_name}'s debtor account?`
        );

        if (!confirmed) {
          return;
        }

        const {
          error,
        } = await supabase
          .from("debtors")
          .delete()
          .eq("id", debtor.id);

        if (error) {

          alert(
            `Unable to delete debtor: ${error.message}`
          );

          return;
        }

        setDebtors((current) =>
          current.filter(
            (d) => d.id !== debtor.id
          )
        );

        alert(
          "Debtor account deleted successfully."
        );

      }}
      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-lg"
    >
      Delete
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

<div className="border-t border-white/10 bg-[#10243F] px-8 py-6 flex items-center justify-between">

  <p className="text-slate-400">

    Showing

    <span className="mx-2 font-bold text-white">

      {filteredDebtors.length}

    </span>

    customer account(s)

  </p>

  <div className="flex gap-3">

    <button className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition">

      Previous

    </button>

    <button className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white transition">

      Next

    </button>

  </div>

</div>

</div>


{/* =====================================================
    PAYMENT MODAL
===================================================== */}

{paymentModalOpen && selectedDebtor && (

  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">

    <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#0D1728] shadow-2xl overflow-hidden">

      {/* MODAL HEADER */}

      <div className="px-8 py-7 border-b border-white/10 bg-gradient-to-r from-[#0B1F3A] to-[#102B52]">

        <div className="flex items-center justify-between">

          <div>

            <span className="inline-flex px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">

              Customer Repayment

            </span>

            <h2 className="text-3xl font-black text-white mt-3">

              Record Payment

            </h2>

            <p className="text-slate-400 mt-2">

              Receive payment from {selectedDebtor.customer_name}

            </p>

          </div>

          <button
            type="button"
            onClick={() => {
              setPaymentModalOpen(false);
              setSelectedDebtor(null);
              setPaymentAmount("");
            }}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xl transition"
          >
            ×
          </button>

        </div>

      </div>


      {/* MODAL BODY */}

      <div className="p-8 space-y-6">

        {/* CUSTOMER */}

        <div className="rounded-2xl border border-white/10 bg-[#162844] p-5">

          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">

            Customer

          </p>

          <h3 className="text-xl font-bold text-white mt-2">

            {selectedDebtor.customer_name}

          </h3>

          <p className="text-slate-400 mt-1">

            {selectedDebtor.phone || "No phone number"}

          </p>

        </div>


        {/* CURRENT BALANCE */}

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">

          <p className="text-xs uppercase tracking-[0.2em] text-red-300">

            Outstanding Balance

          </p>

          <h3 className="text-3xl font-black text-red-400 mt-2">

            ₦{Number(
              selectedDebtor.balance || 0
            ).toLocaleString()}

          </h3>

        </div>


        {/* PAYMENT AMOUNT */}

        <div>

          <label className="block text-sm font-bold text-slate-300 mb-3">

            Amount Paid

          </label>

          <input
            type="number"
            min="1"
            max={Number(selectedDebtor.balance || 0)}
            value={paymentAmount}
            onChange={(e) =>
              setPaymentAmount(e.target.value)
            }
            placeholder="Enter amount received"
            autoFocus
            className="w-full rounded-2xl border border-white/10 bg-[#162844] px-5 py-5 text-white text-xl font-bold placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />

          <p className="text-xs text-slate-500 mt-2">

            Maximum payment: ₦
            {Number(
              selectedDebtor.balance || 0
            ).toLocaleString()}

          </p>

        </div>


        {/* BUTTONS */}

        <div className="flex gap-4 pt-2">

          <button
            type="button"
            onClick={() => {
              setPaymentModalOpen(false);
              setSelectedDebtor(null);
              setPaymentAmount("");
            }}
            className="flex-1 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={recordDebtorPayment}
            disabled={
              paymentLoading ||
              !paymentAmount ||
              Number(paymentAmount) <= 0
            }
            className="flex-1 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black transition shadow-xl"
          >

            {paymentLoading
              ? "Processing..."
              : "Confirm Payment"}

          </button>

        </div>

      </div>

    </div>

  </div>

)}

    </div>

  </div>

  </ProtectedRoute>
);
}