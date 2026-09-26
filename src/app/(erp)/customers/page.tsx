"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  password?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_type?: string | null;
  address?: string | null;
  status?: string | null;
  customer_code?: string | null;
  photo_url?: string | null;
  email?: string | null;
  user_id?: string | null;
};

type Order = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type Sale = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
};

type CustomerMessage = {
  id: string;
  customer_id?: string | null;
  sender?: string | null;
  sender_type?: string | null;
  message?: string | null;
  content?: string | null;
  body?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type CustomerStats = {
  customer: Customer;
  name: string;
  phone: string;
  customerCode: string;
  orders: number;
  revenue: number;
  highestPurchase: number;
  averageOrder: number;
  firstOrder: string | null;
  lastOrder: string | null;
  recentOrders: Order[];
};

/* =========================================================
   HELPERS
========================================================= */

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "CU";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const generateCustomerCode = () =>
  `IRK-${Math.floor(100000 + Math.random() * 900000)}`;

const statusClasses = (status?: string | null) => {
  const value = normalize(status);

  if (value === "active") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (value === "inactive") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  return "bg-amber-100 text-amber-700 border border-amber-200";
};

/* =========================================================
   PAGE
========================================================= */

export default function CustomerPage() {
  /* =========================
     DATA
  ========================== */

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [customerMessages, setCustomerMessages] = useState<
    CustomerMessage[]
  >([]);

  const [messagesLoading, setMessagesLoading] = useState(false);

  /* =========================
     UI STATE
  ========================== */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerStats | null>(null);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [deletingCustomer, setDeletingCustomer] =
    useState<Customer | null>(null);

  const [messageCustomer, setMessageCustomer] =
    useState<Customer | null>(null);

  const [showAllCustomersMessage, setShowAllCustomersMessage] =
    useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [savingCustomer, setSavingCustomer] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    customer_type: "Retail",
    status: "Active",
  });

  /* =========================================================
     CLOCK
  ========================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================================
     NOTIFICATION
  ========================================================== */

  const showNotification = (
    type: "success" | "error",
    message: string
  ) => {
    setNotification({
      type,
      message,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  /* =========================================================
     LOAD CUSTOMERS
  ========================================================== */

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Customer load error:", error);

      showNotification(
        "error",
        "Unable to load customers."
      );

      return;
    }

    const loadedCustomers = (data || []) as Customer[];

    const usedCodes = new Set(
      loadedCustomers
        .map((customer) => customer.customer_code)
        .filter(Boolean)
    );

    for (const customer of loadedCustomers) {
      if (!customer.customer_code) {
        let newCode = generateCustomerCode();

        while (usedCodes.has(newCode)) {
          newCode = generateCustomerCode();
        }

        usedCodes.add(newCode);

        await supabase
          .from("customers")
          .update({
            customer_code: newCode,
          })
          .eq("id", customer.id);

        customer.customer_code = newCode;
      }
    }

    setCustomers(loadedCustomers);
  };

  /* =========================================================
     LOAD ORDERS
  ========================================================== */

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders load error:", error);
      return;
    }

    setOrders((data || []) as Order[]);
  };

  /* =========================================================
     LOAD SALES
  ========================================================== */

  const loadSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Sales load error:", error);
      return;
    }

    setSales((data || []) as Sale[]);
  };

  /* =========================================================
     LOAD CUSTOMER MESSAGES
     
     This is intentionally tolerant of the table not existing
     yet. The customer portal will use this area later.
  ========================================================== */

  const loadCustomerMessages = async (customerId: string) => {
    setMessagesLoading(true);

    try {
      const { data, error } = await supabase
        .from("customer_messages")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(
          "Customer messages are not available yet:",
          error.message
        );

        setCustomerMessages([]);
        return;
      }

      setCustomerMessages(
        (data || []) as CustomerMessage[]
      );
    } catch (error) {
      console.warn(
        "Customer message loading unavailable:",
        error
      );

      setCustomerMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  /* =========================================================
     LOAD ALL
  ========================================================== */

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    await Promise.all([
      loadCustomers(),
      loadOrders(),
      loadSales(),
    ]);

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* =========================================================
     REALTIME
  ========================================================== */

  useEffect(() => {
    const customersChannel = supabase
      .channel("customer-page-customers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          loadCustomers();
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("customer-page-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel("customer-page-sales")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          loadSales();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("customer-page-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_messages",
        },
        () => {
          if (selectedCustomer?.customer.id) {
            loadCustomerMessages(
              selectedCustomer.customer.id
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedCustomer?.customer.id]);

  /* =========================================================
     CUSTOMER STATS
  ========================================================== */

  const customerStats = useMemo<CustomerStats[]>(() => {
    return customers.map((customer) => {
      const customerId = normalize(customer.id);
      const customerPhone = normalize(customer.phone);
      const customerName = normalize(customer.full_name);

      const matchedOrders = orders.filter((order) => {
        if (
          order.customer_id &&
          normalize(order.customer_id) === customerId
        ) {
          return true;
        }

        if (
          customerPhone &&
          normalize(order.phone) === customerPhone
        ) {
          return true;
        }

        if (
          customerName &&
          normalize(order.customer_name) === customerName
        ) {
          return true;
        }

        return false;
      });

      const matchedSales = sales.filter((sale) => {
        if (
          sale.customer_id &&
          normalize(sale.customer_id) === customerId
        ) {
          return true;
        }

        const salePhone = normalize(
          sale.customer_phone || sale.phone
        );

        if (customerPhone && salePhone === customerPhone) {
          return true;
        }

        if (
          customerName &&
          normalize(sale.customer_name) === customerName
        ) {
          return true;
        }

        return false;
      });

      const orderRevenue = matchedOrders.reduce(
        (sum, order) =>
          sum + Number(order.total_amount || 0),
        0
      );

      const salesRevenue = matchedSales.reduce(
        (sum, sale) =>
          sum + Number(sale.total_amount || 0),
        0
      );

      const revenue =
        matchedOrders.length > 0
          ? orderRevenue
          : salesRevenue;

      const totalOrders =
        matchedOrders.length > 0
          ? matchedOrders.length
          : matchedSales.length;

      const allAmounts = [
        ...matchedOrders.map((item) =>
          Number(item.total_amount || 0)
        ),
        ...matchedSales.map((item) =>
          Number(item.total_amount || 0)
        ),
      ];

      const highestPurchase =
        allAmounts.length > 0
          ? Math.max(...allAmounts)
          : 0;

      const allDates = [
        ...matchedOrders
          .map((item) => item.created_at)
          .filter(Boolean) as string[],
        ...matchedSales
          .map((item) => item.created_at)
          .filter(Boolean) as string[],
      ].sort(
        (a, b) =>
          new Date(a).getTime() -
          new Date(b).getTime()
      );

      const firstOrder =
        allDates.length > 0 ? allDates[0] : null;

      const lastOrder =
        allDates.length > 0
          ? allDates[allDates.length - 1]
          : null;

      return {
        customer,
        name: customer.full_name || "Unnamed Customer",
        phone: customer.phone || "No phone",
        customerCode:
          customer.customer_code || "—",
        orders: totalOrders,
        revenue,
        highestPurchase,
        averageOrder:
          totalOrders > 0
            ? revenue / totalOrders
            : 0,
        firstOrder,
        lastOrder,
        recentOrders: matchedOrders.slice(0, 5),
      };
    });
  }, [customers, orders, sales]);

  /* =========================================================
     SEARCH
  ========================================================== */

  const filteredCustomers = useMemo(() => {
    const query = normalize(search);

    if (!query) {
      return customerStats;
    }

    return customerStats.filter((item) => {
      return (
        normalize(item.name).includes(query) ||
        normalize(item.phone).includes(query) ||
        normalize(item.customerCode).includes(query) ||
        normalize(item.customer.email).includes(query)
      );
    });
  }, [customerStats, search]);

  /* =========================================================
     KPIs
  ========================================================== */

  const totalCustomers = customers.length;

  const activeCustomers = customers.filter(
    (customer) =>
      normalize(customer.status || "Active") ===
      "active"
  ).length;

  const newCustomersThisMonth = customers.filter(
    (customer) => {
      if (!customer.created_at) return false;

      const created = new Date(customer.created_at);
      const now = new Date();

      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth()
      );
    }
  ).length;

  const totalCustomerOrders = customerStats.reduce(
    (sum, customer) =>
      sum + Number(customer.orders || 0),
    0
  );

  const totalCustomerRevenue = customerStats.reduce(
    (sum, customer) =>
      sum + Number(customer.revenue || 0),
    0
  );

  const averageOrderValue =
    totalCustomerOrders > 0
      ? totalCustomerRevenue / totalCustomerOrders
      : 0;

  /* =========================================================
     OPEN PROFILE
  ========================================================== */

  const openProfile = async (stats: CustomerStats) => {
    setActiveMenu(null);
    setSelectedCustomer(stats);
    setCustomerMessages([]);

    await loadCustomerMessages(stats.customer.id);
  };

  /* =========================================================
     OPEN EDIT
  ========================================================== */

  const openEdit = (customer: Customer) => {
    setActiveMenu(null);
    setSelectedCustomer(null);

    setEditingCustomer(customer);

    setEditForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      customer_type:
        customer.customer_type || "Retail",
      status: customer.status || "Active",
    });
  };

  /* =========================================================
     OPEN MESSAGE
  ========================================================== */

  const openMessage = (customer: Customer) => {
    setActiveMenu(null);
    setSelectedCustomer(null);
    setMessageText("");
    setMessageCustomer(customer);
  };

  /* =========================================================
     SAVE CUSTOMER
  ========================================================== */

  const saveCustomer = async () => {
    if (!editingCustomer) return;

    if (!editForm.full_name.trim()) {
      showNotification(
        "error",
        "Customer name is required."
      );
      return;
    }

    setSavingCustomer(true);

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        customer_type:
          editForm.customer_type.trim(),
        status: editForm.status.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCustomer.id);

    setSavingCustomer(false);

    if (error) {
      console.error("Customer update error:", error);

      showNotification(
        "error",
        "Unable to update customer."
      );

      return;
    }

    showNotification(
      "success",
      "Customer updated successfully."
    );

    setEditingCustomer(null);
    await loadCustomers();
  };

  /* =========================================================
     DELETE CUSTOMER
  ========================================================== */

  const deleteCustomer = async () => {
    if (!deletingCustomer) return;

    setDeleting(true);

    const customer = deletingCustomer;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    setDeleting(false);

    if (error) {
      console.error("Customer delete error:", error);

      showNotification(
        "error",
        "Unable to delete customer."
      );

      return;
    }

    setDeletingCustomer(null);
    setSelectedCustomer(null);

    showNotification(
      "success",
      "Customer deleted successfully."
    );

    await loadCustomers();
  };

  /* =========================================================
     CUSTOMER PHOTO
  ========================================================== */

  const uploadCustomerPhoto = async (
    file: File
  ) => {
    if (!editingCustomer) return;

    setUploadingPhoto(true);

    try {
      const customerCode =
        editingCustomer.customer_code ||
        generateCustomerCode();

      const extension =
        file.name.split(".").pop() || "jpg";

      const filePath =
        `${customerCode}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("customer-photos")
          .upload(filePath, file, {
            upsert: true,
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("customer-photos")
        .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      const { error: updateError } =
        await supabase
          .from("customers")
          .update({
            photo_url: publicUrl,
          })
          .eq("id", editingCustomer.id);

      if (updateError) {
        throw updateError;
      }

      setEditingCustomer({
        ...editingCustomer,
        photo_url: publicUrl,
      });

      showNotification(
        "success",
        "Customer photo updated."
      );

      await loadCustomers();
    } catch (error) {
      console.error(
        "Customer photo upload error:",
        error
      );

      showNotification(
        "error",
        "Unable to upload customer photo."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* =========================================================
     MESSAGING
  ========================================================== */

  const handleMessageSend = async () => {
    if (!messageText.trim()) {
      showNotification(
        "error",
        "Enter a message first."
      );
      return;
    }

    setSendingMessage(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setSendingMessage(false);
    setMessageText("");

    showNotification(
      "error",
      "Messaging Backend Required — message was not sent."
    );

    setMessageCustomer(null);
    setShowAllCustomersMessage(false);
  };

  /* =========================================================
     CLOSE MENU WHEN CLICKING OUTSIDE
  ========================================================== */

  useEffect(() => {
    const handleClick = () => {
      setActiveMenu(null);
    };

    document.addEventListener(
      "click",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick
      );
    };
  }, []);

  /* =========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <ProtectedRoute
        allowedRoles={["admin", "cashier"]}
      >
        <div className="min-h-screen bg-gradient-to-br from-[#081028] via-[#0B1739] to-[#142850] flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

            <h2 className="text-2xl font-bold text-white">
              Loading Customers
            </h2>

            <p className="mt-2 text-slate-400">
              Preparing customer directory...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================== */

  return (
    <ProtectedRoute
      allowedRoles={["admin", "cashier"]}
    >
      <div
        className="min-h-screen bg-gradient-to-br from-[#081028] via-[#0B1739] to-[#142850] p-10"
        onClick={() => setActiveMenu(null)}
      >
        {/* =====================================================
            NOTIFICATION
        ====================================================== */}

        {notification && (
          <div className="fixed right-8 top-8 z-[100]">
            <div
              className={`rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl ${
                notification.type === "success"
                  ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"
                  : "border-red-400/30 bg-red-950/90 text-red-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {notification.type === "success"
                    ? "✓"
                    : "!"}
                </span>

                <span className="font-semibold">
                  {notification.message}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            HERO
        ====================================================== */}

        <div className="mb-8 flex gap-6">
          <div className="flex-1 rounded-3xl border border-slate-700 bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-8">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
                  👥 Customer Relationship Module
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-white">
                  Customer Management
                </h1>

                <p className="mt-3 max-w-2xl text-lg font-medium text-slate-300">
                  Manage customer relationships, purchase
                  activity, order history and customer
                  communication from one central directory.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-slate-600 bg-[#081028]/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Current Time
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {new Intl.DateTimeFormat("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                        timeZone: "Africa/Lagos",
                      }).format(currentTime)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-600 bg-[#081028]/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Directory
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {filteredCustomers.length} customers
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden shrink-0 md:block">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-blue-300/20 bg-blue-500/10 text-6xl shadow-2xl">
                  👥
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              loadAll(true);
            }}
            disabled={refreshing}
            className="w-24 rounded-3xl border border-slate-700 bg-[#111C44] text-white shadow-2xl transition hover:bg-[#162455] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <span
                className={`text-3xl ${
                  refreshing ? "animate-spin" : ""
                }`}
              >
                ↻
              </span>

              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Refresh
              </span>
            </div>
          </button>
        </div>

        {/* =====================================================
            KPI CARDS
        ====================================================== */}

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* BLUE */}

          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-7 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-100">
                Total Customers
              </p>

              <span className="text-3xl">
                👥
              </span>
            </div>

            <p className="mt-4 text-5xl font-bold">
              {totalCustomers}
            </p>

            <p className="mt-2 text-sm font-semibold text-blue-100">
              Registered customers
            </p>
          </div>

          {/* GREEN */}

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-7 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-100">
                Active Customers
              </p>

              <span className="text-3xl">
                ✓
              </span>
            </div>

            <p className="mt-4 text-5xl font-bold">
              {activeCustomers}
            </p>

            <p className="mt-2 text-sm font-semibold text-emerald-100">
              Currently active
            </p>
          </div>

          {/* RED */}

          <div className="rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-red-800 p-7 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-red-100">
                New This Month
              </p>

              <span className="text-3xl">
                ✨
              </span>
            </div>

            <p className="mt-4 text-5xl font-bold">
              {newCustomersThisMonth}
            </p>

            <p className="mt-2 text-sm font-semibold text-red-100">
              Recently registered
            </p>
          </div>

          {/* ORANGE */}

          <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-7 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-50">
                Average Order
              </p>

              <span className="text-3xl">
                ₦
              </span>
            </div>

            <p className="mt-4 text-4xl font-bold">
              {formatCurrency(
                averageOrderValue
              )}
            </p>

            <p className="mt-3 text-sm font-semibold text-orange-50">
              Across customer activity
            </p>
          </div>
        </div>

        {/* =====================================================
            CUSTOMER DIRECTORY
        ====================================================== */}

        <section
          className="rounded-3xl border border-slate-700 bg-[#111C44] p-8 shadow-2xl"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          {/* DIRECTORY HEADER */}

          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white">
                  Customer Directory
                </h2>

                <span className="rounded-full border border-slate-600 bg-[#0B1739] px-3 py-1 text-xs font-semibold text-slate-300">
                  {filteredCustomers.length}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-slate-400">
                Click any customer row to view their complete
                customer profile.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search customer..."
                  className="w-full min-w-[280px] rounded-2xl border border-slate-700 bg-[#0B1739] py-3 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAllCustomersMessage(true)
                }
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500"
              >
                💬 Message Customers
              </button>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Photo
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Customer ID
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Phone
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Orders
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Revenue
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-300">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-300">
                    More
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center"
                    >
                      <div className="text-5xl">
                        👥
                      </div>

                      <p className="mt-4 text-lg font-semibold text-white">
                        No customers found
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Try changing your search.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((item) => {
                    const customer =
                      item.customer;

                    return (
                      <tr
                        key={customer.id}
                        onClick={() =>
                          openProfile(item)
                        }
                        className="cursor-pointer border-t border-slate-700 transition hover:bg-slate-800/70"
                      >
                        {/* CUSTOMER */}

                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {item.name}
                            </p>

                            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                              {customer.email ||
                                "No email"}
                            </p>
                          </div>
                        </td>

                        {/* PHOTO */}

                        <td className="px-5 py-4">
                          {customer.photo_url ? (
                            <img
                              src={
                                customer.photo_url
                              }
                              alt={
                                customer.full_name
                              }
                              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-slate-700"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-xs font-semibold text-white ring-2 ring-slate-700">
                              {getInitials(
                                item.name
                              )}
                            </div>
                          )}
                        </td>

                        {/* CUSTOMER ID */}

                        <td className="px-5 py-4">
                          <span className="rounded-xl border border-slate-700 bg-[#0B1739] px-3 py-2 text-xs font-semibold text-blue-300">
                            {item.customerCode}
                          </span>
                        </td>

                        {/* PHONE */}

                        <td className="px-5 py-4 text-sm font-medium text-slate-300">
                          {item.phone}
                        </td>

                        {/* ORDERS */}

                        <td className="px-5 py-4 text-center">
                          <span className="text-lg font-semibold text-white">
                            {item.orders}
                          </span>
                        </td>

                        {/* REVENUE */}

                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold text-emerald-400">
                            {formatCurrency(
                              item.revenue
                            )}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(
                              customer.status
                            )}`}
                          >
                            {customer.status ||
                              "Active"}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="relative px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              setActiveMenu(
                                activeMenu ===
                                  customer.id
                                  ? null
                                  : customer.id
                              );
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#0B1739] text-lg font-semibold leading-none text-slate-300 transition hover:border-blue-500 hover:text-white"
                          >
                            ⋮
                          </button>

                          {activeMenu ===
                            customer.id && (
                            <div
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="absolute right-3 top-12 z-30 max-h-56 w-44 overflow-y-auto rounded-2xl border border-slate-700 bg-[#081028] p-1.5 text-left shadow-2xl"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  openProfile(
                                    item
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                              >
                                👁️
                                <span>
                                  View Profile
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    customer
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                              >
                                ✏️
                                <span>
                                  Edit Customer
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openMessage(
                                    customer
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                              >
                                💬
                                <span>
                                  Message
                                </span>
                              </button>

                              <div className="my-1 border-t border-slate-700" />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenu(
                                    null
                                  );
                                  setDeletingCustomer(
                                    customer
                                  );
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/40"
                              >
                                🗑️
                                <span>
                                  Delete
                                </span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* =====================================================
            CUSTOMER PROFILE / VIEW CUSTOMER
        ====================================================== */}

        {selectedCustomer && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() =>
              setSelectedCustomer(null)
            }
          >
            <div
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {/* PROFILE HEADER */}

              <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-8">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCustomer(null)
                  }
                  className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-semibold text-white transition hover:bg-white/20"
                >
                  ×
                </button>

                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  {selectedCustomer.customer
                    .photo_url ? (
                    <img
                      src={
                        selectedCustomer.customer
                          .photo_url
                      }
                      alt={
                        selectedCustomer.name
                      }
                      className="h-32 w-32 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold text-white ring-4 ring-white/20">
                      {getInitials(
                        selectedCustomer.name
                      )}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          selectedCustomer.customer
                            .status
                        )}`}
                      >
                        {selectedCustomer.customer
                          .status ||
                          "Active"}
                      </span>

                      <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                        {selectedCustomer.customer
                          .customer_type ||
                          "Retail"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                        {selectedCustomer.customerCode}
                      </span>
                    </div>

                    <h2 className="text-4xl font-bold text-white">
                      {selectedCustomer.name}
                    </h2>

                    <p className="mt-2 text-slate-300">
                      Customer profile and purchase
                      activity
                    </p>
                  </div>
                </div>
              </div>

              {/* PROFILE CONTENT */}

              <div className="p-8">
                {/* CUSTOMER KPI CARDS */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Orders
                    </p>

                    <p className="mt-2 text-3xl font-bold text-[#0B1739]">
                      {selectedCustomer.orders}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Revenue
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                      {formatCurrency(
                        selectedCustomer.revenue
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Highest Purchase
                    </p>

                    <p className="mt-2 text-2xl font-bold text-[#0B1739]">
                      {formatCurrency(
                        selectedCustomer.highestPurchase
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Average Order
                    </p>

                    <p className="mt-2 text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        selectedCustomer.averageOrder
                      )}
                    </p>
                  </div>
                </div>

                {/* CUSTOMER DETAILS */}

                <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-xl font-bold text-[#0B1739]">
                      Customer Details
                    </h3>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
                        <div className="border-b border-slate-200 p-4 sm:border-r">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Phone
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {selectedCustomer.phone}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Email
                          </p>

                          <p className="mt-1 break-all font-semibold text-slate-800">
                            {selectedCustomer.customer
                              .email ||
                              "Not provided"}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4 sm:border-r">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Customer Type
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {selectedCustomer.customer
                              .customer_type ||
                              "Retail"}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Registered
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {formatDate(
                              selectedCustomer.customer
                                .created_at
                            )}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Last Updated
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {formatDateTime(
                              selectedCustomer.customer
                                .updated_at
                            )}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Verification
                          </p>

                          <p
                            className={`mt-1 font-semibold ${
                              selectedCustomer.customer
                                .is_verified
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {selectedCustomer.customer
                              .is_verified
                              ? "Verified"
                              : "Not Verified"}
                          </p>
                        </div>

                        <div className="border-b border-slate-200 p-4 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Address
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {selectedCustomer.customer
                              .address ||
                              "No address provided"}
                          </p>
                        </div>

                        <div className="p-4 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Customer ID
                          </p>

                          <p className="mt-1 font-semibold text-blue-600">
                            {selectedCustomer.customerCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CUSTOMER ACTIVITY */}

                  <div>
                    <h3 className="mb-4 text-xl font-bold text-[#0B1739]">
                      Customer Activity
                    </h3>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          First Order
                        </p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {formatDateTime(
                            selectedCustomer.firstOrder
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Last Order
                        </p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {formatDateTime(
                            selectedCustomer.lastOrder
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Customer ID
                        </p>

                        <p className="mt-1 font-semibold text-blue-600">
                          {
                            selectedCustomer.customerCode
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Account Status
                        </p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {selectedCustomer.customer
                            .status ||
                            "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    CUSTOMER MESSAGES
                ================================================== */}

                <div className="mt-8">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#0B1739]">
                        Customer Messages
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-400">
                        Messages sent by this customer from
                        the future IRUKA BREAD customer portal
                        will appear here.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        loadCustomerMessages(
                          selectedCustomer.customer.id
                        )
                      }
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      ↻ Refresh Messages
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {messagesLoading ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                        <p className="mt-3 text-sm font-medium text-slate-500">
                          Loading customer messages...
                        </p>
                      </div>
                    ) : customerMessages.length === 0 ? (
                      <div className="bg-slate-50 p-8 text-center">
                        <div className="text-4xl">
                          💬
                        </div>

                        <p className="mt-3 font-semibold text-slate-700">
                          No customer messages yet
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          When this customer sends a message
                          through the customer portal, it will
                          appear in this section.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {customerMessages.map(
                          (message) => {
                            const messageBody =
                              message.message ||
                              message.content ||
                              message.body ||
                              "No message content";

                            const sender =
                              message.sender ||
                              message.sender_type ||
                              "Customer";

                            return (
                              <div
                                key={message.id}
                                className="p-5"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                        {sender}
                                      </span>

                                      {message.status && (
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                          {
                                            message.status
                                          }
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 font-medium text-slate-700">
                                      {messageBody}
                                    </p>
                                  </div>

                                  <p className="shrink-0 text-xs font-medium text-slate-400">
                                    {formatDateTime(
                                      message.created_at
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT ORDERS */}

                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#0B1739]">
                      Recent Orders
                    </h3>

                    <span className="text-sm font-semibold text-slate-400">
                      Latest activity
                    </span>
                  </div>

                  {selectedCustomer
                    .recentOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <p className="font-semibold text-slate-500">
                        No order history found.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      {selectedCustomer.recentOrders.map(
                        (order) => (
                          <div
                            key={order.id}
                            className="flex flex-col gap-3 border-b border-slate-200 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                Order #{order.id.slice(
                                  0,
                                  8
                                )}
                              </p>

                              <p className="mt-1 text-sm font-medium text-slate-500">
                                {formatDateTime(
                                  order.created_at
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {order.status ||
                                  "Pending"}
                              </span>

                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(
                                  Number(
                                    order.total_amount ||
                                      0
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* PROFILE ACTIONS */}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      openMessage(
                        selectedCustomer.customer
                      )
                    }
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
                  >
                    💬 Message Customer
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(
                        selectedCustomer.customer
                      )
                    }
                    className="rounded-2xl bg-[#0B1739] px-6 py-3 font-semibold text-white transition hover:bg-[#142850]"
                  >
                    ✏️ Edit Customer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeletingCustomer(
                        selectedCustomer.customer
                      );
                      setSelectedCustomer(null);
                    }}
                    className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            EDIT CUSTOMER MODAL
        ====================================================== */}

        {editingCustomer && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() =>
              setEditingCustomer(null)
            }
          >
            <div
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-7 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                      Customer Directory
                    </p>

                    <h2 className="mt-2 text-3xl font-bold">
                      Edit Customer
                    </h2>

                    <p className="mt-1 text-slate-300">
                      Update customer information.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCustomer(null)
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl font-semibold transition hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* PHOTO */}

                <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row">
                  {editingCustomer.photo_url ? (
                    <img
                      src={
                        editingCustomer.photo_url
                      }
                      alt={
                        editingCustomer.full_name
                      }
                      className="h-28 w-28 rounded-3xl object-cover ring-4 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-800 text-3xl font-bold text-white">
                      {getInitials(
                        editingCustomer.full_name
                      )}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-slate-800">
                      Customer Photo
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Upload a profile photo for this
                      customer.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          uploadCustomerPhoto(
                            file
                          );
                        }

                        event.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="mt-3 rounded-xl bg-[#0B1739] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#142850] disabled:opacity-50"
                    >
                      {uploadingPhoto
                        ? "Uploading..."
                        : "Upload Photo"}
                    </button>
                  </div>
                </div>

                {/* FORM */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>

                    <input
                      value={editForm.full_name}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          full_name:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>

                    <input
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          phone:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          email:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Customer Type
                    </label>

                    <select
                      value={
                        editForm.customer_type
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          customer_type:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="Retail">
                        Retail
                      </option>

                      <option value="Wholesale">
                        Wholesale
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          status:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="Pending">
                        Pending
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Address
                    </label>

                    <textarea
                      rows={4}
                      value={editForm.address}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          address:
                            event.target.value,
                        })
                      }
                      className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCustomer(null)
                    }
                    className="rounded-2xl border-2 border-slate-200 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={savingCustomer}
                    onClick={saveCustomer}
                    className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCustomer
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            INDIVIDUAL MESSAGE MODAL
        ====================================================== */}

        {messageCustomer && (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() =>
              setMessageCustomer(null)
            }
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-7 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                      Customer Communication
                    </p>

                    <h2 className="mt-2 text-3xl font-bold">
                      Message Customer
                    </h2>

                    <p className="mt-1 text-slate-300">
                      {messageCustomer.full_name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMessageCustomer(null)
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl font-semibold hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Customer messaging will be connected
                    when the customer portal messaging
                    backend is built. This form does not
                    currently claim to deliver or save a
                    message.
                  </p>
                </div>

                <label className="mt-6 mb-2 block text-sm font-semibold text-slate-700">
                  Message
                </label>

                <textarea
                  rows={7}
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  placeholder="Write your message..."
                  className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-4 font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMessageCustomer(null)
                    }
                    className="rounded-2xl border-2 border-slate-200 px-6 py-3 font-semibold text-slate-600"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={sendingMessage}
                    onClick={
                      handleMessageSend
                    }
                    className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {sendingMessage
                      ? "Processing..."
                      : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            BROADCAST MESSAGE MODAL
        ====================================================== */}

        {showAllCustomersMessage && (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() =>
              setShowAllCustomersMessage(false)
            }
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-7 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                      Customer Communication
                    </p>

                    <h2 className="mt-2 text-3xl font-bold">
                      Message All Customers
                    </h2>

                    <p className="mt-1 text-slate-300">
                      Broadcast communication
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAllCustomersMessage(
                        false
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl font-semibold hover:bg-white/20"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                      Recipients
                    </p>

                    <p className="mt-1 text-xl font-bold text-[#0B1739]">
                      {customers.length} customers
                    </p>
                  </div>

                  <span className="text-3xl">
                    👥
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Customer messaging will be connected
                    when the customer portal messaging
                    backend is built. This form does not
                    currently claim to deliver or save a
                    broadcast.
                  </p>
                </div>

                <label className="mt-6 mb-2 block text-sm font-semibold text-slate-700">
                  Broadcast Message
                </label>

                <textarea
                  rows={7}
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  placeholder="Write a message for all customers..."
                  className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-4 font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageText("");
                      setShowAllCustomersMessage(
                        false
                      );
                    }}
                    className="rounded-2xl border-2 border-slate-200 px-6 py-3 font-semibold text-slate-600"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={sendingMessage}
                    onClick={
                      handleMessageSend
                    }
                    className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {sendingMessage
                      ? "Processing..."
                      : "Send Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            DELETE CONFIRMATION
        ====================================================== */}

        {deletingCustomer && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() =>
              setDeletingCustomer(null)
            }
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-800 p-7 text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                  ⚠️
                </div>

                <h2 className="mt-5 text-3xl font-bold">
                  Delete Customer?
                </h2>

                <p className="mt-2 text-red-100">
                  This action cannot be undone.
                </p>
              </div>

              <div className="p-7">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Customer
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#0B1739]">
                    {deletingCustomer.full_name}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {deletingCustomer.phone ||
                      "No phone number"}
                  </p>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-600">
                  Deleting this customer will remove the
                  customer record from the Customer
                  directory.
                </p>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      setDeletingCustomer(null)
                    }
                    className="rounded-2xl border-2 border-slate-200 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={deleteCustomer}
                    className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting
                      ? "Deleting..."
                      : "Delete Customer"}
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