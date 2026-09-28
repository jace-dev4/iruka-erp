"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
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
  id: string | number;
  customer_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type Sale = {
  id: string | number;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
};

type Debtor = {
  id: string | number;
  customer_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  balance?: number | null;
  status?: string | null;
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
  balanceDue: number;
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

const customerStatusClasses = (status?: string | null) => {
  const value = normalize(status || "Active");

  if (value === "active") {
    return "bg-green-100 text-green-700";
  }

  if (value === "pending") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (value === "inactive") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
};

const getLagosGreeting = () => {
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

/* =========================================================
   PAGE
========================================================= */

export default function CustomerPage() {
  /* =========================================================
     DATA
  ========================================================== */

const [customers, setCustomers] = useState<Customer[]>([]);
const [orders, setOrders] = useState<Order[]>([]);
const [sales, setSales] = useState<Sale[]>([]);
const [debtors, setDebtors] = useState<Debtor[]>([]);

  const [customerMessages, setCustomerMessages] =
    useState<CustomerMessage[]>([]);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  /* =========================================================
     UI STATE
  ========================================================== */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [openActionMenu, setOpenActionMenu] =
    useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [profileCustomer, setProfileCustomer] =
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

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [savingCustomer, setSavingCustomer] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

    const [creatingPortalAccount, setCreatingPortalAccount] =
  useState(false);

const [portalPassword, setPortalPassword] =
  useState("");

const [showPortalPassword, setShowPortalPassword] =
  useState(false);

  const [messageText, setMessageText] =
    useState("");

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  /* =========================================================
     EDIT FORM
  ========================================================== */

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
    try {
      const {
        data,
        error,
      } = await supabase
        .from("customers")
        .select(
          "id, full_name, phone, is_verified, created_at, updated_at, customer_type, address, status, customer_code, photo_url, email, user_id"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "CUSTOMER LOAD ERROR:",
          error
        );

        showNotification(
          "error",
          "Unable to load customers."
        );

        return;
      }

      const loadedCustomers =
        (data || []) as Customer[];

      /* -----------------------------------------------------
         GENERATE CUSTOMER CODES WHEN MISSING
      ----------------------------------------------------- */

      const usedCodes = new Set(
        loadedCustomers
          .map(
            (customer) =>
              customer.customer_code
          )
          .filter(Boolean)
      );

      for (const customer of loadedCustomers) {
        if (!customer.customer_code) {
          let newCode =
            generateCustomerCode();

          while (
            usedCodes.has(newCode)
          ) {
            newCode =
              generateCustomerCode();
          }

          usedCodes.add(newCode);

          const {
            data: codeRows,
            error: codeError,
          } = await supabase
            .from("customers")
            .update({
              customer_code:
                newCode,
            })
            .eq(
              "id",
              customer.id
            )
            .select(
              "id, customer_code"
            )
            .maybeSingle();

          if (codeError) {
            console.error(
              "CUSTOMER CODE UPDATE ERROR:",
              codeError
            );
          } else if (!codeRows) {
            console.warn(
              "CUSTOMER CODE UPDATE RETURNED NO ROW:",
              customer.id
            );
          }

          customer.customer_code =
            newCode;
        }
      }

      /* -----------------------------------------------------
         UPDATE DIRECTORY
      ----------------------------------------------------- */

      setCustomers(
        [...loadedCustomers]
      );

      /* -----------------------------------------------------
         UPDATE OPEN PROFILE WITH FRESH DATA
      ----------------------------------------------------- */

      setProfileCustomer(
        (currentProfile) => {
          if (!currentProfile) {
            return currentProfile;
          }

          const freshCustomer =
            loadedCustomers.find(
              (customer) =>
                customer.id ===
                currentProfile.customer.id
            );

          if (!freshCustomer) {
            return currentProfile;
          }

          return {
            ...currentProfile,
            customer:
              freshCustomer,
            name:
              freshCustomer.full_name ||
              "Unnamed Customer",
            phone:
              freshCustomer.phone ||
              "No phone",
            customerCode:
              freshCustomer.customer_code ||
              "—",
          };
        }
      );
    } catch (error) {
      console.error(
        "UNEXPECTED CUSTOMER LOAD ERROR:",
        error
      );
    }
  };

  /* =========================================================
     LOAD ORDERS
  ========================================================== */

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ORDERS LOAD ERROR:",
        error
      );

      return;
    }

    setOrders(
      (data || []) as Order[]
    );
  };

  /* =========================================================
     LOAD SALES
  ========================================================== */

  const loadSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "SALES LOAD ERROR:",
        error
      );

      return;
    }

    setSales(
      (data || []) as Sale[]
    );
  };

  /* =========================================================
   LOAD DEBTORS
========================================================= */

const loadDebtors = async () => {
  const { data, error } = await supabase
    .from("debtors")
    .select(
      "id, customer_id, customer_name, phone, balance, status"
    );

  if (error) {
    console.error(
      "DEBTORS LOAD ERROR:",
      error
    );

    return;
  }

  setDebtors(
    (data || []) as Debtor[]
  );
};

  /* =========================================================
     LOAD CUSTOMER MESSAGES
  ========================================================== */

  const loadCustomerMessages = async (
    customerId: string
  ) => {
    setMessagesLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("customer_messages")
        .select("*")
        .eq(
          "customer_id",
          customerId
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.warn(
          "CUSTOMER MESSAGES UNAVAILABLE:",
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
        "CUSTOMER MESSAGE LOADING ERROR:",
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

  const loadAll = async (
    isRefresh = false
  ) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

await Promise.all([
  loadCustomers(),
  loadOrders(),
  loadSales(),
  loadDebtors(),
]);

    if (isRefresh) {
      setRefreshing(false);

      showNotification(
        "success",
        "Customer records refreshed successfully."
      );
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* =========================================================
     REALTIME - CUSTOMERS / ORDERS / SALES
  ========================================================== */

  useEffect(() => {
    const customersChannel =
      supabase
        .channel(
          "customer-page-customers"
        )
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

    const ordersChannel =
      supabase
        .channel(
          "customer-page-orders"
        )
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

    const salesChannel =
      supabase
        .channel(
          "customer-page-sales"
        )
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

        const debtorsChannel =
  supabase
    .channel(
      "customer-page-debtors"
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "debtors",
      },
      () => {
        loadDebtors();
      }
    )
    .subscribe();

return () => {
  supabase.removeChannel(
    customersChannel
  );

  supabase.removeChannel(
    ordersChannel
  );

  supabase.removeChannel(
    salesChannel
  );

  supabase.removeChannel(
    debtorsChannel
  );
};
  }, []);

  /* =========================================================
     REALTIME - CUSTOMER MESSAGES
  ========================================================== */

  useEffect(() => {
    const messagesChannel =
      supabase
        .channel(
          "customer-page-messages"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_messages",
          },
          () => {
            if (
              profileCustomer?.customer.id
            ) {
              loadCustomerMessages(
                profileCustomer.customer.id
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        messagesChannel
      );
    };
  }, [
    profileCustomer?.customer.id,
  ]);

  /* =========================================================
     CUSTOMER STATS
  ========================================================== */

  const customerStats =
    useMemo<CustomerStats[]>(() => {
      return customers.map(
        (customer) => {
          const customerId =
            normalize(customer.id);

          const customerPhone =
            normalize(customer.phone);

          const customerName =
            normalize(
              customer.full_name
            );

            const debtor =
  debtors.find((item) => {
    if (
      item.customer_id &&
      normalize(
        item.customer_id
      ) === customerId
    ) {
      return true;
    }

    const debtorPhone =
      String(
        item.phone || ""
      )
        .replace(/\s+/g, "")
        .trim();

    const normalizedCustomerPhone =
      String(
        customer.phone || ""
      )
        .replace(/\s+/g, "")
        .trim();

    if (
      normalizedCustomerPhone &&
      debtorPhone ===
        normalizedCustomerPhone
    ) {
      return true;
    }

    return false;
  });

const balanceDue = Math.max(
  Number(
    debtor?.balance || 0
  ),
  0
);

          const matchedOrders =
            orders.filter(
              (order) => {
                if (
                  order.customer_id &&
                  normalize(
                    order.customer_id
                  ) === customerId
                ) {
                  return true;
                }

                if (
                  customerPhone &&
                  normalize(
                    order.phone
                  ) === customerPhone
                ) {
                  return true;
                }

                if (
                  customerName &&
                  normalize(
                    order.customer_name
                  ) === customerName
                ) {
                  return true;
                }

                return false;
              }
            );

          const matchedSales =
            sales.filter(
              (sale) => {
                if (
                  sale.customer_id &&
                  normalize(
                    sale.customer_id
                  ) === customerId
                ) {
                  return true;
                }

                const salePhone =
                  normalize(
                    sale.customer_phone ||
                      sale.phone
                  );

                if (
                  customerPhone &&
                  salePhone ===
                    customerPhone
                ) {
                  return true;
                }

                if (
                  customerName &&
                  normalize(
                    sale.customer_name
                  ) === customerName
                ) {
                  return true;
                }

                return false;
              }
            );

          const orderRevenue =
            matchedOrders.reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total_amount || 0
                ),
              0
            );

          const salesRevenue =
            matchedSales.reduce(
              (sum, sale) =>
                sum +
                Number(
                  sale.total_amount || 0
                ),
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
            ...matchedOrders.map(
              (item) =>
                Number(
                  item.total_amount || 0
                )
            ),
            ...matchedSales.map(
              (item) =>
                Number(
                  item.total_amount || 0
                )
            ),
          ];

          const highestPurchase =
            allAmounts.length > 0
              ? Math.max(...allAmounts)
              : 0;

          const allDates = [
            ...matchedOrders
              .map(
                (item) =>
                  item.created_at
              )
              .filter(
                Boolean
              ) as string[],

            ...matchedSales
              .map(
                (item) =>
                  item.created_at
              )
              .filter(
                Boolean
              ) as string[],
          ].sort(
            (a, b) =>
              new Date(a).getTime() -
              new Date(b).getTime()
          );

          const firstOrder =
            allDates.length > 0
              ? allDates[0]
              : null;

          const lastOrder =
            allDates.length > 0
              ? allDates[
                  allDates.length - 1
                ]
              : null;

return {
  customer,
  name:
    customer.full_name ||
    "Unnamed Customer",
  phone:
    customer.phone ||
    "No phone",
  customerCode:
    customer.customer_code ||
    "—",
  orders: totalOrders,
  revenue,
  highestPurchase,
  averageOrder:
    totalOrders > 0
      ? revenue /
        totalOrders
      : 0,
  balanceDue,
  firstOrder,
  lastOrder,
  recentOrders:
    matchedOrders.slice(
      0,
      5
    ),
          };
        }
      );
}, [
  customers,
  orders,
  sales,
  debtors,
]);

  /* =========================================================
     SEARCH
  ========================================================== */

  const filteredCustomers =
    useMemo(() => {
      const query =
        normalize(search);

      if (!query) {
        return customerStats;
      }

      return customerStats.filter(
        (item) =>
          normalize(
            item.name
          ).includes(query) ||
          normalize(
            item.phone
          ).includes(query) ||
          normalize(
            item.customerCode
          ).includes(query) ||
          normalize(
            item.customer.email
          ).includes(query)
      );
    }, [
      customerStats,
      search,
    ]);

  /* =========================================================
     KPIs
  ========================================================== */

  const totalCustomers =
    customers.length;

  const activeCustomers =
    customers.filter(
      (customer) =>
        normalize(
          customer.status ||
            "Active"
        ) === "active"
    ).length;

  const newCustomersThisMonth =
    customers.filter(
      (customer) => {
        if (!customer.created_at) {
          return false;
        }

        const created =
          new Date(
            customer.created_at
          );

        const now =
          new Date();

        return (
          created.getFullYear() ===
            now.getFullYear() &&
          created.getMonth() ===
            now.getMonth()
        );
      }
    ).length;

  const totalCustomerOrders =
    customerStats.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.orders || 0
        ),
      0
    );

  const totalCustomerRevenue =
    customerStats.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.revenue || 0
        ),
      0
    );

  const averageOrderValue =
    totalCustomerOrders > 0
      ? totalCustomerRevenue /
        totalCustomerOrders
      : 0;

  /* =========================================================
     OPEN PROFILE
  ========================================================== */

  const openProfile = async (
    stats: CustomerStats
  ) => {
    setOpenActionMenu(null);

    setMessageCustomer(null);
    setEditingCustomer(null);

    setProfileCustomer(stats);
    setShowProfileModal(true);

    setCustomerMessages([]);

    await loadCustomerMessages(
      stats.customer.id
    );
  };

  /* =========================================================
     OPEN EDIT
  ========================================================== */

  const openEdit = (
    customer: Customer
  ) => {
    setOpenActionMenu(null);

    setShowProfileModal(false);
    setProfileCustomer(null);

    setEditingCustomer(customer);

    setEditForm({
      full_name:
        customer.full_name ||
        "",
      phone:
        customer.phone ||
        "",
      email:
        customer.email ||
        "",
      address:
        customer.address ||
        "",
      customer_type:
        customer.customer_type ||
        "Retail",
      status:
        customer.status ||
        "Active",
    });
  };

  /* =========================================================
     OPEN MESSAGE
  ========================================================== */

  const openMessage = (
    customer: Customer
  ) => {
    setOpenActionMenu(null);

    setShowProfileModal(false);
    setProfileCustomer(null);

    setMessageText("");

    setMessageCustomer(
      customer
    );
  };

  /* =========================================================
     SAVE CUSTOMER EDITS
  ========================================================== */

  const saveCustomer = async () => {
    if (!editingCustomer) {
      return;
    }

    const fullName =
      editForm.full_name.trim();

    const phone =
      editForm.phone.trim();

    const email =
      editForm.email.trim();

    const address =
      editForm.address.trim();

    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!fullName) {
      showNotification(
        "error",
        "Customer full name is required."
      );

      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      showNotification(
        "error",
        "Please enter a valid email address."
      );

      return;
    }

    setSavingCustomer(true);

    try {
      const updatedAt =
        new Date().toISOString();

      console.log(
        "UPDATING CUSTOMER:",
        {
          id: editingCustomer.id,
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          address: address || null,
          customer_type:
            editForm.customer_type ||
            "Retail",
          status:
            editForm.status ||
            "Active",
        }
      );

      /* -----------------------------------------------------
         UPDATE DATABASE
      ----------------------------------------------------- */

      const {
        data: updatedRows,
        error,
      } = await supabase
        .from("customers")
        .update({
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          address: address || null,
          customer_type:
            editForm.customer_type ||
            "Retail",
          status:
            editForm.status ||
            "Active",
          updated_at: updatedAt,
        })
        .eq(
          "id",
          editingCustomer.id
        )
        .select(
          "id, full_name, phone, email, address, customer_type, status, customer_code, photo_url, updated_at, created_at, is_verified, user_id"
        )
        .maybeSingle();

      /* -----------------------------------------------------
         DATABASE ERROR
      ----------------------------------------------------- */

      if (error) {
        console.error(
          "CUSTOMER UPDATE ERROR:",
          error
        );

        showNotification(
          "error",
          `Failed to update customer: ${error.message}`
        );

        return;
      }

      /* -----------------------------------------------------
         NO ROW RETURNED
      ----------------------------------------------------- */

      if (!updatedRows) {
        console.error(
          "CUSTOMER UPDATE RETURNED NO ROW:",
          {
            customerId:
              editingCustomer.id,
          }
        );

        showNotification(
          "error",
          "Customer was not updated. Supabase returned no updated customer record. Check your customers UPDATE/SELECT RLS policies."
        );

        return;
      }

      /* -----------------------------------------------------
         SUCCESS
      ----------------------------------------------------- */

      console.log(
        "CUSTOMER UPDATED SUCCESSFULLY:",
        updatedRows
      );

      const updatedCustomer =
        updatedRows as Customer;

      /* -----------------------------------------------------
         IMMEDIATELY UPDATE DIRECTORY
      ----------------------------------------------------- */

      setCustomers(
        (currentCustomers) =>
          currentCustomers.map(
            (customer) =>
              customer.id ===
              updatedCustomer.id
                ? {
                    ...customer,
                    ...updatedCustomer,
                  }
                : customer
          )
      );

      /* -----------------------------------------------------
         CLOSE EDIT MODAL
      ----------------------------------------------------- */

      setEditingCustomer(null);

      /* -----------------------------------------------------
         REFRESH FROM DATABASE
      ----------------------------------------------------- */

      await loadCustomers();

      showNotification(
        "success",
        "Customer updated successfully."
      );
    } catch (error) {
      console.error(
        "UNEXPECTED CUSTOMER UPDATE ERROR:",
        error
      );

      showNotification(
        "error",
        "Something went wrong while updating the customer."
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  /* =========================================================
     DELETE CUSTOMER
  ========================================================== */

  const deleteCustomer =
    async () => {
      if (!deletingCustomer) {
        return;
      }

      setDeleting(true);

      try {
        const customer =
          deletingCustomer;

        console.log(
          "DELETING CUSTOMER:",
          customer.id
        );

        const {
          data: deletedRows,
          error,
        } = await supabase
          .from("customers")
          .delete()
          .eq(
            "id",
            customer.id
          )
          .select(
            "id"
          )
          .maybeSingle();

        if (error) {
          console.error(
            "CUSTOMER DELETE ERROR:",
            error
          );

          showNotification(
            "error",
            `Unable to delete customer: ${error.message}`
          );

          return;
        }

        if (!deletedRows) {
          console.error(
            "CUSTOMER DELETE RETURNED NO ROW:",
            customer.id
          );

          showNotification(
            "error",
            "Customer was not deleted. Supabase returned no deleted record."
          );

          return;
        }

        console.log(
          "CUSTOMER DELETED SUCCESSFULLY:",
          deletedRows
        );

        setCustomers(
          (currentCustomers) =>
            currentCustomers.filter(
              (item) =>
                item.id !==
                customer.id
            )
        );

        setDeletingCustomer(
          null
        );

        setShowProfileModal(false);
        setProfileCustomer(null);

        showNotification(
          "success",
          "Customer deleted successfully."
        );

        await loadCustomers();
      } catch (error) {
        console.error(
          "UNEXPECTED CUSTOMER DELETE ERROR:",
          error
        );

        showNotification(
          "error",
          "Something went wrong while deleting the customer."
        );
      } finally {
        setDeleting(false);
      }
    };

  /* =========================================================
     CUSTOMER PHOTO
  ========================================================== */

  const uploadCustomerPhoto = async (
    file: File
  ) => {
    if (!editingCustomer) {
      return;
    }

    setUploadingPhoto(true);

    try {
      /* -----------------------------------------------------
         VALIDATE FILE
      ----------------------------------------------------- */

      if (!file) {
        throw new Error(
          "No image file was selected."
        );
      }

      if (!file.type.startsWith("image/")) {
        throw new Error(
          "Please select a valid image file."
        );
      }

      const maxSize =
        5 * 1024 * 1024;

      if (file.size > maxSize) {
        throw new Error(
          "Image must be smaller than 5MB."
        );
      }

      /* -----------------------------------------------------
         CUSTOMER CODE
      ----------------------------------------------------- */

      const customerCode =
        editingCustomer.customer_code ||
        generateCustomerCode();

      /* -----------------------------------------------------
         FILE EXTENSION
      ----------------------------------------------------- */

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      /* -----------------------------------------------------
         UNIQUE FILE PATH
      ----------------------------------------------------- */

      const filePath =
        `${customerCode}/profile-${Date.now()}.${extension}`;

      console.log(
        "UPLOADING CUSTOMER PHOTO:",
        {
          customerId:
            editingCustomer.id,
          filePath,
        }
      );

      /* -----------------------------------------------------
         UPLOAD TO STORAGE
      ----------------------------------------------------- */

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("customer-photos")
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: true,
              contentType: file.type,
            }
          );

      if (uploadError) {
        console.error(
          "CUSTOMER PHOTO STORAGE ERROR:",
          uploadError
        );

        throw new Error(
          uploadError.message ||
            "Supabase Storage upload failed."
        );
      }

      /* -----------------------------------------------------
         GET PUBLIC URL
      ----------------------------------------------------- */

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from("customer-photos")
          .getPublicUrl(
            filePath
          );

      const publicUrl =
        publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error(
          "Supabase did not return a public image URL."
        );
      }

      console.log(
        "CUSTOMER PHOTO PUBLIC URL:",
        publicUrl
      );

      /* -----------------------------------------------------
         SAVE PHOTO URL TO CUSTOMER
      ----------------------------------------------------- */

      const photoUpdatedAt =
        new Date().toISOString();

      const {
        data: updatedPhotoCustomer,
        error: customerUpdateError,
      } = await supabase
        .from("customers")
        .update({
          photo_url: publicUrl,
          updated_at:
            photoUpdatedAt,
        })
        .eq(
          "id",
          editingCustomer.id
        )
        .select(
          "id, full_name, phone, email, address, customer_type, status, customer_code, photo_url, updated_at, created_at, is_verified, user_id"
        )
        .maybeSingle();

      if (customerUpdateError) {
        console.error(
          "CUSTOMER PHOTO DATABASE ERROR:",
          customerUpdateError
        );

        throw new Error(
          customerUpdateError.message ||
            "Could not save customer photo."
        );
      }

      if (!updatedPhotoCustomer) {
        console.error(
          "CUSTOMER PHOTO UPDATE RETURNED NO ROW:",
          editingCustomer.id
        );

        throw new Error(
          "The photo uploaded successfully, but Supabase did not return the updated customer. Check your customers UPDATE/SELECT RLS policies."
        );
      }

      console.log(
        "CUSTOMER PHOTO SAVED SUCCESSFULLY:",
        updatedPhotoCustomer
      );

      const updatedCustomer =
        updatedPhotoCustomer as Customer;

      /* -----------------------------------------------------
         UPDATE EDIT MODAL IMMEDIATELY
      ----------------------------------------------------- */

      setEditingCustomer(
        updatedCustomer
      );

      /* -----------------------------------------------------
         UPDATE DIRECTORY IMMEDIATELY
      ----------------------------------------------------- */

      setCustomers(
        (currentCustomers) =>
          currentCustomers.map(
            (customer) =>
              customer.id ===
              updatedCustomer.id
                ? {
                    ...customer,
                    ...updatedCustomer,
                  }
                : customer
          )
      );

      /* -----------------------------------------------------
         UPDATE PROFILE IF IT EXISTS
      ----------------------------------------------------- */

      setProfileCustomer(
        (currentProfile) => {
          if (
            !currentProfile ||
            currentProfile.customer.id !==
              updatedCustomer.id
          ) {
            return currentProfile;
          }

          return {
            ...currentProfile,
            customer:
              updatedCustomer,
            name:
              updatedCustomer.full_name ||
              "Unnamed Customer",
            phone:
              updatedCustomer.phone ||
              "No phone",
            customerCode:
              updatedCustomer.customer_code ||
              "—",
          };
        }
      );

      /* -----------------------------------------------------
         REFRESH CUSTOMER DATA
      ----------------------------------------------------- */

      await loadCustomers();

      showNotification(
        "success",
        "Customer photo updated successfully."
      );
    } catch (error: unknown) {
      console.error(
        "CUSTOMER PHOTO UPLOAD ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to upload customer photo.";

      showNotification(
        "error",
        message
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* =========================================================
     MESSAGING
  ========================================================== */

const handleMessageSend = async () => {
  const trimmedMessage = messageText.trim();

  if (!trimmedMessage) {
    showNotification(
      "error",
      "Enter a message first."
    );

    return;
  }

  setSendingMessage(true);

  try {
    /*
     * =====================================================
     * INDIVIDUAL CUSTOMER MESSAGE
     * =====================================================
     */

    if (messageCustomer) {
      const { error } = await supabase
        .from("customer_messages")
        .insert({
          customer_id: messageCustomer.id,
          sender: "Admin",
          sender_type: "admin",
          message: trimmedMessage,
          direction: "outbound",
          audience: "individual",
          message_type: "message",
          status: "sent",
        });

      if (error) {
        console.error(
          "ADMIN CUSTOMER MESSAGE ERROR:",
          error
        );

        throw error;
      }

      /*
       * Refresh the customer's messages
       * if the profile is currently open.
       */
      if (
        profileCustomer?.customer.id ===
        messageCustomer.id
      ) {
        await loadCustomerMessages(
          messageCustomer.id
        );
      }

      setMessageText("");

      setMessageCustomer(null);

      showNotification(
        "success",
        `Message sent to ${messageCustomer.full_name}.`
      );

      return;
    }

    /*
     * =====================================================
     * BROADCAST MESSAGE TO ALL CUSTOMERS
     * =====================================================
     */

    if (showAllCustomersMessage) {
      if (!customers.length) {
        showNotification(
          "error",
          "There are no customers to message."
        );

        return;
      }

      const messages = customers.map(
        (customer) => ({
          customer_id: customer.id,
          sender: "Admin",
          sender_type: "admin",
          message: trimmedMessage,
          direction: "outbound",
          audience: "all",
          message_type: "message",
          status: "sent",
        })
      );

      const { error } = await supabase
        .from("customer_messages")
        .insert(messages);

      if (error) {
        console.error(
          "ADMIN BROADCAST MESSAGE ERROR:",
          error
        );

        throw error;
      }

      setMessageText("");

      setShowAllCustomersMessage(false);

      showNotification(
        "success",
        `Message sent to ${customers.length} customers.`
      );

      return;
    }

    showNotification(
      "error",
      "No customer was selected."
    );
  } catch (error: unknown) {
    console.error(
      "ADMIN MESSAGE SEND ERROR:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to send message.";

    showNotification(
      "error",
      errorMessage
    );
  } finally {
    setSendingMessage(false);
  }
};
/* =========================================================
   CLOSE ACTION MENU WHEN CLICKING OUTSIDE
========================================================== */

useEffect(() => {
  const handleClickOutside = (
    event: MouseEvent
  ) => {
    const target =
      event.target as HTMLElement;

    if (
      !target.closest(
        "[data-customer-action-menu]"
      )
    ) {
      setOpenActionMenu(null);
    }
  };

  document.addEventListener(
    "click",
    handleClickOutside
  );

  return () => {
    document.removeEventListener(
      "click",
      handleClickOutside
    );
  };
}, []);

  /* =========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <ProtectedRoute
        allowedRoles={[
          "admin",
          "cashier",
        ]}
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
      allowedRoles={[
        "admin",
        "cashier",
      ]}
    >
      <div className="min-h-screen bg-gradient-to-br from-[#081028] via-[#0B1739] to-[#142850] p-10">

        {/* =====================================================
            NOTIFICATION
        ====================================================== */}

        {notification && (
          <div className="fixed right-8 top-8 z-[300]">
            <div
              className={`rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl ${
                notification.type ===
                "success"
                  ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"
                  : "border-red-400/30 bg-red-950/90 text-red-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {notification.type ===
                  "success"
                    ? "✓"
                    : "!"}
                </span>

                <span className="font-semibold">
                  {
                    notification.message
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            EXECUTIVE HEADER
        ====================================================== */}

        <header className="mb-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">

            {/* LEFT SIDE */}

            <div className="flex items-center gap-6">

              <img
                src="/logo/nkiruka-logo.png"
                alt="NKIRUKA"
                width={90}
                height={90}
                className="h-[90px] w-[90px] object-contain"
              />

              <div>
                <p className="text-lg font-semibold text-blue-400">
                  👋 {getLagosGreeting()},
                </p>

                <h1 className="mt-2 text-5xl font-black text-white">
                  Customer Management
                </h1>

                <p className="mt-2 text-lg text-slate-400">
                  Customer Relationship & Records
                </p>

                <p className="mt-1 text-slate-500">
                  Customer Analytics Center
                </p>
              </div>

            </div>

            {/* RIGHT SIDE */}

            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">

              {/* REFRESH */}

              <button
                type="button"
                onClick={() =>
                  loadAll(true)
                }
                disabled={refreshing}
                className="flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-6 py-4 text-white shadow-xl transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className={`text-xl ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                >
                  ↻
                </span>

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              {/* DATE */}

              <div className="rounded-3xl border border-slate-700 bg-slate-900 px-8 py-6 shadow-2xl">

                <p className="text-slate-400">
                  Today
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  {new Intl.DateTimeFormat(
                    "en-NG",
                    {
                      weekday:
                        "long",
                      day: "2-digit",
                      month:
                        "short",
                      year: "numeric",
                      timeZone:
                        "Africa/Lagos",
                    }
                  ).format(
                    currentTime
                  )}
                </h2>

                <p className="mt-2 font-semibold text-blue-400">
                  {new Intl.DateTimeFormat(
                    "en-NG",
                    {
                      hour: "2-digit",
                      minute:
                        "2-digit",
                      second:
                        "2-digit",
                      hour12: true,
                      timeZone:
                        "Africa/Lagos",
                    }
                  ).format(
                    currentTime
                  )}
                </p>

                <p className="mt-1 font-semibold text-yellow-400">
                  Customer Analytics Center
                </p>

              </div>

            </div>

          </div>
        </header>

        {/* =====================================================
            KPI CARDS
        ====================================================== */}

        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-7 text-white shadow-xl">

            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
              TOTAL CUSTOMERS
            </p>

            <h2 className="mt-4 text-5xl font-black">
              {totalCustomers}
            </h2>

            <p className="mt-2 text-sm font-semibold text-blue-100">
              Registered customers
            </p>

          </div>

          {/* ACTIVE */}

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-7 text-white shadow-xl">

            <p className="text-xs font-semibold uppercase tracking-widest text-green-100">
              ACTIVE CUSTOMERS
            </p>

            <h2 className="mt-4 text-5xl font-black">
              {activeCustomers}
            </h2>

            <p className="mt-2 text-sm font-semibold text-green-100">
              Currently active
            </p>

          </div>

          {/* NEW */}

          <div className="rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-red-800 p-7 text-white shadow-xl">

            <p className="text-xs font-semibold uppercase tracking-widest text-red-100">
              NEW THIS MONTH
            </p>

            <h2 className="mt-4 text-5xl font-black">
              {newCustomersThisMonth}
            </h2>

            <p className="mt-2 text-sm font-semibold text-red-100">
              Recently registered
            </p>

          </div>

          {/* AVERAGE */}

          <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-7 text-white shadow-xl">

            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-100">
              AVERAGE ORDER
            </p>

            <h2 className="mt-4 text-4xl font-black">
              {formatCurrency(
                averageOrderValue
              )}
            </h2>

            <p className="mt-2 text-sm font-semibold text-yellow-100">
              Across customer activity
            </p>

          </div>

        </div>

{/* =====================================================
    CUSTOMER DIRECTORY
====================================================== */}

<div
  className="rounded-3xl border border-slate-700 bg-[#111C44] p-8 shadow-2xl"
  onClick={(event) => event.stopPropagation()}
>
  {/* DIRECTORY HEADER */}

  <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-3xl font-black text-white">
        Customer Directory
      </h2>

      <p className="mt-1 text-slate-400">
        Showing{" "}
        {filteredCustomers.length}{" "}
        customer records.
      </p>
    </div>

    <div className="mt-5 flex flex-col gap-3 md:mt-0 md:flex-row">
      <input
        type="text"
        placeholder="Search customer..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-600 bg-[#0B1739] p-4 text-white outline-none placeholder:text-slate-400 focus:border-blue-500 md:w-80"
      />

      <button
        type="button"
        onClick={() =>
          setShowAllCustomersMessage(true)
        }
        className="rounded-2xl border border-blue-400/30 bg-blue-700 px-6 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95"
      >
        💬 Message Customers
      </button>
    </div>
  </div>

  {/* TABLE */}

  <div className="overflow-x-auto rounded-2xl">
    <table className="w-full min-w-[1150px]">
      <thead>
        <tr className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white">
          <th className="p-5 text-left">
            Photo
          </th>

          <th className="p-5 text-left">
            Full Name
          </th>

          <th className="p-5 text-left">
            Customer ID
          </th>

          <th className="p-5 text-left">
            Phone
          </th>

          <th className="p-5 text-center">
            Orders
          </th>

          <th className="p-5 text-left">
            Revenue
          </th>

          <th className="p-5 text-left">
            Status
          </th>

 <th className="p-5 text-right whitespace-nowrap">
  Balance Due
</th>
        </tr>
      </thead>

      <tbody>
        {filteredCustomers.length === 0 ? (
          <tr>
            <td
              colSpan={8}
              className="p-12 text-center text-slate-400"
            >
              <div className="text-5xl">
                👥
              </div>

              <p className="mt-4 text-lg font-semibold text-white">
                No customers found.
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
                className="cursor-pointer border-b border-slate-700 transition hover:bg-slate-800"
              >
                {/* PHOTO */}

                <td className="p-5">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                    {customer.photo_url ? (
                      <img
                        src={
                          customer.photo_url
                        }
                        alt={
                          customer.full_name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-sm font-bold text-white">
                        {getInitials(
                          item.name
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* NAME */}

                <td className="whitespace-nowrap p-5">
                  <p className="font-semibold text-white">
                    {item.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {customer.email ||
                      "No email"}
                  </p>
                </td>

                {/* CUSTOMER ID */}

                <td className="p-5">
                  <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-900">
                    {item.customerCode}
                  </span>
                </td>

                {/* PHONE */}

                <td className="whitespace-nowrap p-5 text-slate-200">
                  {item.phone}
                </td>

                {/* ORDERS */}

                <td className="p-5 text-center">
                  <span className="font-black text-white">
                    {item.orders}
                  </span>
                </td>

                {/* REVENUE */}

                <td className="whitespace-nowrap p-5 font-bold text-green-400">
                  {formatCurrency(
                    item.revenue
                  )}
                </td>

                {/* STATUS */}

                <td className="p-5">
                  <span
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${customerStatusClasses(
                      customer.status
                    )}`}
                  >
                    {customer.status ||
                      "Active"}
                  </span>
                </td>

{/* OUTSTANDING BALANCE */}

<td className="whitespace-nowrap p-5 text-right">
  <span
    className={`font-bold ${
      item.balanceDue > 0
        ? "text-amber-400"
        : "text-slate-400"
    }`}
  >
    {formatCurrency(
      item.balanceDue
    )}
  </span>
</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</div>

        {/* =====================================================
            CUSTOMER PROFILE MODAL
        ====================================================== */}

        {showProfileModal &&
          profileCustomer && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm"
              onClick={() => {
                setShowProfileModal(false);
                setProfileCustomer(null);
              }}
            >

<div
  className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
  onClick={(event) =>
    event.stopPropagation()
  }
>

                {/* PROFILE HEADER */}

                <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white">

                  <div className="flex flex-col gap-6 md:flex-row md:items-center">

                    {/* CUSTOMER PHOTO */}

                    <div className="h-44 w-44 flex-shrink-0 overflow-hidden rounded-3xl border-4 border-white/20 bg-white/20 shadow-2xl md:h-52 md:w-52">

                      {profileCustomer.customer.photo_url ? (
                        <img
                          src={
                            profileCustomer.customer.photo_url
                          }
                          alt={
                            profileCustomer.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-6xl font-black">
                          {getInitials(
                            profileCustomer.name
                          )}
                        </div>
                      )}

                    </div>

                    {/* CUSTOMER INFORMATION */}

                    <div className="flex-1">

                      <div className="mb-3 flex flex-wrap gap-3">

                        <span
                          className={`rounded-full px-4 py-2 text-sm font-bold ${customerStatusClasses(
                            profileCustomer.customer.status
                          )}`}
                        >
                          {
                            profileCustomer.customer.status ||
                            "Active"
                          }
                        </span>

                        <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                          {
                            profileCustomer.customer
                              .customer_type ||
                            "Retail"
                          }
                        </span>

                      </div>

                      <h2 className="text-4xl font-black">
                        {profileCustomer.name}
                      </h2>

                      <p className="mt-1 text-xl font-semibold text-blue-200">
                        Customer Profile
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-5 text-blue-100">

                        <div>
                          <p className="text-xs uppercase">
                            Customer ID
                          </p>

                          <p className="font-bold">
                            {
                              profileCustomer.customerCode
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            Phone
                          </p>

                          <p className="font-bold">
                            {profileCustomer.phone}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            Orders
                          </p>

                          <p className="font-bold">
                            {profileCustomer.orders}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            Revenue
                          </p>

                          <p className="font-bold">
                            {formatCurrency(
                              profileCustomer.revenue
                            )}
                          </p>
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* CLOSE BUTTON */}

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      setProfileCustomer(null);
                    }}
                    className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold text-white transition hover:bg-white/20"
                  >
                    ✕
                  </button>

                </div>

{/* PROFILE BODY */}

<div className="min-h-0 flex-1 overflow-y-auto p-8">

                  {/* CUSTOMER KPI */}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-4">

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Orders
                      </p>

                      <p className="mt-2 text-3xl font-black text-slate-900">
                        {profileCustomer.orders}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Revenue
                      </p>

                      <p className="mt-2 text-2xl font-black text-green-600">
                        {formatCurrency(
                          profileCustomer.revenue
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Highest Purchase
                      </p>

                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {formatCurrency(
                          profileCustomer.highestPurchase
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Average Order
                      </p>

                      <p className="mt-2 text-2xl font-black text-blue-700">
                        {formatCurrency(
                          profileCustomer.averageOrder
                        )}
                      </p>
                    </div>

                  </div>

                  {/* DETAILS */}

                  <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

                    {/* CUSTOMER INFORMATION */}

                    <div>

                      <h3 className="mb-5 text-2xl font-black text-slate-900">
                        Customer Information
                      </h3>

                      <div className="space-y-4">

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Full Name
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {profileCustomer.name}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Phone
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {
                              profileCustomer.customer.phone ||
                              "No phone number"
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Email
                          </p>

                          <p className="mt-1 break-all font-bold text-slate-800">
                            {
                              profileCustomer.customer.email ||
                              "Not provided"
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Address
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {
                              profileCustomer.customer.address ||
                              "No address provided"
                            }
                          </p>
                        </div>

                      </div>

                    </div>

                    {/* CUSTOMER ACTIVITY */}

                    <div>

                      <h3 className="mb-5 text-2xl font-black text-slate-900">
                        Customer Activity
                      </h3>

                      <div className="space-y-4">

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Customer ID
                          </p>

                          <p className="mt-1 font-bold text-blue-700">
                            {
                              profileCustomer.customerCode
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Registered
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {formatDate(
                              profileCustomer.customer.created_at
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            First Order
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {formatDateTime(
                              profileCustomer.firstOrder
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Last Order
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {formatDateTime(
                              profileCustomer.lastOrder
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Verification
                          </p>

                          <p
                            className={`mt-1 font-bold ${
                              profileCustomer.customer
                                .is_verified
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {profileCustomer.customer
                              .is_verified
                              ? "Verified"
                              : "Not Verified"}
                          </p>
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* CUSTOMER MESSAGES */}

                  <div className="mt-10">

                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <h3 className="text-2xl font-black text-slate-900">
                          Customer Messages
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                          Messages from the future
                          IRUKA BREAD customer portal
                          will appear here.
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          loadCustomerMessages(
                            profileCustomer.customer.id
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
                      >
                        ↻ Refresh Messages
                      </button>

                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">

                      {messagesLoading ? (
                        <div className="p-10 text-center">

                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

                          <p className="mt-3 text-sm text-slate-500">
                            Loading customer messages...
                          </p>

                        </div>
                      ) : customerMessages.length ===
                        0 ? (
                        <div className="bg-slate-50 p-10 text-center">

                          <div className="text-4xl">
                            💬
                          </div>

                          <p className="mt-3 font-bold text-slate-700">
                            No customer messages yet
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            When this customer sends a
                            message through the customer
                            portal, it will appear here.
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

                                      <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                                        {
                                          messageBody
                                        }
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

                  <div className="mt-10">

                    <div className="mb-5 flex items-center justify-between">

                      <h3 className="text-2xl font-black text-slate-900">
                        Recent Orders
                      </h3>

                      <span className="text-sm font-semibold text-slate-400">
                        Latest activity
                      </span>

                    </div>

                    {profileCustomer.recentOrders.length ===
                    0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <p className="font-semibold text-slate-500">
                          No order history found.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-slate-200">

                        {profileCustomer.recentOrders.map(
                          (order) => (
                            <div
                              key={String(
                                order.id
                              )}
                              className="flex flex-col gap-3 border-b border-slate-200 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                            >

                              <div>

                                <p className="font-bold text-slate-800">
                                  Order #
                                  {String(
                                    order.id
                                  ).slice(
                                    0,
                                    8
                                  )}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
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

                                <span className="font-bold text-green-600">
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

                  <div className="mt-10 flex flex-col justify-between gap-3 border-t border-slate-200 pt-7 sm:flex-row">

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false);
                        setProfileCustomer(null);

                        setDeletingCustomer(
                          profileCustomer.customer
                        );
                      }}
                      className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-red-700 active:scale-95"
                    >
                      🗑 Delete Customer
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row">

                      <button
                        type="button"
                        onClick={() =>
                          openMessage(
                            profileCustomer.customer
                          )
                        }
                        className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95"
                      >
                        💬 Message Customer
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            profileCustomer.customer
                          )
                        }
                        className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95"
                      >
                        ✎ Edit Customer
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileModal(false);
                          setProfileCustomer(null);
                        }}
                        className="rounded-xl bg-slate-300 px-6 py-3 font-bold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-slate-400 active:scale-95"
                      >
                        Close
                      </button>

                    </div>

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
            className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-md"
            onClick={() =>
              setEditingCustomer(
                null
              )
            }
          >

            <div
              className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_35px_90px_rgba(0,0,0,0.25)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-10 py-7">

                <div className="flex items-center gap-5">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                    👤
                  </div>

                  <div>

                    <h2 className="text-3xl font-bold text-slate-900">
                      Edit Customer
                    </h2>

                    <p className="mt-1 text-slate-400">
                      Update customer information.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingCustomer(
                      null
                    )
                  }
                  className="h-11 w-11 rounded-xl border border-slate-200 text-xl transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95"
                >
                  ✕
                </button>

              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10">

                {/* PHOTO */}

                <div className="mb-10 flex flex-col items-center">

                  <div className="h-40 w-40 overflow-hidden rounded-full border-[5px] border-slate-200 bg-slate-100 shadow-sm">

                    {editingCustomer.photo_url ? (
                      <img
                        src={
                          editingCustomer.photo_url
                        }
                        alt={
                          editingCustomer.full_name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-4xl font-black text-white">
                        {getInitials(
                          editingCustomer.full_name
                        )}
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    disabled={
                      uploadingPhoto
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-5 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {uploadingPhoto
                      ? "Uploading..."
                      : "Choose Photo"}
                  </button>

                  <p className="mt-2 text-xs text-slate-400">
                    JPG, PNG, WEBP or other image
                    files up to 5MB.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        uploadCustomerPhoto(
                          file
                        );
                      }

                      event.target.value =
                        "";
                    }}
                  />

                </div>

                {/* FORM */}

                <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">

                  {/* CUSTOMER ID */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Customer ID
                    </label>

                    <input
                      type="text"
                      value={
                        editingCustomer.customer_code ||
                        ""
                      }
                      readOnly
                      className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-bold text-blue-900"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Customer ID is permanent.
                    </p>

                  </div>

                  {/* FULL NAME */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>

                    <input
                      type="text"
                      value={
                        editForm.full_name
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          full_name:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    />

                  </div>

                  {/* PHONE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone Number
                    </label>

                    <input
                      type="text"
                      value={
                        editForm.phone
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          phone:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    />

                  </div>

                  {/* EMAIL */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      value={
                        editForm.email
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          email:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    />

                  </div>

                  {/* CUSTOMER TYPE */}

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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Retail">
                        Retail
                      </option>

                      <option value="Wholesale">
                        Wholesale
                      </option>
                    </select>

                  </div>

                  {/* STATUS */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Customer Status
                    </label>

                    <select
                      value={
                        editForm.status
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          status:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Active">
                        🟢 Active
                      </option>

                      <option value="Pending">
                        🟡 Pending
                      </option>

                      <option value="Inactive">
                        🔴 Inactive
                      </option>
                    </select>

                  </div>

                  {/* ADDRESS */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Address
                    </label>

                    <textarea
                      rows={4}
                      value={
                        editForm.address
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          address:
                            event.target.value,
                        })
                      }
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    />

                  </div>

                </div>

                {/* FOOTER */}

                <div className="mt-12 flex items-center justify-end gap-4 border-t border-slate-200 pt-8">

                  <button
                    type="button"
                    disabled={
                      savingCustomer ||
                      uploadingPhoto
                    }
                    onClick={() =>
                      setEditingCustomer(
                        null
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-8 py-3 font-semibold transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingCustomer ||
                      uploadingPhoto
                    }
                    onClick={
                      saveCustomer
                    }
                    className="rounded-xl bg-blue-700 px-10 py-3 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-blue-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCustomer
                      ? "Saving..."
                      : "💾 Save Changes"}
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
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
            onClick={() =>
              setMessageCustomer(
                null
              )
            }
          >

            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-7 text-white">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-3xl font-black">
                      Message Customer
                    </h2>

                    <p className="mt-1 text-blue-100">
                      {
                        messageCustomer.full_name
                      }
                    </p>

                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-2xl">
                    💬
                  </div>

                </div>

              </div>

              <div className="p-8">

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                  <p className="text-sm font-semibold leading-6 text-amber-800">
                    Customer messaging will be
                    connected when the customer
                    portal messaging backend is
                    built. This form does not
                    currently claim to deliver or
                    save a message.
                  </p>

                </div>

                <label className="mb-2 mt-6 block text-sm font-bold text-slate-700">
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
                  className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-4 font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />

                <div className="mt-6 flex justify-end gap-4">

                  <button
                    type="button"
                    onClick={() =>
                      setMessageCustomer(
                        null
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      sendingMessage
                    }
                    onClick={
                      handleMessageSend
                    }
                    className="rounded-xl bg-blue-700 px-8 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95 disabled:opacity-60"
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
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
            onClick={() =>
              setShowAllCustomersMessage(
                false
              )
            }
          >

            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-7 text-white">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-3xl font-black">
                      Message All Customers
                    </h2>

                    <p className="mt-1 text-blue-100">
                      Broadcast communication
                    </p>

                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-2xl">
                    👥
                  </div>

                </div>

              </div>

              <div className="p-8">

                <div className="mb-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-5">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                      Recipients
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {
                        customers.length
                      }{" "}
                      Customers
                    </p>

                  </div>

                  <span className="text-3xl">
                    👥
                  </span>

                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                  <p className="text-sm font-semibold leading-6 text-amber-800">
                    Customer messaging will be
                    connected when the customer
                    portal messaging backend is
                    built. This form does not
                    currently claim to deliver or
                    save a broadcast.
                  </p>

                </div>

                <label className="mb-2 mt-6 block text-sm font-bold text-slate-700">
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
                  className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-4 font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />

                <div className="mt-6 flex justify-end gap-4">

                  <button
                    type="button"
                    onClick={() => {
                      setMessageText(
                        ""
                      );

                      setShowAllCustomersMessage(
                        false
                      );
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      sendingMessage
                    }
                    onClick={
                      handleMessageSend
                    }
                    className="rounded-xl bg-blue-700 px-8 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-800 active:scale-95 disabled:opacity-60"
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
            DELETE CUSTOMER MODAL
        ====================================================== */}

        {deletingCustomer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">

            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

              <div className="bg-gradient-to-r from-red-700 to-rose-900 px-8 py-7">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                    🗑️
                  </div>

                  <div>

                    <h2 className="text-2xl font-black text-white">
                      Delete Customer
                    </h2>

                    <p className="mt-1 text-red-100">
                      This action cannot be undone.
                    </p>

                  </div>

                </div>

              </div>

              <div className="p-8">

                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                  <p className="text-sm font-semibold text-red-700">
                    You are about to permanently
                    delete:
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {
                      deletingCustomer.full_name
                    }
                  </p>

                  <p className="mt-1 text-slate-600">
                    Customer ID:{" "}
                    <span className="font-bold">
                      {
                        deletingCustomer.customer_code ||
                        "—"
                      }
                    </span>
                  </p>

                  <p className="mt-1 text-slate-600">
                    Phone:{" "}
                    <span className="font-bold">
                      {
                        deletingCustomer.phone ||
                        "No phone number"
                      }
                    </span>
                  </p>

                </div>

                <p className="mt-6 text-sm leading-6 text-slate-600">
                  Deleting this customer will
                  remove the customer record from
                  the Customer Directory.
                </p>

              </div>

              <div className="flex justify-end gap-4 border-t border-slate-200 bg-slate-50 px-8 py-6">

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setDeletingCustomer(
                      null
                    )
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={
                    deleteCustomer
                  }
                  className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 px-7 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:from-red-700 hover:to-rose-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting
                    ? "Deleting..."
                    : "Yes, Delete Customer"}
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}