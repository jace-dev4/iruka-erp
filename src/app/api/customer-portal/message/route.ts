import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase server environment variables are missing.");
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const customerCode = String(
      formData.get("customerId") || ""
    )
      .trim()
      .toUpperCase();

    const message = String(
      formData.get("message") || ""
    ).trim();

    const file = formData.get("file");

    // ----------------------------------------
    // Validate customer ID
    // ----------------------------------------

    if (!customerCode) {
      return NextResponse.json(
        {
          error: "Customer ID is required.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // Validate message/file
    // ----------------------------------------

    const hasFile =
      file instanceof File && file.size > 0;

    if (!message && !hasFile) {
      return NextResponse.json(
        {
          error:
            "Please enter a message or attach a file.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // Find customer
    // ----------------------------------------

    const { data: customer, error: customerError } =
      await supabaseAdmin
        .from("customers")
        .select(
          "id, customer_code, full_name, status"
        )
        .eq("customer_code", customerCode)
        .maybeSingle();

    if (customerError) {
      console.error(
        "Customer lookup error:",
        customerError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify customer information.",
          details: customerError.message,
        },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error: "Customer not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------
    // File upload
    // ----------------------------------------

    let fileUrl: string | null = null;
    let attachmentLabel = "";

    if (hasFile) {
      // 50 MB maximum
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          {
            error:
              "File is too large. Maximum size is 50MB.",
          },
          { status: 400 }
        );
      }

      const isImage =
        file.type.startsWith("image/");

      const isVideo =
        file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        return NextResponse.json(
          {
            error:
              "Only image and video files are supported.",
          },
          { status: 400 }
        );
      }

      attachmentLabel = isVideo
        ? "🎥 Video attachment"
        : "📷 Image attachment";

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "file";

      const safeExtension =
        extension.replace(
          /[^a-z0-9]/g,
          ""
        );

      const filePath =
        `messages/${customer.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

      const fileBuffer =
        await file.arrayBuffer();

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("customer-photos")
          .upload(
            filePath,
            fileBuffer,
            {
              contentType: file.type,
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          "File upload error:",
          uploadError
        );

        return NextResponse.json(
          {
            error:
              "The message could not be sent because the file upload failed.",
            details:
              uploadError.message,
          },
          { status: 500 }
        );
      }

      const { data: publicUrlData } =
        supabaseAdmin.storage
          .from("customer-photos")
          .getPublicUrl(filePath);

      fileUrl =
        publicUrlData.publicUrl;
    }

    // ----------------------------------------
    // Create customer message
    // ----------------------------------------

    const finalMessage =
      message ||
      attachmentLabel ||
      "Message";

    const {
      data: newMessage,
      error: messageError,
    } = await supabaseAdmin
      .from("customer_messages")
      .insert({
        customer_id: customer.id,
        audience: "individual",
        direction: "inbound",
        message_type: "message",
        message: finalMessage,
        image_url: fileUrl,
        status: "sent",
      })
      .select()
      .single();

    if (messageError) {
      console.error(
        "MESSAGE INSERT ERROR:",
        messageError
      );

      return NextResponse.json(
        {
          error:
            `Supabase error: ${messageError.message}`,
          details: messageError,
        },
        { status: 500 }
      );
    }

    // ----------------------------------------
    // Success
    // ----------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: newMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Customer portal message error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while sending your message.",
      },
      { status: 500 }
    );
  }
}