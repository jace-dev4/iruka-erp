import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const staffId = body?.staffId;

    if (!staffId) {
      return NextResponse.json(
        {
          error: "Staff ID is required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Server configuration error. Supabase service role key is missing.",
        },
        { status: 500 }
      );
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

    /* =====================================================
       1. GET STAFF RECORD
    ===================================================== */

    const {
      data: staffMember,
      error: staffFetchError,
    } = await supabaseAdmin
      .from("staff")
      .select(
        `
          id,
          staff_id,
          full_name,
          erp_user,
          erp_email,
          erp_role
        `
      )
      .eq("staff_id", staffId)
      .maybeSingle();

    if (staffFetchError) {
      console.error(
        "Staff lookup error:",
        staffFetchError
      );

      return NextResponse.json(
        {
          error: staffFetchError.message,
        },
        { status: 500 }
      );
    }

    if (!staffMember) {
      return NextResponse.json(
        {
          error: "Staff member not found.",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       2. NEVER REMOVE SYSTEM ADMIN
    ===================================================== */

    const role =
      staffMember.erp_role?.toLowerCase();

    const email =
      staffMember.erp_email?.toLowerCase();

    if (
      role === "admin" ||
      email === "admin@irukaajah.com" ||
      email === "admin@iruka.com"
    ) {
      return NextResponse.json(
        {
          error:
            "The System Admin account cannot be removed.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       3. FIND ERP USER IN public.users
    ===================================================== */

    let erpUserRecord: {
      id: string;
      email: string | null;
      full_name: string | null;
      role: string | null;
    } | null = null;

    if (staffMember.erp_email) {
      const {
        data: userRecord,
        error: userLookupError,
      } = await supabaseAdmin
        .from("users")
        .select(
          `
            id,
            email,
            full_name,
            role
          `
        )
        .eq(
          "email",
          staffMember.erp_email
        )
        .maybeSingle();

      if (userLookupError) {
        console.error(
          "ERP users lookup error:",
          userLookupError
        );

        return NextResponse.json(
          {
            error:
              userLookupError.message ||
              "Unable to find ERP user record.",
          },
          { status: 500 }
        );
      }

      erpUserRecord =
        userRecord || null;
    }

    /* =====================================================
       4. FIND SUPABASE AUTH USER
    ===================================================== */

    let authUserId: string | null = null;

    if (staffMember.erp_email) {
      let page = 1;

      while (!authUserId) {
        const {
          data: authUsers,
          error: authUsersError,
        } =
          await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });

        if (authUsersError) {
          console.error(
            "Auth users lookup error:",
            authUsersError
          );

          return NextResponse.json(
            {
              error:
                authUsersError.message ||
                "Unable to find ERP account.",
            },
            { status: 500 }
          );
        }

        const matchingUser =
          authUsers?.users?.find(
            (user) =>
              user.email?.toLowerCase() ===
              staffMember.erp_email?.toLowerCase()
          );

        if (matchingUser) {
          authUserId =
            matchingUser.id;

          break;
        }

        if (
          !authUsers?.users ||
          authUsers.users.length < 1000
        ) {
          break;
        }

        page++;
      }
    }

    /* =====================================================
       5. NEVER DELETE SYSTEM ADMIN AUTH ACCOUNT
    ===================================================== */

    const ADMIN_AUTH_ID =
      "ec973a6e-c170-43f0-b2cb-f0bd37167644";

    if (authUserId === ADMIN_AUTH_ID) {
      return NextResponse.json(
        {
          error:
            "The System Admin account cannot be removed.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       6. DELETE public.users RECORD
    ===================================================== */

    if (erpUserRecord?.id) {
      const {
        error: deleteUserError,
      } = await supabaseAdmin
        .from("users")
        .delete()
        .eq(
          "id",
          erpUserRecord.id
        );

      if (deleteUserError) {
        console.error(
          "ERP users deletion error:",
          deleteUserError
        );

        return NextResponse.json(
          {
            error:
              deleteUserError.message ||
              "Unable to remove ERP user record.",
          },
          { status: 500 }
        );
      }
    }

    /* =====================================================
       7. DELETE SUPABASE AUTH ACCOUNT
    ===================================================== */

    if (authUserId) {
      const {
        error: deleteAuthError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        );

      if (deleteAuthError) {
        console.error(
          "Auth user deletion error:",
          deleteAuthError
        );

        return NextResponse.json(
          {
            error:
              deleteAuthError.message ||
              "ERP user record was removed, but the login account could not be deleted.",
          },
          { status: 500 }
        );
      }
    }

    /* =====================================================
       8. REMOVE ERP ACCESS FROM STAFF RECORD
       STAFF RECORD ITSELF IS NOT DELETED
    ===================================================== */

    const {
      error: staffUpdateError,
    } = await supabaseAdmin
      .from("staff")
      .update({
        erp_user: false,
        erp_email: null,
        erp_role: null,
      })
      .eq(
        "staff_id",
        staffId
      );

    if (staffUpdateError) {
      console.error(
        "ERP access cleanup error:",
        staffUpdateError
      );

      return NextResponse.json(
        {
          error:
            staffUpdateError.message ||
            "ERP account was removed, but staff ERP information could not be cleared.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       9. SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,
        message:
          `${staffMember.full_name} has been completely removed from ERP access.`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Remove ERP user error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while removing ERP access.",
      },
      { status: 500 }
    );
  }
}