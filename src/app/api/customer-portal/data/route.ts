import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase server environment variables.");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const customerCode = searchParams
      .get("customerId")
      ?.trim()
      .toUpperCase();

    if (!customerCode) {
      return NextResponse.json(
        { error: "Customer ID is required." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } =
      await supabaseAdmin
        .from("customers")
        .select(
          `
            id,
            full_name,
            phone,
            email,
            address,
            status,
            customer_type,
            customer_code,
            photo_url,
            created_at
          `
        )
        .eq("customer_code", customerCode)
        .maybeSingle();

    if (customerError) {
      console.error("PORTAL CUSTOMER ERROR:", customerError);

      return NextResponse.json(
        { error: "Unable to load customer information." },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Customer ID not found." },
        { status: 404 }
      );
    }

    if (
      customer.status &&
      customer.status.toLowerCase() === "inactive"
    ) {
      return NextResponse.json(
        { error: "This customer account is inactive." },
        { status: 403 }
      );
    }

    const { data: orders, error: ordersError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", {
          ascending: false,
        });

    if (ordersError) {
      console.error("PORTAL ORDERS ERROR:", ordersError);
    }

    const { data: messages, error: messagesError } =
      await supabaseAdmin
        .from("customer_messages")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      console.error(
        "PORTAL MESSAGES ERROR:",
        messagesError
      );
    }

    const safeOrders = orders || [];
    const safeMessages = messages || [];

    const totalSpent = safeOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount ??
            order.total ??
            0
        ),
      0
    );

    const totalBalance = safeOrders.reduce(
      (sum, order) =>
        sum + Number(order.balance || 0),
      0
    );

    const activeOrders = safeOrders.filter(
      (order) => {
        const status = String(
          order.order_status ||
            order.status ||
            ""
        ).toLowerCase();

        return ![
          "completed",
          "complete",
          "cancelled",
          "canceled",
          "delivered",
        ].includes(status);
      }
    );

    const unreadMessages = safeMessages.filter(
      (message) =>
        message.direction === "erp_to_customer" &&
        !message.read_at
    ).length;

    return NextResponse.json({
      success: true,

      customer,

      orders: safeOrders,

      messages: safeMessages,

      stats: {
        totalOrders: safeOrders.length,
        activeOrders: activeOrders.length,
        totalSpent,
        totalBalance,
        unreadMessages,
      },
    });
  } catch (error) {
    console.error(
      "CUSTOMER PORTAL DATA ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading the portal.",
      },
      { status: 500 }
    );
  }
}
