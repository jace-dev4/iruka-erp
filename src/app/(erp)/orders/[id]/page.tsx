"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchOrder();
    }
  }, [params?.id]);

  async function fetchOrder() {
    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single();

    if (orderError) {
      console.error("Order error:", orderError);
      setLoading(false);
      return;
    }

    if (orderData) {
      setOrder(orderData);

      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.id);

      if (itemError) {
        console.error("Order items error:", itemError);
      }

      setItems(itemData || []);
    }

    setLoading(false);
  }

  function formatMoney(value: any) {
    return Number(value || 0).toLocaleString("en-NG");
  }

  function getAmountPaid() {
    return Number(order?.amount_paid || 0);
  }

  function getBalance() {
    const total = Number(order?.total_amount || 0);
    const paid = getAmountPaid();

    return Math.max(total - paid, 0);
  }

  function getTotalQuantity() {
    return items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }

  function getDateTime() {
    const date = order?.created_at
      ? new Date(order.created_at)
      : new Date();

    return {
      date: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Africa/Lagos",
      }),
      time: date.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Lagos",
      }),
    };
  }

  function printReceipt() {
    setPrinting(true);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setPrinting(false);
      }, 500);
    }, 150);
  }

  const dateTime = getDateTime();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-2xl font-bold">
        Loading Order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400 text-2xl font-bold">
        Order Not Found
      </div>
    );
  }

  return (
    <>
      {/* ========================================================= */}
      {/* PRINT STYLES                                              */}
      {/* ========================================================= */}

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible !important;
          }

          #thermal-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 5mm 4mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10px !important;
            line-height: 1.35 !important;
          }

          .no-print {
            display: none !important;
          }
        }

        @media screen {
          #thermal-receipt {
            display: none;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* NORMAL ERP PAGE                                           */}
      {/* ========================================================= */}

      <div className="no-print min-h-screen bg-slate-950 p-10">

        {/* BACK BUTTON */}

        <button
          onClick={() => router.push("/orders")}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 font-semibold transition-all duration-300 mb-8"
        >
          ← Back To Orders
        </button>

        {/* ===================================================== */}
        {/* ORDER HEADER                                          */}
        {/* ===================================================== */}

        <div className="rounded-3xl overflow-hidden border border-slate-700 shadow-2xl mb-8">

          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-8 py-8 border-b border-slate-700">

            <div className="flex items-center justify-between">

              <div>

                <span className="inline-flex items-center rounded-full bg-blue-500/20 text-blue-300 px-4 py-1 text-sm font-bold mb-4">
                  📋 ORDER DETAILS
                </span>

                <h1 className="text-5xl font-black text-white">
                  Customer Order Details
                </h1>

                <p className="text-slate-300 mt-3">
                  View complete customer information, payment status,
                  delivery schedule and ordered products.
                </p>

              </div>

              <div className="hidden lg:flex w-24 h-24 rounded-3xl bg-white/10 border border-white/20 items-center justify-center text-5xl">
                🧾
              </div>

            </div>

          </div>

          <div className="bg-slate-900 p-8">

            <div className="grid lg:grid-cols-2 gap-8">

              {/* CUSTOMER */}

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6">

                <div className="flex items-center gap-3 mb-6">

                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-black">
                    {order.customer_name?.charAt(0)?.toUpperCase() || "C"}
                  </div>

                  <div>

                    <h2 className="text-2xl font-black text-white">
                      {order.customer_name}
                    </h2>

                    <p className="text-slate-400">
                      Customer Information
                    </p>

                  </div>

                </div>

                <div className="space-y-5">

                  <div>
                    <p className="text-slate-400 text-sm">
                      Phone Number
                    </p>

                    <p className="text-white font-bold text-lg">
                      {order.phone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm">
                      Order Number
                    </p>

                    <p className="text-white font-bold">
                      {order.order_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm">
                      Delivery Date
                    </p>

                    <p className="text-white font-bold">
                      {order.delivery_date || "-"}
                    </p>
                  </div>

                </div>

              </div>

              {/* STATUS */}

              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6">

                <h2 className="text-2xl font-black text-white mb-6">
                  Order Status
                </h2>

                <div className="space-y-6">

                  <div>

                    <p className="text-slate-400 text-sm mb-2">
                      Payment Status
                    </p>

                    <span
                      className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${
                        order.payment_status === "Paid"
                          ? "bg-green-500/20 text-green-400"
                          : order.payment_status === "Partially Paid"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {order.payment_status || "Pending"}
                    </span>

                  </div>

                  <div>

                    <p className="text-slate-400 text-sm mb-2">
                      Order Status
                    </p>

                    <span
                      className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${
                        order.order_status === "Completed"
                          ? "bg-green-500/20 text-green-400"
                          : order.order_status === "Ready"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : order.order_status === "Preparing"
                          ? "bg-purple-500/20 text-purple-400"
                          : order.order_status === "Confirmed"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {order.order_status || "Pending"}
                    </span>

                  </div>

                  <div>

                    <p className="text-slate-400 text-sm mb-2">
                      Notes
                    </p>

                    <div className="rounded-xl bg-slate-950 border border-slate-700 p-4 text-slate-300">
                      {order.notes || "No notes available."}
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ===================================================== */}
        {/* ORDERED PRODUCTS                                     */}
        {/* ===================================================== */}

        <div className="rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">

          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-6 border-b border-slate-700">

            <div className="flex items-center justify-between">

              <div>

                <span className="inline-flex items-center rounded-full bg-emerald-500/20 text-emerald-300 px-4 py-1 text-sm font-bold mb-3">
                  🥖 ORDER ITEMS
                </span>

                <h2 className="text-3xl font-black text-white">
                  Ordered Products
                </h2>

                <p className="text-slate-300 mt-2">
                  Complete list of bread ordered by this customer.
                </p>

              </div>

              <div className="text-5xl">
                📦
              </div>

            </div>

          </div>

          <div className="bg-slate-900 p-8">

            <div className="overflow-x-auto rounded-2xl border border-slate-700">

              <table className="w-full">

                <thead>

                  <tr className="bg-slate-800 border-b border-slate-700">

                    <th className="text-left p-5 text-slate-300 uppercase text-xs tracking-wider">
                      Product
                    </th>

                    <th className="text-left p-5 text-slate-300 uppercase text-xs tracking-wider">
                      Quantity
                    </th>

                    <th className="text-left p-5 text-slate-300 uppercase text-xs tracking-wider">
                      Unit Price
                    </th>

                    <th className="text-right p-5 text-slate-300 uppercase text-xs tracking-wider">
                      Total
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {items.map((item) => (

                    <tr
                      key={item.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                    >

                      <td className="p-5">

                        <div className="flex items-center gap-4">

                          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                            🍞
                          </div>

                          <div>

                            <p className="text-white font-bold">
                              {item.bread_type}
                            </p>

                            <p className="text-slate-400 text-sm">
                              Bakery Product
                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="p-5">

                        <span className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                          {item.quantity}
                        </span>

                      </td>

                      <td className="p-5 text-slate-200 font-semibold">
                        ₦{formatMoney(item.unit_price)}
                      </td>

                      <td className="p-5 text-right font-black text-emerald-400 text-lg">
                        ₦{formatMoney(item.total_amount)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {/* SUMMARY */}

            <div className="mt-8 grid lg:grid-cols-2 gap-8">

              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">

                <h3 className="text-white font-black text-xl mb-6">
                  Order Summary
                </h3>

                <div className="space-y-4">

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Products
                    </span>

                    <span className="text-white font-bold">
                      {items.length}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Total Quantity
                    </span>

                    <span className="text-white font-bold">
                      {getTotalQuantity()}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Amount Paid
                    </span>

                    <span className="text-green-400 font-bold">
                      ₦{formatMoney(getAmountPaid())}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-400">
                      Balance
                    </span>

                    <span className="text-orange-400 font-bold">
                      ₦{formatMoney(getBalance())}
                    </span>

                  </div>

                  <div className="border-t border-slate-700 pt-4 flex justify-between">

                    <span className="text-xl text-white font-black">
                      Grand Total
                    </span>

                    <span className="text-3xl font-black text-emerald-400">
                      ₦{formatMoney(order.total_amount)}
                    </span>

                  </div>

                </div>

              </div>

              {/* PRINT BUTTON */}

              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 flex flex-col justify-center gap-4">

                <button
                  onClick={printReceipt}
                  disabled={printing}
                  className="w-full rounded-2xl bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 py-4 text-white font-bold transition"
                >
                  {printing
                    ? "🖨 Preparing Receipt..."
                    : "🖨 Print Thermal Receipt"}
                </button>

                <p className="text-center text-slate-400 text-sm">
                  Optimized for 58mm and 80mm thermal POS printers.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* THERMAL RECEIPT                                           */}
      {/* ========================================================= */}

      <div id="thermal-receipt">

        {/* BUSINESS HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontWeight: "900",
              fontSize: "17px",
              letterSpacing: "0.4px",
            }}
          >
            NKIRUKA / IRUKA
          </div>

          <div
            style={{
              fontWeight: "900",
              fontSize: "13px",
              marginTop: "2px",
              letterSpacing: "0.3px",
            }}
          >
            QUALITY BREAD
          </div>
        </div>

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "7px 0",
          }}
        />

        {/* RECEIPT INFO */}

        <div
          style={{
            textAlign: "center",
            fontWeight: "700",
            fontSize: "12px",
            marginBottom: "6px",
          }}
        >
          CUSTOMER RECEIPT
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Receipt No.</span>
          <span style={{ fontWeight: "700" }}>
            {order.order_number}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Date</span>
          <span>{dateTime.date}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Time</span>
          <span>{dateTime.time}</span>
        </div>

        {/* CUSTOMER */}

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "7px 0",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Customer</span>
          <span
            style={{
              fontWeight: "700",
              maxWidth: "55%",
              textAlign: "right",
              wordBreak: "break-word",
            }}
          >
            {order.customer_name || "Walk-in Customer"}
          </span>
        </div>

        {order.phone && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Phone</span>
            <span>{order.phone}</span>
          </div>
        )}

        {/* ITEMS */}

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "7px 0",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 32px 68px",
            gap: "3px",
            fontWeight: "900",
            fontSize: "9px",
            borderBottom: "1px solid #000",
            paddingBottom: "4px",
          }}
        >
          <span>ITEM</span>
          <span style={{ textAlign: "center" }}>QTY</span>
          <span style={{ textAlign: "right" }}>AMOUNT</span>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            style={{
              marginTop: "6px",
            }}
          >
            <div
              style={{
                fontWeight: "700",
                fontSize: "10px",
                wordBreak: "break-word",
              }}
            >
              {item.bread_type}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 32px 68px",
                gap: "3px",
                fontSize: "9px",
              }}
            >
              <span>
                ₦{formatMoney(item.unit_price)} / unit
              </span>

              <span style={{ textAlign: "center" }}>
                {item.quantity}
              </span>

              <span
                style={{
                  textAlign: "right",
                  fontWeight: "700",
                }}
              >
                ₦{formatMoney(item.total_amount)}
              </span>
            </div>
          </div>
        ))}

        {/* TOTALS */}

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "8px 0",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Items</span>
          <span>{getTotalQuantity()}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "900",
            fontSize: "14px",
            marginTop: "5px",
          }}
        >
          <span>TOTAL</span>
          <span>
            ₦{formatMoney(order.total_amount)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
          }}
        >
          <span>Paid</span>
          <span>
            ₦{formatMoney(getAmountPaid())}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "900",
            marginTop: "3px",
          }}
        >
          <span>Balance</span>
          <span>
            ₦{formatMoney(getBalance())}
          </span>
        </div>

        {/* STATUS */}

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "8px 0",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Payment</span>
          <span style={{ fontWeight: "700" }}>
            {order.payment_status || "Pending"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Status</span>
          <span style={{ fontWeight: "700" }}>
            {order.order_status || "Pending"}
          </span>
        </div>

        {/* NOTES */}

        {order.notes && (
          <>
            <div
              style={{
                borderBottom: "1px dashed #000",
                margin: "8px 0",
              }}
            />

            <div
              style={{
                fontWeight: "700",
                marginBottom: "2px",
              }}
            >
              Note
            </div>

            <div
              style={{
                fontSize: "9px",
                wordBreak: "break-word",
              }}
            >
              {order.notes}
            </div>
          </>
        )}

        {/* FOOTER */}

        <div
          style={{
            borderBottom: "1px dashed #000",
            margin: "9px 0",
          }}
        />

        <div
          style={{
            textAlign: "center",
            fontWeight: "900",
            fontSize: "11px",
          }}
        >
          THANK YOU FOR YOUR ORDER
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "9px",
            marginTop: "3px",
          }}
        >
          Fresh Bread, Every Day
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "8px",
            marginTop: "7px",
          }}
        >
          Please keep this receipt for your records.
        </div>

        <div
          style={{
            height: "8mm",
          }}
        />

      </div>
    </>
  );
}