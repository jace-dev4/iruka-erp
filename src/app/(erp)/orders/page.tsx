
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

type ToastType = "success" | "error" | "info";

interface ToastState {
  show: boolean;
  type: ToastType;
  title: string;
  message: string;
}

export default function OrdersPage() {
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const [savingOrder, setSavingOrder] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: "info",
    title: "",
    message: "",
  });

  const [orderItems, setOrderItems] = useState([
    {
      bread_type: "",
      quantity: "",
    },
  ]);

  // ============================================================
  // PREMIUM TOAST
  // ============================================================

  function showToast(
    type: ToastType,
    title: string,
    message: string
  ) {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    window.setTimeout(() => {
      setToast((current) => ({
        ...current,
        show: false,
      }));
    }, 4500);
  }

  function hideToast() {
    setToast((current) => ({
      ...current,
      show: false,
    }));
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  // ============================================================
  // SUPABASE REALTIME
  // ============================================================

  useEffect(() => {
    const ordersChannel = supabase
      .channel("orders-page-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async () => {
          await fetchOrders();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel("orders-page-products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        async () => {
          await fetchProducts();
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel("orders-page-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async () => {
          await fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  // ============================================================
  // PRODUCTS
  // ============================================================

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("Products error:", error);
      return;
    }

    setProducts(data || []);
  }

  // ============================================================
  // ORDERS
  // ============================================================

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .range(0, 9);

    if (error) {
      console.error("Orders error:", error);
      return;
    }

    setOrders(data || []);
  }

  // ============================================================
  // REFRESH
  // ============================================================

  async function refreshPage() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await Promise.all([
        fetchProducts(),
        fetchOrders(),
      ]);

      showToast(
        "success",
        "Page Refreshed",
        "Orders and product information are now up to date."
      );
    } catch (error) {
      console.error("Refresh error:", error);

      showToast(
        "error",
        "Refresh Failed",
        "Could not refresh the page data."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // ============================================================
  // ORDER ITEMS
  // ============================================================

  function addOrderRow() {
    setOrderItems([
      ...orderItems,
      {
        bread_type: "",
        quantity: "",
      },
    ]);
  }

  function removeOrderRow(index: number) {
    const updated = [...orderItems];

    updated.splice(index, 1);

    if (updated.length === 0) {
      setOrderItems([
        {
          bread_type: "",
          quantity: "",
        },
      ]);
    } else {
      setOrderItems(updated);
    }
  }

  function updateItem(
    index: number,
    field: string,
    value: string
  ) {
    const updated = [...orderItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setOrderItems(updated);
  }

  // ============================================================
  // PRODUCT HELPERS
  // ============================================================

  function getProductDetails(breadName: string) {
    return products.find(
      (product) => product.name === breadName
    );
  }

  function getBreadPrice(breadName: string) {
    const product = getProductDetails(breadName);

    return product
      ? Number(product.price || 0)
      : 0;
  }

  function calculateOrderTotal() {
    return orderItems.reduce(
      (sum, item) => {
        return (
          sum +
          getBreadPrice(item.bread_type) *
            Number(item.quantity || 0)
        );
      },
      0
    );
  }

  const totalAmount = calculateOrderTotal();

  // ============================================================
  // NORMALIZE PHONE
  // ============================================================

  function normalizePhone(value: string) {
    return String(value || "")
      .replace(/\s+/g, "")
      .trim();
  }

  // ============================================================
  // FIND OR CREATE BAKERY CUSTOMER
  // ============================================================

  async function findOrCreateBakeryCustomer() {
    const cleanName = customerName.trim();
    const cleanPhone = normalizePhone(phone);

    if (!cleanName) {
      throw new Error("Customer name is required.");
    }

    if (!cleanPhone) {
      throw new Error(
        "Customer phone number is required so the customer can be registered."
      );
    }

    const {
      data: existingCustomer,
      error: lookupError,
    } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Customer lookup error:",
        lookupError
      );

      throw new Error(
        `Could not check customer record: ${lookupError.message}`
      );
    }

    if (existingCustomer) {
      const customerUpdates: any = {};

      if (
        existingCustomer.full_name !==
        cleanName
      ) {
        customerUpdates.full_name =
          cleanName;
      }

      if (!existingCustomer.customer_type) {
        customerUpdates.customer_type =
          "Bakery Customer";
      }

      if (!existingCustomer.status) {
        customerUpdates.status = "Active";
      }

      if (
        Object.keys(customerUpdates).length > 0
      ) {
        const { error: updateError } =
          await supabase
            .from("customers")
            .update(customerUpdates)
            .eq(
              "id",
              existingCustomer.id
            );

        if (updateError) {
          throw new Error(
            `Could not update customer: ${updateError.message}`
          );
        }
      }

      return existingCustomer.id;
    }

    const {
      data: newCustomer,
      error: createError,
    } = await supabase
      .from("customers")
      .insert({
        full_name: cleanName,
        phone: cleanPhone,
        password: null,
        is_verified: false,
        customer_type: "Bakery Customer",
        status: "Active",
      })
      .select()
      .single();

    if (createError || !newCustomer) {
      console.error(
        "Customer creation error:",
        createError
      );

      throw new Error(
        `Could not register customer: ${
          createError?.message ||
          "Unknown error"
        }`
      );
    }

    return newCustomer.id;
  }

  // ============================================================
  // SAVE ORDER
  // ============================================================

  async function saveOrder() {
    if (savingOrder) return;

setSavingOrder(true);
    if (!customerName.trim()) {
      showToast(
        "error",
        "Customer Required",
        "Please enter the customer name."
      );
      return;
    }

    if (!phone.trim()) {
      showToast(
        "error",
        "Phone Number Required",
        "Enter the customer's phone number so the permanent bakery customer record can be maintained."
      );
      return;
    }

    const validItems = orderItems.filter(
      (item) =>
        item.bread_type &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      showToast(
        "error",
        "Order Items Required",
        "Add at least one bread item with a valid quantity."
      );
      return;
    }

    if (savingOrder) return;

setSavingOrder(true);

    // ----------------------------------------------------------
    // VALIDATE STOCK
    // ----------------------------------------------------------

    for (const item of validItems) {
      const product = getProductDetails(
        item.bread_type
      );

      if (!product) {
        showToast(
          "error",
          "Product Not Found",
          `Product not found: ${item.bread_type}`
        );
        return;
      }

      if (
        Number(product.stock || 0) <
        Number(item.quantity)
      ) {
        showToast(
          "error",
          "Insufficient Stock",
          `${item.bread_type} has only ${Number(
            product.stock || 0
          ).toLocaleString()} available. You requested ${Number(
            item.quantity
          ).toLocaleString()}.`
        );
        return;
      }
    }

    try {
      const customerId =
        await findOrCreateBakeryCustomer();

      const orderNumber =
        `ORD-${Date.now()}`;

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,

          customer_name:
            customerName.trim(),

          customer:
            customerName.trim(),

          phone:
            normalizePhone(phone),

          order_number:
            orderNumber,

          payment_status:
            "Pending",

          order_status:
            "Pending",

          delivery_date:
            deliveryDate || null,

          notes:
            notes.trim() || null,

          total_amount:
            totalAmount,

          amount_paid: 0,

          balance:
            totalAmount,

          paid: 0,

          status:
            "Pending",

          order_source:
            "ERP",
        })
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(
          orderError?.message ||
            "Could not create order."
        );
      }

      const itemsToInsert =
        validItems.map((item) => ({
          order_id:
            orderData.id,

          bread_type:
            item.bread_type,

          quantity:
            Number(item.quantity),

          unit_price:
            getBreadPrice(
              item.bread_type
            ),

          total_amount:
            getBreadPrice(
              item.bread_type
            ) *
            Number(item.quantity),
        }));

      const {
        error: itemsError,
      } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        await supabase
          .from("orders")
          .delete()
          .eq("id", orderData.id);

        throw new Error(
          `Could not create order items: ${itemsError.message}`
        );
      }

      setCustomerName("");
      setPhone("");
      setDeliveryDate("");
      setNotes("");

      setOrderItems([
        {
          bread_type: "",
          quantity: "",
        },
      ]);

      await fetchOrders();

      showToast(
        "success",
        "Order Created Successfully",
        `Customer order ${orderNumber} has been created for ${customerName}. Total: ₦${totalAmount.toLocaleString()}.`
      );
    } catch (error: any) {
      console.error(
        "Save order error:",
        error
      );

      showToast(
        "error",
        "Order Creation Failed",
        error?.message ||
          "Something went wrong while creating the order."
      );
    } finally {
      setSavingOrder(false);
    }
  }

  // ============================================================
  // FIND CUSTOMER DEBTOR
  // ============================================================

  async function findCustomerDebtor(
    order: any
  ) {
    let existingDebtor = null;

    // CUSTOMER ID IS THE PRIMARY MATCH
    if (order.customer_id) {
      const {
        data: debtorByCustomerId,
        error: customerIdError,
      } = await supabase
        .from("debtors")
        .select("*")
        .eq(
          "customer_id",
          order.customer_id
        )
        .maybeSingle();

if (!customerIdError && debtorByCustomerId) {
  existingDebtor =
    debtorByCustomerId;
}
    }

    // PHONE IS FALLBACK FOR OLD RECORDS
    if (
      !existingDebtor &&
      order.phone
    ) {
      const {
        data: debtorByPhone,
        error: phoneError,
      } = await supabase
        .from("debtors")
        .select("*")
        .eq(
          "phone",
          normalizePhone(order.phone)
        )
        .maybeSingle();

      if (phoneError) {
        console.error(
          "Debtor phone lookup error:",
          phoneError
        );
      }

      existingDebtor =
        debtorByPhone;
    }

    return existingDebtor;
  }

  // ============================================================
  // RECALCULATE CUSTOMER OUTSTANDING DEBT
  //
  // IMPORTANT:
  // A CUSTOMER MAY HAVE MORE THAN ONE UNPAID ORDER.
  // THE DEBTOR BALANCE MUST REPRESENT ALL OUTSTANDING ORDERS.
  // ============================================================

  async function recalculateCustomerDebt(
    order: any
  ) {
if (!order.customer_id && !order.phone) {
  return 0;
}

let query = supabase
  .from("orders")
  .select(
    "id, total_amount, amount_paid, payment_status, customer_id, phone, customer_name"
  )
  .in(
    "payment_status",
    [
      "Pending",
      "Partially Paid",
    ]
  );

if (order.customer_id) {
  query = query.eq(
    "customer_id",
    order.customer_id
  );
} else if (order.phone) {
  query = query.eq(
    "phone",
    normalizePhone(order.phone)
  );
}

const {
  data: outstandingOrders,
  error,
} = await query;

    if (error) {
      throw new Error(
        `Could not calculate customer debt: ${error.message}`
      );
    }

    let totalDebt = 0;

    for (
      const outstandingOrder of
        outstandingOrders || []
    ) {
      const total =
        Number(
          outstandingOrder.total_amount ||
            0
        );

      const paid =
        Number(
          outstandingOrder.amount_paid ||
            0
        );

      totalDebt += Math.max(
        total - paid,
        0
      );
    }

    return totalDebt;
  }

  // ============================================================
  // UPDATE DEBTOR RECORD
  // ============================================================

  async function syncDebtorForOrder(
    order: any
  ) {
    const totalDebt =
      await recalculateCustomerDebt(
        order
      );

    const existingDebtor =
      await findCustomerDebtor(order);

    // ----------------------------------------------------------
    // CUSTOMER STILL OWES MONEY
    // ----------------------------------------------------------

    if (totalDebt > 0) {
      const debtorPayload: any = {
        customer_name:
          order.customer_name ||
          "Customer",

        phone:
          normalizePhone(
            order.phone || ""
          ),

        balance:
          totalDebt,

        status:
          "Owing",
      };

      if (order.customer_id) {
        debtorPayload.customer_id =
          order.customer_id;
      }

      if (existingDebtor) {
        const {
          error: updateError,
        } = await supabase
          .from("debtors")
          .update(
            debtorPayload
          )
          .eq(
            "id",
            existingDebtor.id
          );

        if (updateError) {
          throw new Error(
            `Could not update debtor: ${updateError.message}`
          );
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("debtors")
          .insert({
            ...debtorPayload,

            location: "",

            credit_limit: 0,
          });

        if (insertError) {
          throw new Error(
            `Could not create debtor: ${insertError.message}`
          );
        }
      }

      return totalDebt;
    }

    // ----------------------------------------------------------
    // NO OUTSTANDING DEBT
    // ----------------------------------------------------------

    if (existingDebtor) {
      const {
        error: deleteError,
      } = await supabase
        .from("debtors")
        .delete()
        .eq(
          "id",
          existingDebtor.id
        );

      if (deleteError) {
        throw new Error(
          `Could not clear debtor record: ${deleteError.message}`
        );
      }
    }

    return 0;
  }

  // ============================================================
  // UPDATE PAYMENT
  // ============================================================

  async function updateOrderPayment(
    order: any,
    newStatus: string
  ) {
    const totalAmount = Number(
      order.total_amount || 0
    );

    let amountPaid = Number(
      order.amount_paid || 0
    );

    // ----------------------------------------------------------
    // PARTIAL PAYMENT
    // ----------------------------------------------------------

    if (
      newStatus === "Partially Paid"
    ) {
      const input = prompt(
        `Enter amount paid by ${order.customer_name}:`
      );

      if (input === null) {
        return;
      }

      amountPaid = Number(input);

      if (
        isNaN(amountPaid) ||
        amountPaid <= 0
      ) {
        showToast(
          "error",
          "Invalid Payment",
          "Enter a valid payment amount."
        );
        return;
      }

      if (
        amountPaid >= totalAmount
      ) {
        showToast(
          "error",
          "Payment Amount Invalid",
          "Payment cannot be equal to or greater than the order total. Select Paid instead."
        );
        return;
      }
    }

    // ----------------------------------------------------------
    // FULL PAYMENT
    // ----------------------------------------------------------

    if (newStatus === "Paid") {
      amountPaid = totalAmount;
    }

    // ----------------------------------------------------------
    // PENDING
    // ----------------------------------------------------------

    if (
      newStatus === "Pending"
    ) {
      amountPaid = 0;
    }

    // ----------------------------------------------------------
    // REFUNDED
    // ----------------------------------------------------------

    if (
      newStatus === "Refunded"
    ) {
      amountPaid = 0;
    }

    const balance = Math.max(
      totalAmount - amountPaid,
      0
    );

    // ----------------------------------------------------------
    // UPDATE ORDER FIRST
    // ----------------------------------------------------------

    const {
      error: orderError,
    } = await supabase
      .from("orders")
      .update({
        payment_status:
          newStatus,

        amount_paid:
          amountPaid,

        balance:
          balance,

        paid:
          amountPaid,
      })
      .eq(
        "id",
        order.id
      );

    if (orderError) {
      showToast(
        "error",
        "Payment Update Failed",
        orderError.message
      );
      return;
    }

    // ----------------------------------------------------------
    // RESTORE DEBTOR ACCOUNTING LOGIC
    //
    // EVERY PARTIALLY PAID/PENDING CUSTOMER ORDER IS INCLUDED.
    // ----------------------------------------------------------

    try {
      /*
       * Pending and Partially Paid orders represent money
       * still owed by the customer.
       *
       * Paid orders are removed from outstanding debt.
       *
       * The debtor balance is recalculated from ALL outstanding
       * orders belonging to that customer.
       */

      if (
        newStatus ===
          "Partially Paid" ||
        newStatus === "Pending" ||
        newStatus === "Paid"
      ) {
        const totalDebt =
          await syncDebtorForOrder(
            order
          );

        await fetchOrders();

        if (
          newStatus ===
          "Partially Paid"
        ) {
          showToast(
            "success",
            "Payment Recorded",
            `₦${amountPaid.toLocaleString()} received. Customer outstanding debt is now ₦${totalDebt.toLocaleString()}.`
          );
        } else if (
          newStatus === "Paid"
        ) {
          showToast(
            "success",
            "Payment Completed",
            `Full payment of ₦${amountPaid.toLocaleString()} recorded successfully.`
          );
        } else {
          showToast(
            "success",
            "Payment Status Updated",
            "The order has been returned to Pending and the outstanding balance has been recalculated."
          );
        }

        return;
      }

      await fetchOrders();

      showToast(
        "success",
        "Payment Updated",
        `Payment status changed to ${newStatus}.`
      );
    } catch (debtorError: any) {
      console.error(
        "Debtor synchronization error:",
        debtorError
      );

      await fetchOrders();

      showToast(
        "error",
        "Debtor Update Failed",
        debtorError?.message ||
          "Payment was updated, but the debtor record could not be synchronized."
      );
    }
  }

// ============================================================
// COMPLETE CUSTOMER ORDER
// ============================================================

async function completeCustomerOrder(
  order: any
) {
  if (
    order.order_status === "Completed" ||
    order.status === "Completed"
  ) {
    showToast(
      "info",
      "Already Completed",
      "This order has already been completed."
    );
    return;
  }

  try {
    // ==========================================================
    // 1. GET ALL ORDER ITEMS
    // ==========================================================

    const {
      data: items,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsError) {
      throw new Error(
        `Could not load order items: ${itemsError.message}`
      );
    }

    if (!items || items.length === 0) {
      throw new Error(
        "This order has no products to complete."
      );
    }

    // ==========================================================
    // 2. LOAD AND VALIDATE ALL PRODUCTS FIRST
    //
    // IMPORTANT:
    // We do NOT change stock yet.
    // We validate the entire order before making any changes.
    // ==========================================================

    const preparedItems: any[] = [];

    for (const item of items) {
      const quantity = Number(item.quantity || 0);

      if (quantity <= 0) {
        throw new Error(
          `Invalid quantity for ${item.bread_type}.`
        );
      }

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("name", item.bread_type)
        .single();

      if (productError || !product) {
        throw new Error(
          `Product not found: ${item.bread_type}`
        );
      }

      const currentStock = Number(
        product.stock || 0
      );

      if (currentStock < quantity) {
        throw new Error(
          `${item.bread_type} does not have enough stock. Available: ${currentStock.toLocaleString()}, requested: ${quantity.toLocaleString()}.`
        );
      }

      const unitPrice = Number(
        product.price || item.unit_price || 0
      );

      const lineTotal =
        unitPrice * quantity;

      preparedItems.push({
        item,
        product,
        quantity,
        currentStock,
        unitPrice,
        lineTotal,
      });
    }

    // ==========================================================
    // 3. CALCULATE TOTALS
    // ==========================================================

    const calculatedSalesTotal =
      preparedItems.reduce(
        (sum, line) =>
          sum + line.lineTotal,
        0
      );

    const orderTotal = Number(
      order.total_amount || calculatedSalesTotal
    );

    const amountPaid = Math.max(
      Number(order.amount_paid || 0),
      0
    );

    const orderBalance = Math.max(
      orderTotal - amountPaid,
      0
    );

    // ==========================================================
    // 4. PREPARE PAYMENT ALLOCATION
    //
    // If an order contains multiple products, we distribute the
    // amount paid across the product sales proportionally.
    //
    // Example:
    //
    // Order total = ₦100,000
    // Paid        = ₦100,000
    //
    // Product A = ₦60,000 → payment ₦60,000
    // Product B = ₦40,000 → payment ₦40,000
    //
    // This prevents the old bug where ₦100,000 was recorded
    // against every product line.
    // ==========================================================

    let remainingPayment = amountPaid;

    // ==========================================================
    // 5. CREATE SALES RECORDS
    //
    // IMPORTANT:
    // - NO customer_id because sales table does not have it.
    // - Every product gets a unique invoice_number because
    //   sales.invoice_number has a UNIQUE constraint.
    // ==========================================================

    const salesRows = preparedItems.map(
      (line, index) => {
        let linePayment = 0;

        if (calculatedSalesTotal > 0) {
          if (
            index ===
            preparedItems.length - 1
          ) {
            // Put any rounding remainder on the last item.
            linePayment = Math.min(
              remainingPayment,
              Math.max(
                calculatedSalesTotal -
                  preparedItems
                    .slice(0, -1)
                    .reduce(
                      (sum, previous) =>
                        sum +
                        previous.lineTotal,
                      0
                    ),
                0
              )
            );

            // Better proportional allocation for
            // the final remaining payment.
            linePayment = Math.min(
              remainingPayment,
              line.lineTotal
            );
          } else {
            linePayment = Math.min(
              remainingPayment,
              amountPaid *
                (line.lineTotal /
                  calculatedSalesTotal)
            );
          }
        }

        linePayment =
          Math.round(
            linePayment * 100
          ) / 100;

        remainingPayment =
          Math.max(
            remainingPayment -
              linePayment,
            0
          );

        const lineBalance = Math.max(
          line.lineTotal - linePayment,
          0
        );

        return {
          customer_name:
            order.customer_name ||
            "Walk-in Customer",

          total_amount:
            line.lineTotal,

          payment:
            linePayment,

          balance:
            lineBalance,

          // invoice_number is UNIQUE in your database,
          // so every product line needs its own value.
          invoice_number:
            `${order.order_number || `ORD-${order.id}`}-${index + 1}`,

          product_id:
            line.product.id,

          product_name:
            line.product.name,

          quantity:
            line.quantity,

          unit_price:
            line.unitPrice,

          cashier:
            typeof window !==
            "undefined"
              ? localStorage.getItem(
                  "full_name"
                ) || "System"
              : "System",

          payment_method:
            order.payment_status ===
            "Paid"
              ? "Cash"
              : "Pending",

          payment_status:
            order.payment_status ===
            "Paid"
              ? "Paid"
              : "Unpaid",

          amount_paid:
            linePayment,
        };
      }
    );

    const {
      error: salesError,
    } = await supabase
      .from("sales")
      .insert(salesRows);

    if (salesError) {
      throw new Error(
        `Sales creation failed: ${salesError.message}`
      );
    }

    // ==========================================================
    // 6. CREATE FINANCE TRANSACTIONS
    //
    // One finance transaction per product line.
    // The total of all transactions equals the order total.
    // ==========================================================

const financeRows =
  preparedItems.map(
    (line) => ({
      transaction_type:
        "Sale",

      category:
        "Sales Revenue",

      reference:
        order.order_number ||
        `ORD-${order.id}`,

      customer_name:
        order.customer_name ||
        "Walk-in Customer",

      description:
        `${line.product.name} sold to ${
          order.customer_name ||
          "Walk-in Customer"
        }`,

      amount:
        line.lineTotal,

      payment_method:
        order.payment_status ===
        "Paid"
          ? "Cash"
          : "Pending",

      payment_status:
        order.payment_status ===
        "Paid"
          ? "Completed"
          : "Pending",

      created_by:
        typeof window !==
        "undefined"
          ? localStorage.getItem(
              "full_name"
            ) || "System"
          : "System",
    })
  );

    const {
      error: financeError,
    } = await supabase
      .from("finance_transactions")
      .insert(financeRows);

    if (financeError) {
      // --------------------------------------------------------
      // ROLLBACK SALES IF FINANCE FAILS
      // --------------------------------------------------------
      //
      // We don't want Sales to exist without Finance.
      // --------------------------------------------------------

      const invoiceNumbers =
        salesRows.map(
          (sale) =>
            sale.invoice_number
        );

      const {
        error: rollbackSalesError,
      } = await supabase
        .from("sales")
        .delete()
        .in(
          "invoice_number",
          invoiceNumbers
        );

      if (rollbackSalesError) {
        console.error(
          "Sales rollback failed:",
          rollbackSalesError
        );
      }

      throw new Error(
        `Finance transaction failed: ${financeError.message}`
      );
    }

    // ==========================================================
    // 7. UPDATE PRODUCT STOCK
    //
    // Stock is only changed AFTER Sales + Finance succeed.
    // ==========================================================

    const updatedProducts: any[] = [];

    for (const line of preparedItems) {
      const newStock =
        line.currentStock -
        line.quantity;

      const {
        error: stockError,
      } = await supabase
        .from("products")
        .update({
          stock: newStock,
        })
        .eq(
          "id",
          line.product.id
        );

      if (stockError) {
        console.error(
          "Stock update failed:",
          stockError
        );

        // Attempt to restore stock for products
        // already updated in this operation.
        for (const updated of updatedProducts) {
          await supabase
            .from("products")
            .update({
              stock:
                updated.previousStock,
            })
            .eq(
              "id",
              updated.productId
            );
        }

        // Remove the finance records created for
        // this order.
        await supabase
          .from(
            "finance_transactions"
          )
          .delete()
          .eq(
            "reference",
            order.order_number ||
              `ORD-${order.id}`
          );

        // Remove the sales records created for
        // this order.
        await supabase
          .from("sales")
          .delete()
          .in(
            "invoice_number",
            salesRows.map(
              (sale) =>
                sale.invoice_number
            )
          );

        throw new Error(
          `Stock update failed for ${line.product.name}: ${stockError.message}`
        );
      }

      updatedProducts.push({
        productId:
          line.product.id,

        previousStock:
          line.currentStock,
      });
    }

    // ==========================================================
    // 8. MARK ORDER COMPLETED
    // ==========================================================

    const {
      error: completeError,
    } = await supabase
      .from("orders")
      .update({
        order_status:
          "Completed",

        status:
          "Completed",

        balance:
          orderBalance,
      })
      .eq(
        "id",
        order.id
      );

    if (completeError) {
      // --------------------------------------------------------
      // ROLLBACK STOCK
      // --------------------------------------------------------

      for (const updated of updatedProducts) {
        await supabase
          .from("products")
          .update({
            stock:
              updated.previousStock,
          })
          .eq(
            "id",
            updated.productId
          );
      }

      // --------------------------------------------------------
      // ROLLBACK FINANCE
      // --------------------------------------------------------

      await supabase
        .from(
          "finance_transactions"
        )
        .delete()
        .eq(
          "reference",
          order.order_number ||
            `ORD-${order.id}`
        );

      // --------------------------------------------------------
      // ROLLBACK SALES
      // --------------------------------------------------------

      await supabase
        .from("sales")
        .delete()
        .in(
          "invoice_number",
          salesRows.map(
            (sale) =>
              sale.invoice_number
          )
        );

      throw new Error(
        `Could not complete order: ${completeError.message}`
      );
    }

    // ==========================================================
    // 9. REFRESH ORDERS
    // ==========================================================

    await fetchOrders();

    // ==========================================================
    // 10. SUCCESS
    // ==========================================================

    showToast(
      "success",
      "Order Completed",
      `Order ${
        order.order_number ||
        order.id
      } has been completed successfully.`
    );
  } catch (error: any) {
    console.error(
      "Complete order error:",
      error
    );

    showToast(
      "error",
      "Order Completion Failed",
      error?.message ||
        "Something went wrong while completing this order."
    );
  }
}


  // ============================================================
  // DELETE ORDER
  // ============================================================

  async function deleteOrder(
    order: any
  ) {
    const confirmed =
      confirm(
        "Delete this order?\n\nThe order will be removed and the customer's outstanding debt will be recalculated."
      );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("orders")
      .delete()
      .eq(
        "id",
        order.id
      );

    if (deleteError) {
      showToast(
        "error",
        "Delete Failed",
        deleteError.message
      );
      return;
    }

    // ----------------------------------------------------------
    // RECALCULATE REMAINING DEBT
    // ----------------------------------------------------------

    try {
      if (order.customer_id) {
        await syncDebtorForOrder(
          order
        );
      }
    } catch (error) {
      console.error(
        "Debt recalculation after deletion failed:",
        error
      );
    }

    await fetchOrders();

    showToast(
      "success",
      "Order Deleted",
      "The order was deleted and the customer's outstanding debt was recalculated."
    );
  }

  // ============================================================
  // RETURN UI
  // ============================================================

  return (
    <ProtectedRoute
      allowedRoles={[
        "admin",
        "cashier",
      ]}
    >
      <div className="min-h-screen bg-slate-950 p-10">

        {/* ======================================================
            PREMIUM TOAST NOTIFICATION
        ====================================================== */}

        {toast.show && (
          <div className="fixed top-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-32px)]">
            <div
              className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
                toast.type === "success"
                  ? "border-emerald-500/30 bg-slate-900/95"
                  : toast.type === "error"
                  ? "border-red-500/30 bg-slate-900/95"
                  : "border-blue-500/30 bg-slate-900/95"
              }`}
            >

              <div
                className={`h-1 w-full ${
                  toast.type === "success"
                    ? "bg-gradient-to-r from-emerald-400 to-green-500"
                    : toast.type === "error"
                    ? "bg-gradient-to-r from-red-500 to-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-cyan-400"
                }`}
              />

              <div className="p-5">

                <div className="flex items-start gap-4">

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                      toast.type === "success"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : toast.type === "error"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {toast.type ===
                    "success"
                      ? "✓"
                      : toast.type ===
                        "error"
                      ? "!"
                      : "i"}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <h3 className="font-bold text-white">
                        {toast.title}
                      </h3>

                      <button
                        onClick={hideToast}
                        className="text-slate-500 hover:text-white transition text-lg leading-none"
                      >
                        ×
                      </button>

                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {toast.message}
                    </p>

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-10 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">

          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-10">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-6">

                <div className="w-24 h-24 rounded-3xl bg-slate-900/10 backdrop-blur flex items-center justify-center border border-white/20">

                  <Image
                    src="/logo/nkiruka-logo.png"
                    alt="NKIRUKA Logo"
                    width={65}
                    height={65}
                  />

                </div>

                <div>

                  <span className="inline-flex items-center rounded-full bg-amber-500/20 text-amber-300 px-4 py-1 text-sm font-bold mb-4">
                    🛒 CUSTOMER ORDERS
                  </span>

                  <h1 className="text-5xl font-black text-white">
                    Customer Orders
                  </h1>

                  <p className="text-slate-300 mt-3 text-lg">
                    Manage customer bookings, monitor order progress and track payments.
                  </p>

                </div>

              </div>

              <div className="mt-8 lg:mt-0 text-right">

                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl px-6 py-5">

                  <p className="text-slate-400 text-sm">
                    Today
                  </p>

                  <p className="text-white font-bold text-xl">
                    {new Date().toLocaleDateString(
                      "en-GB",
                      {
                        weekday:
                          "long",
                        day: "numeric",
                        month:
                          "long",
                        year: "numeric",
                      }
                    )}
                  </p>

                  <p className="text-amber-300 mt-2 text-lg font-bold">
                    {new Date().toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* KPI CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-slate-400">
                    Total Orders
                  </p>
                  <h2 className="text-5xl font-black text-white mt-3">
                    {orders.length}
                  </h2>
                </div>
                <div className="text-5xl">
                  📋
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-yellow-400" />
            <div className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-slate-400">
                    Pending
                  </p>
                  <h2 className="text-5xl font-black text-orange-400 mt-3">
                    {
                      orders.filter(
                        (o) =>
                          o.order_status ===
                          "Pending"
                      ).length
                    }
                  </h2>
                </div>
                <div className="text-5xl">
                  ⏳
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-green-400" />
            <div className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-slate-400">
                    Ready
                  </p>
                  <h2 className="text-5xl font-black text-emerald-400 mt-3">
                    {
                      orders.filter(
                        (o) =>
                          o.order_status ===
                          "Ready"
                      ).length
                    }
                  </h2>
                </div>
                <div className="text-5xl">
                  📦
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-slate-400">
                    Completed
                  </p>
                  <h2 className="text-5xl font-black text-purple-400 mt-3">
                    {
                      orders.filter(
                        (o) =>
                          o.order_status ===
                          "Completed"
                      ).length
                    }
                  </h2>
                </div>
                <div className="text-5xl">
                  ✅
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ORDER FORM */}

        <div className="mb-10 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">

          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-8 py-6 border-b border-slate-700">

            <span className="inline-flex items-center rounded-full bg-blue-500/20 text-blue-300 px-4 py-1 text-sm font-bold mb-3">
              📝 ORDER ENTRY
            </span>

            <h2 className="text-3xl font-black text-white">
              Create Customer Order
            </h2>

            <p className="text-slate-300 mt-2">
              Record customer orders and automatically maintain their bakery customer profile.
            </p>

          </div>

          <div className="bg-slate-900 p-8">

            {/* CUSTOMER */}

            <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-700">

              <div>

                <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-sm font-bold mb-3">
                  👤 CUSTOMER DETAILS
                </div>

                <h2 className="text-2xl font-black text-white">
                  Customer Information
                </h2>

                <p className="text-slate-400 mt-2">
                  Every customer who places an order is automatically registered as a Bakery Customer.
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <input
                type="date"
                value={deliveryDate}
                onChange={(e) =>
                  setDeliveryDate(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <input
                type="text"
                placeholder="Notes"
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

            </div>

            {/* BREAD ITEMS */}

            <div className="space-y-4">

              {orderItems.map(
                (item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                  >

                    <select
                      value={
                        item.bread_type
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "bread_type",
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >

                      <option value="">
                        Select Bread
                      </option>

                      {products.map(
                        (product) => (
                          <option
                            key={
                              product.id
                            }
                            value={
                              product.name
                            }
                          >
                            {
                              product.name
                            }
                          </option>
                        )
                      )}

                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={
                        item.quantity
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="w-full rounded-2xl border border-slate-700 bg-slate-800 text-white px-5 py-4">

                      {item.bread_type && (
                        <div className="flex items-center gap-3">

                          <img
                            src={
                              getProductDetails(
                                item.bread_type
                              )?.image_url
                            }
                            alt={
                              item.bread_type
                            }
                            className="w-20 h-20 rounded-2xl object-contain bg-slate-900 p-2"
                          />

                          <div>

                            <p className="font-bold text-white">
                              {
                                item.bread_type
                              }
                            </p>

                            <p className="text-sm text-slate-400">
                              ₦
                              {getBreadPrice(
                                item.bread_type
                              ).toLocaleString()}
                            </p>

                            <p className="text-xs text-emerald-400 font-semibold">
                              Stock:{" "}
                              {Number(
                                getProductDetails(
                                  item.bread_type
                                )?.stock ||
                                  0
                              ).toLocaleString()}
                            </p>

                          </div>

                        </div>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeOrderRow(
                          index
                        )
                      }
                      className="rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all duration-300 hover:scale-105"
                    >
                      Remove
                    </button>

                  </div>
                )
              )}

            </div>

            <button
              type="button"
              onClick={
                addOrderRow
              }
              className="mt-6 bg-blue-950 hover:bg-blue-900 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg transition"
            >
              + Add Bread
            </button>

            {/* TOTAL */}

            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-8 rounded-3xl shadow-sm">

              <h2 className="text-lg font-semibold text-gray-600">
                Order Total
              </h2>

              <p className="text-6xl font-black text-green-700 mt-2">
                ₦
                {totalAmount.toLocaleString()}
              </p>

            </div>

<button
  type="button"
  onClick={saveOrder}
  disabled={savingOrder}
  className={`mt-8 w-full rounded-2xl p-5 font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-3 ${
    savingOrder
      ? "bg-green-900 cursor-not-allowed opacity-90"
      : "bg-gradient-to-r from-green-700 via-emerald-600 to-green-700 hover:from-green-600 hover:via-emerald-500 hover:to-green-600 hover:scale-[1.01] hover:shadow-2xl"
  }`}
>
  {savingOrder ? (
    <>
      <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      <span>Creating Customer Order...</span>
    </>
  ) : (
    <>
      <span className="text-xl">✓</span>
      <span>Save Customer Order</span>
    </>
  )}
</button>

          </div>

        </div>

        {/* ORDER HISTORY */}

        <div className="bg-slate-900 rounded-3xl shadow p-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

            <h2 className="text-3xl font-black text-white">
              Customer Order History
            </h2>

            <button
              onClick={refreshPage}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-950 hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 font-bold transition-all"
            >
              <span
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-slate-700 bg-slate-800">

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Order No
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Customer
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Phone
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Amount
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Payment
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Status
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Delivery
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Details
                  </th>

                  <th className="p-4 text-left text-slate-300 text-xs uppercase">
                    Delete
                  </th>

                </tr>

              </thead>

              <tbody>

                {orders.map(
                  (order) => (
                    <tr
                      key={
                        order.id
                      }
                      className="border-b border-slate-800 hover:bg-slate-800/60"
                    >

                      <td className="p-4 text-slate-200">
                        {
                          order.order_number
                        }
                      </td>

                      <td className="p-4 text-slate-200 font-semibold">
                        {
                          order.customer_name
                        }
                      </td>

                      <td className="p-4 text-slate-200">
                        {order.phone}
                      </td>

                      <td className="p-4 font-bold text-green-400">
                        ₦
                        {Number(
                          order.total_amount ||
                            0
                        ).toLocaleString()}
                      </td>

                      {/* PAYMENT */}

                      <td className="p-4">

                        <div
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            order.payment_status ===
                            "Paid"
                              ? "bg-green-100 text-green-700"
                              : order.payment_status ===
                                "Partially Paid"
                              ? "bg-yellow-100 text-yellow-700"
                              : order.payment_status ===
                                "Refunded"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {
                            order.payment_status
                          }
                        </div>

                        <select
                          value={
                            order.payment_status ||
                            "Pending"
                          }
                          onChange={(e) =>
                            updateOrderPayment(
                              order,
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-4 py-2 text-sm"
                        >

                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Partially Paid">
                            Partially Paid
                          </option>

                          <option value="Paid">
                            Paid
                          </option>

                          <option value="Refunded">
                            Refunded
                          </option>

                        </select>

                        <div className="mt-2 text-xs text-slate-400">

                          Paid: ₦
                          {Number(
                            order.amount_paid || 0
                          ).toLocaleString()}

                          <br />

                          Balance: ₦
                          {order.payment_status === "Paid"
                            ? "0"
                            : Math.max(
                                Number(
                                  order.total_amount || 0
                                ) -
                                  Number(
                                    order.amount_paid || 0
                                  ),
                                0
                              ).toLocaleString()}

                        </div>

                      </td>

                      {/* ORDER STATUS */}

                      <td className="p-4">

                        <div
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            order.order_status ===
                            "Completed"
                              ? "bg-green-100 text-green-700"
                              : order.order_status ===
                                "Ready"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.order_status ===
                                "Preparing"
                              ? "bg-purple-100 text-purple-700"
                              : order.order_status ===
                                "Cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {
                            order.order_status
                          }
                        </div>

                        <select
                          value={
                            order.order_status ||
                            "Pending"
                          }
                          onChange={async (
                            e
                          ) => {

                            const newStatus =
                              e.target.value;

                            if (
                              newStatus ===
                              "Completed"
                            ) {
                              await completeCustomerOrder(
                                order
                              );
                              return;
                            }

                            const {
                              error,
                            } =
                              await supabase
                                .from(
                                  "orders"
                                )
                                .update({
                                  order_status:
                                    newStatus,
                                })
                                .eq(
                                  "id",
                                  order.id
                                );

                            if (
                              error
                            ) {
                              showToast(
                                "error",
                                "Status Update Failed",
                                error.message
                              );
                              return;
                            }

                            if (
                              newStatus ===
                                "Confirmed" ||
                              newStatus ===
                                "Ready"
                            ) {

                              const title =
                                newStatus ===
                                "Confirmed"
                                  ? "Order Confirmed"
                                  : "Order Ready";

                              const message =
                                newStatus ===
                                "Confirmed"
                                  ? `Your order ${order.order_number} has been confirmed.`
                                  : `Good news! Your order ${order.order_number} is ready for pickup.`;

                              if (
                                order.customer_id
                              ) {
                                const {
                                  error:
                                    notificationError,
                                } =
                                  await supabase
                                    .from(
                                      "notifications"
                                    )
                                    .insert({
                                      customer_id:
                                        order.customer_id,

                                      title,

                                      message,

                                      is_read:
                                        false,
                                    });

                                if (
                                  notificationError
                                ) {
                                  console.error(
                                    "Notification error:",
                                    notificationError
                                  );
                                }
                              }
                            }

                            await fetchOrders();

                            showToast(
                              "success",
                              "Order Status Updated",
                              `${order.order_number} is now ${newStatus}.`
                            );
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 text-white px-4 py-2 text-sm"
                        >

                          <option>
                            Pending
                          </option>

                          <option>
                            Confirmed
                          </option>

                          <option>
                            Preparing
                          </option>

                          <option>
                            Baking
                          </option>

                          <option>
                            Packaging
                          </option>

                          <option>
                            Ready
                          </option>

                          <option>
                            Completed
                          </option>

                          <option>
                            Cancelled
                          </option>

                        </select>

                      </td>

                      <td className="p-4 text-slate-200">
                        {
                          order.delivery_date ||
                          "-"
                        }
                      </td>

                      <td className="p-4">

                        <button
                          onClick={() =>
                            router.push(
                              `/orders/${order.id}`
                            )
                          }
                          className="bg-blue-950 hover:bg-blue-900 text-white px-4 py-2 rounded-lg"
                        >
                          View
                        </button>

                      </td>

                      <td className="p-4">

                        <button
                          onClick={() =>
                            deleteOrder(
                              order
                            )
                          }
                          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
                        >
                          Delete
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </ProtectedRoute>
  );
}
