"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string | null;
  customer_type: string | null;
  customer_code: string | null;
  photo_url: string | null;
  created_at: string | null;
};

type Order = {
  id: string | number;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  bread: string | null;
  quantity: number | null;
  total: number | null;
  total_amount: number | null;
  paid: number | null;
  balance: number | null;
  status: string | null;
  order_status: string | null;
  payment_status: string | null;
  created_at: string | null;
  delivery_date: string | null;
  estimated_ready_time: string | null;
  completed_at: string | null;
  notes: string | null;
  items: unknown;
};

type CustomerMessage = {
  id: string;
  customer_id: string | null;
  audience: string | null;
  direction: string | null;
  message_type: string | null;
  subject: string | null;
  message: string | null;
  image_url: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
  read_at: string | null;
  resolved_at: string | null;
};

type Tab =
  | "home"
  | "orders"
  | "messages"
  | "account";

const formatCurrency = (
  amount: number | null | undefined
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatDate = (
  date: string | null | undefined
) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatTime = (
  date: string | null | undefined
) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(date));
};

const getGreeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(new Date())
  );

  if (hour < 12) return "Good morning";

  if (hour < 17) return "Good afternoon";

  return "Good evening";
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase()
    )
    .join("");
};

const getOrderStatus = (order: Order) => {
  return (
    order.order_status ||
    order.status ||
    "Pending"
  );
};

const getOrderTotal = (order: Order) => {
  return Number(
    order.total_amount ??
      order.total ??
      0
  );
};

const getOrderBalance = (order: Order) => {
  return Number(order.balance || 0);
};

const isCompletedOrder = (
  order: Order
) => {
  const status =
    getOrderStatus(order).toLowerCase();

  return [
    "completed",
    "complete",
    "cancelled",
    "canceled",
    "delivered",
  ].includes(status);
};

const statusStyle = (
  status: string
) => {
  const normalized =
    status.toLowerCase();

  if (
    [
      "completed",
      "complete",
      "delivered",
      "ready",
    ].includes(normalized)
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (
    [
      "processing",
      "in production",
      "preparing",
    ].includes(normalized)
  ) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (
    [
      "cancelled",
      "canceled",
      "failed",
    ].includes(normalized)
  ) {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
};

export default function CustomerPortalPage() {
  const [customerId, setCustomerId] =
    useState("");

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [messages, setMessages] =
    useState<CustomerMessage[]>([]);

  const [activeTab, setActiveTab] =
    useState<Tab>("home");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [messageText, setMessageText] =
    useState("");

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [filePreview, setFilePreview] =
    useState<string | null>(null);

  const [messageError, setMessageError] =
    useState("");

  const [unreadCount, setUnreadCount] =
    useState(0);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const loadPortal = useCallback(
    async (
      code: string,
      showLoader = true
    ) => {
      const normalized =
        code.trim().toUpperCase();

      if (!normalized) {
        setError(
          "Please enter your Customer ID."
        );
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await fetch(
            `/api/customer-portal/data?customerId=${encodeURIComponent(
              normalized
            )}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load customer portal."
          );
        }

        setCustomer(
          result.customer || null
        );

        setOrders(
          result.orders || []
        );

        setMessages(
          result.messages || []
        );

        setUnreadCount(
          Number(
            result.stats
              ?.unreadMessages || 0
          )
        );

        setCustomerId(normalized);

        if (showLoader) {
          setActiveTab("home");
        }
      } catch (err: unknown) {
        console.error(
          "CUSTOMER PORTAL LOAD ERROR:",
          err
        );

        setCustomer(null);
        setOrders([]);
        setMessages([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load customer portal."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!customer?.id) return;

    const channel =
      supabase
        .channel(
          `customer-portal-${customer.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_messages",
            filter: `customer_id=eq.${customer.id}`,
          },
          async () => {
            await loadPortal(
              customer.customer_code || customerId,
              false
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `customer_id=eq.${customer.id}`,
          },
          async () => {
            await loadPortal(
              customer.customer_code || customerId,
              false
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    customer,
    customerId,
    loadPortal,
  ]);

  useEffect(() => {
    if (
      activeTab === "messages" &&
      messages.length > 0
    ) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    }
  }, [
    activeTab,
    messages.length,
  ]);

  const totalSpent = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + getOrderTotal(order),
        0
      ),
    [orders]
  );

  const totalBalance = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + getOrderBalance(order),
        0
      ),
    [orders]
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !isCompletedOrder(order)
      ),
    [orders]
  );

  const recentOrders =
    orders.slice(0, 5);

  const logout = () => {
    setCustomer(null);
    setOrders([]);
    setMessages([]);
    setCustomerId("");
    setActiveTab("home");
    setSelectedOrder(null);
    setUnreadCount(0);
    setError("");
  };

  const refresh = async () => {
    if (!customer?.customer_code)
      return;

    setRefreshing(true);

    await loadPortal(
      customer.customer_code,
      false
    );

    setRefreshing(false);
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setMessageError("");

    const maxSize =
      50 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessageError(
        "File is too large. Maximum size is 50MB."
      );

      event.target.value = "";
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      ) &&
      !file.type.startsWith(
        "video/"
      )
    ) {
      setMessageError(
        "Only images and videos are supported."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    if (
      file.type.startsWith(
        "image/"
      )
    ) {
      setFilePreview(
        URL.createObjectURL(file)
      );
    } else {
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(
        filePreview
      );
    }

    setSelectedFile(null);
    setFilePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    const text =
      messageText.trim();

    if (!text && !selectedFile) {
      setMessageError(
        "Write a message or attach a photo/video."
      );
      return;
    }

    if (!customer?.customer_code) {
      return;
    }

    setSendingMessage(true);
    setMessageError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "customerId",
        customer.customer_code
      );

      if (text) {
        formData.append(
          "message",
          text
        );
      }

      if (selectedFile) {
        formData.append(
          "file",
          selectedFile
        );
      }

      const response =
        await fetch(
          "/api/customer-portal/message",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to send message."
        );
      }

      setMessageText("");
      removeSelectedFile();

      await loadPortal(
        customer.customer_code,
        false
      );
    } catch (err: unknown) {
      console.error(
        "SEND CUSTOMER MESSAGE ERROR:",
        err
      );

      setMessageError(
        err instanceof Error
          ? err.message
          : "Unable to send message."
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /*
   * LOGIN
   */

  if (!customer) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#06101d] text-white">
        <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-600/20 blur-[100px]" />

        <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />

        <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
          <div className="w-full">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black shadow-xl shadow-blue-900/30">
                  I
                </div>

                <div>
                  <p className="text-sm font-black tracking-[0.25em] text-blue-400">
                    IRUKA
                  </p>

                  <p className="text-xs font-medium text-slate-500">
                    Customer Experience
                  </p>
                </div>
              </div>

              <h1 className="mt-10 text-4xl font-black leading-tight tracking-tight">
                Welcome to your
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  customer portal.
                </span>
              </h1>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Access your orders, payments,
                account information and communicate
                directly with IRUKA.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              <div className="mb-5">
                <p className="text-sm font-black text-white">
                  Customer access
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enter the Customer ID provided by
                  IRUKA.
                </p>
              </div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                Customer ID
              </label>

              <input
                value={customerId}
                onChange={(event) => {
                  setCustomerId(
                    event.target.value.toUpperCase()
                  );

                  setError("");
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    loadPortal(
                      customerId
                    );
                  }
                }}
                placeholder="IRK-615713"
                autoComplete="off"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-lg font-black tracking-wider text-white outline-none transition placeholder:text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-300">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  loadPortal(
                    customerId
                  )
                }
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 font-black text-white shadow-xl shadow-blue-900/30 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Opening portal..."
                  : "Open My Portal →"}
              </button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
              <span>●</span>
              <span>
                Secure IRUKA customer experience
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * PORTAL
   */

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-28 text-slate-900">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06101d]/95 text-white shadow-xl backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black">
              I
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.25em] text-blue-400">
                IRUKA
              </p>

              <p className="truncate text-xs font-bold text-slate-400">
                Customer Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:bg-white/10 disabled:opacity-50"
          >
            {refreshing ? "…" : "↻"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {/* HOME */}
        {activeTab === "home" && (
          <div className="space-y-5">
            {/* PROFILE HERO */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071525] via-[#0b2140] to-[#123b73] p-6 text-white shadow-2xl shadow-blue-900/20 sm:p-8">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
                  {/* BIG PHOTO */}
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-blue-400/40 to-indigo-500/20 blur-xl" />

                    {customer.photo_url ? (
                      <img
                        src={
                          customer.photo_url
                        }
                        alt={
                          customer.full_name
                        }
                        className="relative h-40 w-40 rounded-[2rem] object-cover shadow-2xl ring-4 ring-white/10 sm:h-44 sm:w-44"
                      />
                    ) : (
                      <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl font-black shadow-2xl ring-4 ring-white/10 sm:h-44 sm:w-44">
                        {getInitials(
                          customer.full_name
                        )}
                      </div>
                    )}

                    <span className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border-4 border-[#0b2140] bg-emerald-400" />
                  </div>

                  <div className="mt-6 sm:ml-7 sm:mt-0">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                      {getGreeting()}
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                      {customer.full_name}
                    </h1>

                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black text-blue-100">
                        {customer.customer_code}
                      </span>

                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                        ●{" "}
                        {customer.status ||
                          "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Orders
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {orders.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Active
                    </p>

                    <p className="mt-2 text-2xl font-black text-blue-300">
                      {activeOrders.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Spent
                    </p>

                    <p className="mt-2 truncate text-lg font-black">
                      {formatCurrency(
                        totalSpent
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Balance
                    </p>

                    <p className="mt-2 truncate text-lg font-black text-orange-300">
                      {formatCurrency(
                        totalBalance
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CUSTOMER INFORMATION */}
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                    Profile
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Customer Information
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                  👤
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Full Name
                  </p>
                  <p className="mt-1 font-bold">
                    {customer.full_name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Customer ID
                  </p>
                  <p className="mt-1 font-black tracking-wide text-blue-700">
                    {customer.customer_code ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Phone
                  </p>
                  <p className="mt-1 font-bold">
                    {customer.phone ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all font-bold">
                    {customer.email ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Address
                  </p>
                  <p className="mt-1 font-bold">
                    {customer.address ||
                      "Not provided"}
                  </p>
                </div>
              </div>
            </section>

            {/* CURRENT ORDERS */}
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                    Live Orders
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Current Orders
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "orders"
                    )
                  }
                  className="text-sm font-black text-blue-600"
                >
                  See all →
                </button>
              </div>

              {activeOrders.length ===
              0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    📦
                  </div>

                  <p className="mt-4 font-black">
                    No active orders
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    New orders will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {activeOrders
                    .slice(0, 4)
                    .map((order) => {
                      const status =
                        getOrderStatus(
                          order
                        );

                      return (
                        <button
                          key={String(
                            order.id
                          )}
                          type="button"
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                                {order.order_number ||
                                  `Order #${order.id}`}
                              </p>

                              <p className="mt-2 text-lg font-black">
                                {order.bread ||
                                  "Customer Order"}
                              </p>

                              <p className="mt-1 text-sm text-slate-400">
                                {order.quantity
                                  ? `${order.quantity} item${
                                      order.quantity ===
                                      1
                                        ? ""
                                        : "s"
                                    }`
                                  : "Order details"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Order date
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-600">
                                {formatDate(
                                  order.created_at
                                )}
                              </p>
                            </div>

                            <p className="text-lg font-black">
                              {formatCurrency(
                                getOrderTotal(
                                  order
                                )
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </section>

            {/* MESSAGE CTA */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "messages"
                )
              }
              className="group relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-left text-white shadow-xl shadow-blue-900/20"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:scale-125" />

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                    IRUKA Support
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Need help?
                  </h2>

                  <p className="mt-1 text-sm text-blue-100/80">
                    Send us a message, photo or video.
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl backdrop-blur">
                  💬
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div>
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                History
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                My Orders
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Every order connected to your
                customer profile.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total orders
                </p>

                <p className="mt-2 text-2xl font-black">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total spent
                </p>

                <p className="mt-2 text-lg font-black">
                  {formatCurrency(
                    totalSpent
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {orders.length ===
              0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                  <div className="text-4xl">
                    📦
                  </div>

                  <p className="mt-4 font-black">
                    No orders yet
                  </p>
                </div>
              ) : (
                orders.map((order) => {
                  const status =
                    getOrderStatus(
                      order
                    );

                  return (
                    <button
                      key={String(
                        order.id
                      )}
                      type="button"
                      onClick={() =>
                        setSelectedOrder(
                          order
                        )
                      }
                      className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                            {order.order_number ||
                              `Order #${order.id}`}
                          </p>

                          <p className="mt-2 font-black">
                            {order.bread ||
                              "Customer Order"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              order.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Total
                          </p>

                          <p className="mt-1 font-black">
                            {formatCurrency(
                              getOrderTotal(
                                order
                              )
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Balance
                          </p>

                          <p className="mt-1 font-black text-orange-600">
                            {formatCurrency(
                              getOrderBalance(
                                order
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {activeTab === "messages" && (
          <div className="flex min-h-[calc(100vh-9rem)] flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                Direct support
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Messages
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Talk directly with the IRUKA team.
              </p>
            </div>

            <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
              {/* CHAT HEADER */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-[#071525] px-5 py-4 text-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-black">
                  I
                </div>

                <div className="flex-1">
                  <p className="font-black">
                    IRUKA Bakery
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Customer Support
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs font-black">
                    {unreadCount}
                  </span>
                )}
              </div>

              {/* MESSAGES */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                {messages.length ===
                0 ? (
                  <div className="flex min-h-[360px] items-center justify-center">
                    <div className="max-w-xs text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                        💬
                      </div>

                      <p className="mt-4 font-black text-slate-800">
                        Start a conversation
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Send a message to the IRUKA
                        team. You can also attach a
                        photo or video.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(
                    (message) => {
                      const fromCustomer =
                        message.direction ===
                        "customer_to_erp";

                      const isImage =
                        message.message_type ===
                        "image";

                      const isVideo =
                        message.message_type ===
                        "video";

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            fromCustomer
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] ${
                              fromCustomer
                                ? "items-end"
                                : "items-start"
                            }`}
                          >
                            <div
                              className={`overflow-hidden rounded-3xl px-4 py-3 shadow-sm ${
                                fromCustomer
                                  ? "rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              {message.image_url &&
                                isImage && (
                                  <img
                                    src={
                                      message.image_url
                                    }
                                    alt="Message attachment"
                                    className="mb-3 max-h-72 w-full rounded-2xl object-cover"
                                  />
                                )}

                              {message.image_url &&
                                isVideo && (
                                  <video
                                    src={
                                      message.image_url
                                    }
                                    controls
                                    className="mb-3 max-h-72 w-full rounded-2xl"
                                  />
                                )}

                              {message.message && (
                                <p className="whitespace-pre-wrap text-sm leading-6">
                                  {
                                    message.message
                                  }
                                </p>
                              )}
                            </div>

                            <div
                              className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] font-semibold text-slate-400 ${
                                fromCustomer
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <span>
                                {fromCustomer
                                  ? "You"
                                  : "IRUKA"}
                              </span>

                              <span>
                                {formatTime(
                                  message.created_at
                                )}
                              </span>

                              {fromCustomer && (
                                <span className="text-blue-500">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>

              {/* FILE PREVIEW */}
              {selectedFile && (
                <div className="border-t border-slate-100 bg-white px-4 pt-4">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Selected attachment"
                        className="h-28 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 items-center gap-3 rounded-xl bg-slate-100 px-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl">
                          🎥
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {
                              selectedFile.name
                            }
                          </p>

                          <p className="text-xs text-slate-400">
                            Video attachment
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        removeSelectedFile
                      }
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {messageError && (
                <div className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                  {messageError}
                </div>
              )}

              {/* COMPOSER */}
              <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/5">
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/*,video/*"
                    onChange={
                      handleFileChange
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      sendingMessage
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-50"
                    title="Attach photo or video"
                  >
                    📎
                  </button>

                  <textarea
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Write a message..."
                    className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={
                      sendMessage
                    }
                    disabled={
                      sendingMessage ||
                      (!messageText.trim() &&
                        !selectedFile)
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg text-white shadow-lg shadow-blue-600/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sendingMessage
                      ? "…"
                      : "➤"}
                  </button>
                </div>

                <p className="mt-2 px-1 text-[10px] text-slate-400">
                  Attach photos or videos up to
                  50MB.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT */}
        {activeTab === "account" && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Your profile
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              My Account
            </h1>

            <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#071525] via-[#0c2545] to-[#123b73] px-6 pb-8 pt-8 text-center text-white">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />

                {customer.photo_url ? (
                  <img
                    src={
                      customer.photo_url
                    }
                    alt={
                      customer.full_name
                    }
                    className="relative mx-auto h-40 w-40 rounded-[2rem] object-cover shadow-2xl ring-4 ring-white/10"
                  />
                ) : (
                  <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl font-black shadow-2xl ring-4 ring-white/10">
                    {getInitials(
                      customer.full_name
                    )}
                  </div>
                )}

                <h2 className="mt-5 text-2xl font-black">
                  {customer.full_name}
                </h2>

                <p className="mt-1 text-sm font-bold text-blue-300">
                  {customer.customer_code}
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Phone
                  </p>

                  <p className="mt-1 font-bold">
                    {customer.phone ||
                      "Not provided"}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all font-bold">
                    {customer.email ||
                      "Not provided"}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Address
                  </p>

                  <p className="mt-1 font-bold">
                    {customer.address ||
                      "Not provided"}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Customer Type
                  </p>

                  <p className="mt-1 font-bold">
                    {customer.customer_type ||
                      "Customer"}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Customer Since
                  </p>

                  <p className="mt-1 font-bold">
                    {formatDate(
                      customer.created_at
                    )}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-5 w-full rounded-2xl border border-red-200 bg-white px-5 py-4 font-black text-red-600 shadow-sm transition hover:bg-red-50"
            >
              Exit Customer Portal
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_40px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {[
            {
              id: "home" as Tab,
              label: "Home",
              icon: "⌂",
            },
            {
              id: "orders" as Tab,
              label: "Orders",
              icon: "▣",
            },
            {
              id: "messages" as Tab,
              label: "Messages",
              icon: "◌",
            },
            {
              id: "account" as Tab,
              label: "Account",
              icon: "●",
            },
          ].map((item) => {
            const active =
              activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(
                    item.id
                  );

                  if (
                    item.id ===
                    "messages"
                  ) {
                    setUnreadCount(0);
                  }
                }}
                className={`relative flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <span className="text-xl leading-none">
                  {item.icon}
                </span>

                <span className="text-[10px] font-black">
                  {item.label}
                </span>

                {item.id ===
                  "messages" &&
                  unreadCount > 0 && (
                    <span className="absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                      {unreadCount >
                      9
                        ? "9+"
                        : unreadCount}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ORDER DETAILS */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() =>
            setSelectedOrder(
              null
            )
          }
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Order Details
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {selectedOrder.order_number ||
                    `#${selectedOrder.id}`}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  Status
                </span>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(
                    getOrderStatus(
                      selectedOrder
                    )
                  )}`}
                >
                  {getOrderStatus(
                    selectedOrder
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatCurrency(
                    getOrderTotal(
                      selectedOrder
                    )
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Balance
                </p>

                <p className="mt-1 text-lg font-black text-orange-600">
                  {formatCurrency(
                    getOrderBalance(
                      selectedOrder
                    )
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Order Date
                </p>

                <p className="mt-1 font-bold">
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </p>
              </div>

              {selectedOrder.delivery_date && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Delivery Date
                  </p>

                  <p className="mt-1 font-bold">
                    {formatDate(
                      selectedOrder.delivery_date
                    )}
                  </p>
                </div>
              )}

              {selectedOrder.estimated_ready_time && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Estimated Ready
                  </p>

                  <p className="mt-1 font-bold">
                    {formatDate(
                      selectedOrder.estimated_ready_time
                    )}{" "}
                    ·{" "}
                    {formatTime(
                      selectedOrder.estimated_ready_time
                    )}
                  </p>
                </div>
              )}

              {selectedOrder.payment_status && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Payment Status
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      selectedOrder.payment_status
                    }
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Notes
                  </p>

                  <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedOrder(
                  null
                )
              }
              className="mt-7 w-full rounded-2xl bg-[#071525] px-5 py-4 font-black text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}