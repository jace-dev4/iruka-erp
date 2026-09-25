"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import PremiumButton from "@/components/ui/PremiumButton";
import { toast } from "sonner";

const DEPARTMENTS = [
  "Production",
  "Sales",
  "Inventory",
  "Packaging",
  "Administration",
  "Dispatch",
  "Security",
  "Maintenance",
];

const STAFF_PAGE_SIZE = 10;

export default function StaffPage() {
  /* =====================================================
     FILE INPUT REFS
  ====================================================== */

  const photoInputRef =
    useRef<HTMLInputElement>(null);

  const cvInputRef =
    useRef<HTMLInputElement>(null);

  /* =====================================================
     STATES
  ====================================================== */

  const [staff, setStaff] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [searchStaff, setSearchStaff] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  /* LOAD MORE */

  const [visibleStaffCount, setVisibleStaffCount] =
    useState(STAFF_PAGE_SIZE);

  /* DELETE */

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [staffToDelete, setStaffToDelete] =
    useState<any>(null);

  const [deletingStaff, setDeletingStaff] =
    useState(false);

  /* STAFF FORM */

  const [staffId, setStaffId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [employmentStatus, setEmploymentStatus] =
    useState("Active");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] =
    useState("");
  const [dateJoined, setDateJoined] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);
  const [cv, setCv] = useState<File | null>(null);

  /* DEBT FORM */

  const [selectedStaff, setSelectedStaff] = useState("");
  const [debtReason, setDebtReason] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  /* =====================================================
     ERP ACCESS
  ====================================================== */

  const [selectedMember, setSelectedMember] =
    useState<any>(null);

  const [showErpModal, setShowErpModal] = useState(false);

  const [erpEmail, setErpEmail] = useState("");

  const [erpRole, setErpRole] = useState("management");

  const [temporaryPassword, setTemporaryPassword] =
    useState("");

  const [removingErpAccess, setRemovingErpAccess] =
    useState(false);

  const [showRemoveErpModal, setShowRemoveErpModal] =
    useState(false);

  /* =====================================================
     VIEW STAFF PROFILE
  ====================================================== */

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [profileStaff, setProfileStaff] =
    useState<any>(null);

  /* =====================================================
     EDIT STAFF
  ====================================================== */

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [editingStaff, setEditingStaff] =
    useState<any>(null);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  /* =====================================================
     STAFF ACTION MENU
  ====================================================== */

  const [openActionMenu, setOpenActionMenu] =
    useState<string | null>(null);

  /* =====================================================
     LOAD DATA + SUPABASE REALTIME
  ====================================================== */

  useEffect(() => {
    fetchData();
    generateStaffId();

    const staffChannel = supabase
      .channel("staff-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const debtsChannel = supabase
      .channel("staff-debts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_debts",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(debtsChannel);
    };
  }, []);

  /* =====================================================
     GENERATE UNIQUE STAFF ID
  ====================================================== */

async function generateStaffId() {
  let newStaffId = "";
  let isUnique = false;

  while (!isUnique) {
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    newStaffId = `IRK-${randomNumber}`;

    const { data, error } = await supabase
      .from("staff")
      .select("id")
      .eq("staff_id", newStaffId)
      .maybeSingle();

    if (error) {
      console.error("Failed to check Staff ID:", error);
      return;
    }

    if (!data) {
      isUnique = true;
    }
  }

  setStaffId(newStaffId);
}

  /* =====================================================
     FETCH DATA
  ====================================================== */

  async function fetchData(
    showRefreshNotification = false
  ) {
    if (showRefreshNotification) {
      setRefreshing(true);
    }

    try {
      const [
        { data: staffData, error: staffError },
        { data: debtData, error: debtError },
      ] = await Promise.all([
        supabase
          .from("staff")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("staff_debts")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (staffError) {
        throw staffError;
      }

      if (debtError) {
        throw debtError;
      }

      setStaff(staffData || []);
      setDebts(debtData || []);

      setVisibleStaffCount(STAFF_PAGE_SIZE);

      if (showRefreshNotification) {
        toast.success(
          "Staff records refreshed successfully."
        );
      }
    } catch (error: any) {
      console.error(
        "Staff data fetch error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to load staff records."
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* =====================================================
     REGISTER STAFF
  ====================================================== */

  async function addStaff() {
    if (
      !fullName.trim() ||
      !phoneNumber.trim() ||
      !department.trim() ||
      !position.trim() ||
      !gender.trim() ||
      !address.trim() ||
      !emergencyContact.trim() ||
      !dateJoined.trim() ||
      !salary.trim()
    ) {
      toast.warning(
        "Please fill all required fields."
      );
      return;
    }

    setSavingStaff(true);

    try {
      /* =================================================
         MAKE SURE STAFF ID EXISTS
      ================================================== */

      if (!staffId) {
        await generateStaffId();
      }

      let currentStaffId = staffId;

      if (!currentStaffId) {
        throw new Error(
          "Unable to generate Staff ID."
        );
      }

      /* ==========================
         UPLOAD CV
      ========================== */

      let cvUrl: string | null = null;

      if (cv) {
        const cvName =
          `${Date.now()}-${cv.name}`;

        const { error: cvError } =
          await supabase.storage
            .from("staff-cv")
            .upload(cvName, cv);

        if (cvError) {
          toast.error(cvError.message);
          return;
        }

        const { data } =
          supabase.storage
            .from("staff-cv")
            .getPublicUrl(cvName);

        cvUrl = data.publicUrl;
      }

      /* ==========================
         UPLOAD PASSPORT PHOTO
      ========================== */

      let photoUrl: string | null = null;

      if (photo) {
        const photoName =
          `${Date.now()}-${photo.name}`;

        const { error: photoError } =
          await supabase.storage
            .from("staff-photos")
            .upload(
              photoName,
              photo
            );

        if (photoError) {
          toast.error(photoError.message);
          return;
        }

        const { data } =
          supabase.storage
            .from("staff-photos")
            .getPublicUrl(
              photoName
            );

        photoUrl = data.publicUrl;
      }

      /* ==========================
         INSERT STAFF
      ========================== */

      let { error } = await supabase
        .from("staff")
        .insert([
          {
            staff_id: currentStaffId,
            full_name: fullName,
            phone_number: phoneNumber,
            department,
            position,
            gender,
            address,
            emergency_contact:
              emergencyContact,
            date_joined: dateJoined,
            date_of_birth:
              dateOfBirth || null,
            salary: Number(salary),
            bank_name: bankName,
            account_name:
              accountName,
            account_number:
              accountNumber,
            employment_status:
              employmentStatus,
            photo_url: photoUrl,
            cv_url: cvUrl,
          },
        ]);

      /* =================================================
         IF STAFF ID COLLISION OCCURS
         GENERATE ANOTHER ID AND RETRY ONCE
      ================================================== */

      if (
        error &&
        (
          error.code === "23505" ||
          error.message
            ?.toLowerCase()
            .includes("staff_staff_id_unique")
        )
      ) {
        await generateStaffId();

        const { data: existingStaff } =
          await supabase
            .from("staff")
            .select("id")
            .eq("staff_id", staffId)
            .maybeSingle();

        if (existingStaff) {
          throw new Error(
            "Unable to generate a unique Staff ID. Please try again."
          );
        }

        currentStaffId = staffId;

        const retryResult =
          await supabase
            .from("staff")
            .insert([
              {
                staff_id: currentStaffId,
                full_name: fullName,
                phone_number: phoneNumber,
                department,
                position,
                gender,
                address,
                emergency_contact:
                  emergencyContact,
                date_joined: dateJoined,
                date_of_birth:
                  dateOfBirth || null,
                salary: Number(salary),
                bank_name: bankName,
                account_name:
                  accountName,
                account_number:
                  accountNumber,
                employment_status:
                  employmentStatus,
                photo_url: photoUrl,
                cv_url: cvUrl,
              },
            ]);

        error = retryResult.error;
      }

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Staff registered successfully."
      );

      /* =================================================
         RESET ALL REGISTRATION FIELDS
      ================================================== */

      setFullName("");
      setPhoneNumber("");
      setDepartment("");
      setSalary("");
      setEmploymentStatus("Active");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setPosition("");
      setGender("");
      setAddress("");
      setEmergencyContact("");
      setDateJoined("");
      setDateOfBirth("");

      /* =================================================
         RESET UPLOADED FILE STATE
      ================================================== */

      setPhoto(null);
      setCv(null);

      /* =================================================
         COMPLETELY CLEAR FILE INPUT ELEMENTS
      ================================================== */

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      if (cvInputRef.current) {
        cvInputRef.current.value = "";
      }

      /* =================================================
         GENERATE FRESH STAFF ID
      ================================================== */

      await generateStaffId();

      await fetchData();
    } catch (error: any) {
      console.error(
        "Register staff error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to register staff."
      );
    } finally {
      setSavingStaff(false);
    }
  }

  /* =====================================================
     RECORD STAFF DEBT
  ====================================================== */

  async function addDebt() {
    if (
      !selectedStaff ||
      !debtReason ||
      !debtAmount
    ) {
      toast.warning(
        "Please complete all fields."
      );
      return;
    }

    try {
      const today = new Date();

      const month =
        today.toLocaleString(
          "default",
          {
            month: "long",
          }
        );

      const year =
        today.getFullYear();

      const { error } =
        await supabase
          .from("staff_debts")
          .insert([
            {
              staff_name:
                selectedStaff,
              reason:
                debtReason,
              amount:
                Number(debtAmount),
              month,
              year,
              status: "Open",
            },
          ]);

      if (error) {
        toast.error(error.message);
        return;
      }

      setSelectedStaff("");
      setDebtReason("");
      setDebtAmount("");

      await fetchData();

      toast.success(
        "Staff debt recorded successfully."
      );
    } catch (error: any) {
      console.error(
        "Staff debt error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to record staff debt."
      );
    }
  }

  /* =====================================================
     TOTAL CURRENT MONTH DEBT
  ====================================================== */

  function getTotalDebt(
    staffName: string
  ) {
    const today = new Date();

    const month =
      today.toLocaleString(
        "default",
        {
          month: "long",
        }
      );

    const year =
      today.getFullYear();

    return debts
      .filter(
        (debt) =>
          debt.staff_name ===
            staffName &&
          debt.month === month &&
          debt.year === year
      )
      .reduce(
        (sum, debt) =>
          sum +
          Number(debt.amount),
        0
      );
  }

  /* =====================================================
     OPEN ERP ACCESS
  ====================================================== */

  function openErpAccess(member: any) {
    setSelectedMember(member);

    setErpEmail(
      member.erp_email || ""
    );

    setErpRole(
      member.erp_role ||
        "production"
    );

    setTemporaryPassword("");

    setShowErpModal(true);
  }

  /* =====================================================
     CREATE ERP ACCOUNT
  ====================================================== */

  async function createErpAccount() {
    if (
      !selectedMember ||
      !erpEmail ||
      !temporaryPassword
    ) {
      toast.warning(
        "Please complete all fields."
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/staff/create-user",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            staffId:
              selectedMember.staff_id,
            fullName:
              selectedMember.full_name,
            email: erpEmail,
            password:
              temporaryPassword,
            role: erpRole,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        toast.error(
          result.error ||
            "Unable to create ERP account."
        );
        return;
      }

      toast.success(
        "ERP account created successfully."
      );

      setShowErpModal(false);
      setSelectedMember(null);

      await fetchData();
    } catch (error) {
      console.error(
        "ERP account error:",
        error
      );

      toast.error(
        "Something went wrong while creating the ERP account."
      );
    }
  }

  /* =====================================================
     OPEN REMOVE ERP CONFIRMATION
  ====================================================== */

  function openRemoveErpModal() {
    if (!selectedMember) return;

    setShowRemoveErpModal(true);
  }

  /* =====================================================
     REMOVE ERP ACCESS
  ====================================================== */

  async function removeErpAccess() {
    if (!selectedMember) return;

    setRemovingErpAccess(true);

    try {
      const response = await fetch(
        "/api/staff/remove-user",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            staffId: selectedMember.staff_id,
            email: selectedMember.erp_email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          result.error ||
            "Unable to remove ERP access."
        );
        return;
      }

      toast.success(
        `${selectedMember.full_name} has been removed from ERP access.`
      );

      setShowRemoveErpModal(false);
      setShowErpModal(false);
      setSelectedMember(null);

      setErpEmail("");
      setErpRole("management");
      setTemporaryPassword("");

      await fetchData();
    } catch (error: any) {
      console.error(
        "Remove ERP access error:",
        error
      );

      toast.error(
        error?.message ||
          "Something went wrong while removing ERP access."
      );
    } finally {
      setRemovingErpAccess(false);
    }
  }

  /* =====================================================
     OPEN DELETE CONFIRMATION
  ====================================================== */

  function openDeleteModal(member: any) {
    setStaffToDelete(member);
    setShowDeleteModal(true);
  }

  /* =====================================================
     DELETE STAFF
  ====================================================== */

  async function deleteStaff() {
    if (!staffToDelete) return;

    setDeletingStaff(true);

    try {
      if (
        staffToDelete.erp_user &&
        staffToDelete.erp_email
      ) {
        const response =
          await fetch(
            "/api/staff/remove-user",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                staffId:
                  staffToDelete.staff_id,
                email:
                  staffToDelete.erp_email,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          toast.error(
            result.error ||
              "Unable to remove ERP access before deleting staff."
          );
          return;
        }
      }

      const { error: debtDeleteError } =
        await supabase
          .from("staff_debts")
          .delete()
          .eq(
            "staff_name",
            staffToDelete.full_name
          );

      if (debtDeleteError) {
        console.error(
          "Staff debt cleanup error:",
          debtDeleteError
        );

        toast.error(
          debtDeleteError.message ||
            "Unable to prepare staff record for deletion."
        );

        return;
      }

      const { error: staffDeleteError } =
        await supabase
          .from("staff")
          .delete()
          .eq(
            "id",
            staffToDelete.id
          );

      if (staffDeleteError) {
        console.error(
          "Staff delete error:",
          staffDeleteError
        );

        toast.error(
          staffDeleteError.message ||
            "Unable to delete staff record."
        );

        return;
      }

      setShowDeleteModal(false);
      setStaffToDelete(null);

      if (
        profileStaff?.id ===
        staffToDelete.id
      ) {
        setShowProfileModal(false);
        setProfileStaff(null);
      }

      if (
        editingStaff?.id ===
        staffToDelete.id
      ) {
        setShowEditModal(false);
        setEditingStaff(null);
      }

      if (
        selectedMember?.id ===
        staffToDelete.id
      ) {
        setShowErpModal(false);
        setSelectedMember(null);
      }

      await fetchData();

      toast.success(
        `${staffToDelete.full_name} has been deleted from Staff Management.`
      );
    } catch (error: any) {
      console.error(
        "Delete staff error:",
        error
      );

      toast.error(
        error?.message ||
          "Something went wrong while deleting the staff record."
      );
    } finally {
      setDeletingStaff(false);
    }
  }

  /* =====================================================
     EDIT STAFF
  ====================================================== */

  /* =====================================================
     UPDATE STAFF
  ====================================================== */

  async function updateStaff() {
    if (!editingStaff) return;

    try {
      setSavingStaff(true);

      let cvUrl = editingStaff.cv_url || null;

      /* ==========================
         UPLOAD NEW CV IF SELECTED
      ========================== */

      if (editingStaff.new_cv_file) {
        const cvFile =
          editingStaff.new_cv_file as File;

        const cvName =
          `${Date.now()}-${cvFile.name}`;

        const { error: cvError } =
          await supabase.storage
            .from("staff-cv")
            .upload(cvName, cvFile);

        if (cvError) {
          toast.error(cvError.message);
          return;
        }

        const { data } =
          supabase.storage
            .from("staff-cv")
            .getPublicUrl(cvName);

        cvUrl = data.publicUrl;
      }

      /* ==========================
         UPDATE STAFF RECORD
      ========================== */

      const { error } =
        await supabase
          .from("staff")
          .update({
            full_name:
              editingStaff.full_name,

            phone_number:
              editingStaff.phone_number,

            gender:
              editingStaff.gender,

            department:
              editingStaff.department,

            position:
              editingStaff.position,

            salary:
              Number(editingStaff.salary),

            employment_status:
              editingStaff.employment_status,

            cv_url: cvUrl,
          })
          .eq(
            "id",
            editingStaff.id
          );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Staff information updated successfully."
      );

      setShowEditModal(false);
      setEditingStaff(null);

      await fetchData();

    } catch (error: any) {
      console.error(
        "Staff update error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to update staff."
      );

    } finally {
      setSavingStaff(false);
    }
  }
  /* =====================================================
     UPLOAD STAFF PHOTO
  ====================================================== */

  async function uploadStaffPhoto(
    file: File
  ) {
    if (!editingStaff) return;

    try {
      setUploadingPhoto(true);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "staffId",
        editingStaff.id
      );

      const response =
        await fetch(
          "/api/staff/upload-photo",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error
        );
      }

      setEditingStaff({
        ...editingStaff,
        photo_url:
          result.photo_url,
      });

      await fetchData();

      toast.success(
        "Photo uploaded successfully."
      );
    } catch (error: any) {
      console.error(
        "Photo upload error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to upload photo."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  /* =====================================================
     WORKING DURATION
  ====================================================== */

  function getWorkingDuration(
    dateJoined: string
  ) {
    if (!dateJoined) return "-";

    const joined =
      new Date(dateJoined);

    const today =
      new Date();

    let years =
      today.getFullYear() -
      joined.getFullYear();

    let months =
      today.getMonth() -
      joined.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years <= 0) {
      return `${months} Month${
        months !== 1
          ? "s"
          : ""
      }`;
    }

    return `${years} Year${
      years !== 1
        ? "s"
        : ""
    }, ${months} Month${
      months !== 1
        ? "s"
        : ""
    }`;
  }

  /* =====================================================
     FILTER STAFF
  ====================================================== */

  const filteredStaff = useMemo(() => {
    const search =
      searchStaff
        .trim()
        .toLowerCase();

    if (!search) {
      return staff;
    }

    return staff.filter(
      (member) =>
        member.full_name
          ?.toLowerCase()
          .includes(search) ||
        member.staff_id
          ?.toLowerCase()
          .includes(search) ||
        member.phone_number
          ?.toLowerCase()
          .includes(search) ||
        member.department
          ?.toLowerCase()
          .includes(search) ||
        member.position
          ?.toLowerCase()
          .includes(search)
    );
  }, [staff, searchStaff]);

  const displayedStaff =
    searchStaff.trim()
      ? filteredStaff
      : filteredStaff.slice(
          0,
          visibleStaffCount
        );

  const hasMoreStaff =
    !searchStaff.trim() &&
    visibleStaffCount <
      filteredStaff.length;

  function loadMoreStaff() {
    setVisibleStaffCount(
      (current) =>
        current + STAFF_PAGE_SIZE
    );
  }

  /* =====================================================
     KPIs
  ====================================================== */

  const totalStaff =
    staff.length;

  const totalSalary =
    staff.reduce(
      (sum, member) =>
        sum +
        Number(member.salary),
      0
    );

  const totalDebt =
    debts.reduce(
      (sum, debt) =>
        sum +
        Number(debt.amount),
      0
    );

  const totalDepartments =
    new Set(
      staff.map(
        (member) =>
          member.department
      )
    ).size;

  /* =====================================================
     PAGE
  ====================================================== */

  return (
    <ProtectedRoute allowedRoles={["admin", "management"]}>
      <div className="min-h-screen bg-gradient-to-br from-[#081028] via-[#0B1739] to-[#142850] p-10">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="flex items-center justify-between mb-10">

          <div className="mb-10 rounded-3xl border border-slate-700 bg-gradient-to-r from-[#0B1739] via-[#142850] to-[#1E3A8A] p-8 shadow-2xl flex-1">

            <div className="flex items-center justify-between">

              <div>

                <div className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-300 mb-4">
                  👥 Human Resources Module
                </div>

                <h1 className="text-5xl font-black text-white tracking-tight">
                  Staff Management
                </h1>

                <p className="mt-3 text-slate-300 text-lg">
                  Register employees, manage payroll information, ERP access, employment status and staff records.
                </p>

              </div>

              <div className="hidden lg:flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-5xl">
                👨‍💼
              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              fetchData(true)
            }
            disabled={refreshing}
            className="mb-10 ml-6 flex items-center gap-3 rounded-2xl border border-blue-400/30 bg-blue-900/60 px-6 py-4 font-bold text-white shadow-xl shadow-blue-950/30 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-800 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
              : "Refresh Staff"}
          </button>

        </div>

        {/* =====================================================
            KPI CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-7 shadow-xl text-white">
            <p className="uppercase tracking-widest text-xs font-semibold text-blue-100">
              TOTAL STAFF
            </p>

            <h2 className="text-5xl font-black mt-4">
              {totalStaff}
            </h2>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-7 shadow-xl text-white">
            <p className="uppercase tracking-widest text-xs font-semibold text-green-100">
              MONTHLY SALARY BILL
            </p>

            <h2 className="text-5xl font-black mt-4">
              ₦{totalSalary.toLocaleString()}
            </h2>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-red-800 p-7 shadow-xl text-white">
            <p className="uppercase tracking-widest text-xs font-semibold text-red-100">
              TOTAL STAFF DEBT
            </p>

            <h2 className="text-5xl font-black mt-4">
              ₦{totalDebt.toLocaleString()}
            </h2>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-7 shadow-xl text-white">
            <p className="uppercase tracking-widest text-xs font-semibold text-yellow-100">
              DEPARTMENTS
            </p>

            <h2 className="text-5xl font-black mt-4">
              {totalDepartments}
            </h2>
          </div>

        </div>

        {/* =====================================================
            REGISTER STAFF
        ====================================================== */}

        <div className="rounded-3xl bg-[#111C44] border border-slate-700 shadow-2xl p-8 mb-8">

          <h2 className="text-3xl font-black text-white mb-8">
            Register New Staff
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

            <input
              type="text"
              value={staffId}
              readOnly
              className="rounded-2xl border-2 border-slate-200 bg-slate-100 p-4 font-bold text-blue-900"
            />

            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) =>
                setFullName(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4 focus:border-blue-600 outline-none"
            />

            <input
              type="text"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) =>
                setPhoneNumber(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4 focus:border-blue-600 outline-none"
            />

            <select
              value={gender}
              onChange={(e) =>
                setGender(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            >
              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>
            </select>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) =>
                setDateOfBirth(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="text"
              placeholder="Home Address"
              value={address}
              onChange={(e) =>
                setAddress(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="text"
              placeholder="Emergency Contact"
              value={emergencyContact}
              onChange={(e) =>
                setEmergencyContact(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <select
              value={department}
              onChange={(e) =>
                setDepartment(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            >
              <option value="">
                Select Department
              </option>

              {DEPARTMENTS.map(
                (dept) => (
                  <option
                    key={dept}
                    value={dept}
                  >
                    {dept}
                  </option>
                )
              )}
            </select>

            <input
              type="text"
              placeholder="Position / Job Title"
              value={position}
              onChange={(e) =>
                setPosition(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="date"
              value={dateJoined}
              onChange={(e) =>
                setDateJoined(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="number"
              placeholder="Monthly Salary"
              value={salary}
              onChange={(e) =>
                setSalary(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="text"
              placeholder="Bank Name"
              value={bankName}
              onChange={(e) =>
                setBankName(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="text"
              placeholder="Account Name"
              value={accountName}
              onChange={(e) =>
                setAccountName(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="text"
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <select
              value={employmentStatus}
              onChange={(e) =>
                setEmploymentStatus(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            >
              <option>
                Active
              </option>

              <option>
                Inactive
              </option>
            </select>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Passport Photo
              </label>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPhoto(
                    e.target.files?.[0] ||
                      null
                  )
                }
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Upload CV (PDF)
              </label>

              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  setCv(
                    e.target.files?.[0] ||
                      null
                  )
                }
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3"
              />
            </div>

            <button
              onClick={addStaff}
              disabled={savingStaff}
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-900 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-blue-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingStaff
                ? "Registering Staff..."
                : "Register Staff"}
            </button>

          </div>
        </div>

        {/* =====================================================
            STAFF DEBT
        ====================================================== */}

        <div className="rounded-3xl bg-[#111C44] border border-slate-700 shadow-2xl p-8 mb-10">

          <h2 className="text-3xl font-black text-white mb-8">
            Record Staff Debt / Advance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

            <select
              value={selectedStaff}
              onChange={(e) =>
                setSelectedStaff(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            >
              <option value="">
                Select Staff
              </option>

              {staff.map(
                (member) => (
                  <option
                    key={member.id}
                    value={
                      member.full_name
                    }
                  >
                    {member.full_name}
                  </option>
                )
              )}
            </select>

            <input
              type="text"
              placeholder="Reason"
              value={debtReason}
              onChange={(e) =>
                setDebtReason(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <input
              type="number"
              placeholder="Amount"
              value={debtAmount}
              onChange={(e) =>
                setDebtAmount(
                  e.target.value
                )
              }
              className="rounded-2xl border-2 border-slate-200 bg-white p-4"
            />

            <PremiumButton
              onClick={addDebt}
              className="w-full"
            >
              💰 Record Debt
            </PremiumButton>

          </div>
        </div>

        {/* =====================================================
            STAFF DIRECTORY
        ====================================================== */}

        <div className="rounded-3xl bg-[#111C44] border border-slate-700 shadow-2xl p-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">

            <div>

              <h2 className="text-3xl font-black text-white">
                Staff Directory
              </h2>

              <p className="text-slate-400 mt-1">
                Showing{" "}
                {displayedStaff.length}{" "}
                of{" "}
                {filteredStaff.length}{" "}
                staff records.
              </p>

            </div>

            <input
              type="text"
              placeholder="Search staff..."
              value={searchStaff}
              onChange={(e) => {
                setSearchStaff(e.target.value);

                setVisibleStaffCount(
                  STAFF_PAGE_SIZE
                );
              }}
              className="mt-5 md:mt-0 w-full md:w-72 rounded-2xl border border-slate-600 bg-[#0B1739] text-white placeholder:text-slate-400 p-4 outline-none focus:border-blue-500"
            />

          </div>

          <div className="overflow-x-auto rounded-2xl">

            <table className="w-full min-w-[1200px]">

              <thead>

                <tr className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white">

                  <th className="p-5 text-left">
                    Photo
                  </th>

                  <th className="p-5 text-left">
                    Full Name
                  </th>

                  <th className="p-5 text-left">
                    Phone
                  </th>

                  <th className="p-5 text-left">
                    Department
                  </th>

                  <th className="p-5 text-left">
                    Position
                  </th>

                  <th className="p-5 text-left">
                    Salary
                  </th>

                  <th className="p-5 text-left">
                    Debt
                  </th>

                  <th className="p-5 text-left">
                    Balance
                  </th>

                  <th className="p-5 text-left">
                    Status
                  </th>

                  <th className="p-5 text-center">
                    More
                  </th>

                </tr>

              </thead>

              <tbody>

                {displayedStaff.length === 0 ? (
                  <tr>

                    <td
                      colSpan={10}
                      className="p-12 text-center text-slate-400"
                    >
                      No staff records found.
                    </td>

                  </tr>
                ) : (
                  displayedStaff.map(
                    (member) => {

                      const debt =
                        getTotalDebt(
                          member.full_name
                        );

                      const balance =
                        Number(
                          member.salary
                        ) - debt;

                      return (
                        <tr
                          key={member.id}
                          onClick={() => {
                            setProfileStaff(member);
                            setShowProfileModal(true);
                          }}
                          className="cursor-pointer border-b border-slate-700 hover:bg-slate-800 transition"
                        >

                          {/* PHOTO */}

                          <td className="p-5">

                            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">

                              {member.photo_url ? (
                                <img
                                  src={
                                    member.photo_url
                                  }
                                  alt={
                                    member.full_name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-xl">
                                  👤
                                </span>
                              )}

                            </div>

                          </td>

                          {/* FULL NAME */}

                          <td className="p-5 font-semibold text-white whitespace-nowrap">
                            {member.full_name}
                          </td>

                          {/* PHONE */}

                          <td className="p-5 text-slate-200 whitespace-nowrap">
                            {member.phone_number}
                          </td>

                          {/* DEPARTMENT */}

                          <td className="p-5 text-slate-200">

                            <span className="rounded-full bg-blue-100 text-blue-900 px-4 py-2 text-sm font-semibold whitespace-nowrap">
                              {member.department}
                            </span>

                          </td>

                          {/* POSITION */}

                          <td className="p-5">

                            <span className="inline-flex rounded-full bg-blue-100 text-blue-900 px-4 py-2 text-sm font-semibold whitespace-nowrap">
                              {member.position ||
                                "No Position Assigned"}
                            </span>

                          </td>

                          {/* SALARY */}

                          <td className="p-5 font-bold text-green-700 whitespace-nowrap">
                            ₦
                            {Number(
                              member.salary
                            ).toLocaleString()}
                          </td>

                          {/* DEBT */}

                          <td className="p-5 font-bold text-red-600 whitespace-nowrap">
                            ₦
                            {debt.toLocaleString()}
                          </td>

                          {/* BALANCE */}

                          <td className="p-5 font-black text-blue-300 whitespace-nowrap">
                            ₦
                            {balance.toLocaleString()}
                          </td>

                          {/* STATUS */}

                          <td className="p-5">

                            <span
                              className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap ${
                                member.employment_status ===
                                "Active"
                                  ? "bg-green-100 text-green-700"
                                  : member.employment_status ===
                                    "On Leave"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : member.employment_status ===
                                    "Suspended"
                                  ? "bg-orange-100 text-orange-700"
                                  : member.employment_status ===
                                    "Terminated"
                                  ? "bg-red-100 text-red-700"
                                  : member.employment_status ===
                                    "Resigned"
                                  ? "bg-gray-100 text-gray-700"
                                  : member.employment_status ===
                                    "Retired"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {member.employment_status ||
                                "Unknown"}
                            </span>

                          </td>

                          {/* PREMIUM ACTION MENU */}

                          <td
                            className="p-5"
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                          >

                            <div className="relative flex justify-center">

                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionMenu(
                                    openActionMenu ===
                                      member.id
                                      ? null
                                      : member.id
                                  )
                                }
                                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                                  openActionMenu ===
                                  member.id
                                    ? "border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "border-slate-600 bg-[#0B1739] text-slate-300 hover:border-blue-400 hover:bg-blue-900/70 hover:text-white"
                                }`}
                                aria-label="Staff actions"
                              >
                                <span className="text-xl leading-none">
                                  ⋯
                                </span>
                              </button>

                              {openActionMenu ===
                                member.id && (
                                <>

                                  <button
                                    type="button"
                                    aria-label="Close action menu"
                                    onClick={() =>
                                      setOpenActionMenu(
                                        null
                                      )
                                    }
                                    className="fixed inset-0 z-[40] cursor-default"
                                  />

                                  <div className="absolute right-0 top-14 z-[50] w-56 overflow-hidden rounded-2xl border border-slate-700 bg-[#0B1739] p-2 shadow-2xl shadow-black/40">

                                    {/* VIEW PROFILE */}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenu(
                                          null
                                        );

                                        setProfileStaff(
                                          member
                                        );

                                        setShowProfileModal(
                                          true
                                        );
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 transition-all hover:bg-blue-600/20 hover:text-white"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                                        👤
                                      </span>

                                      <span>
                                        View Profile
                                      </span>
                                    </button>

                                    {/* EDIT STAFF */}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenu(
                                          null
                                        );

                                        setEditingStaff({
                                          ...member,
                                        });

                                        setShowEditModal(
                                          true
                                        );
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 transition-all hover:bg-amber-500/10 hover:text-white"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                                        ✎
                                      </span>

                                      <span>
                                        Edit Staff
                                      </span>
                                    </button>

                                    {/* ERP ACCESS */}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenu(
                                          null
                                        );

                                        openErpAccess(
                                          member
                                        );
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 transition-all hover:bg-emerald-500/10 hover:text-white"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                                        🔐
                                      </span>

                                      <span>
                                        {member.erp_user
                                          ? "Manage ERP Access"
                                          : "Grant ERP Access"}
                                      </span>
                                    </button>

                                    <div className="my-2 border-t border-slate-700" />

                                    {/* DELETE */}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenu(
                                          null
                                        );

                                        openDeleteModal(
                                          member
                                        );
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                                        🗑
                                      </span>

                                      <span>
                                        Delete Staff
                                      </span>
                                    </button>

                                  </div>

                                </>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* =====================================================
              LOAD MORE
          ====================================================== */}

          {hasMoreStaff && (
            <div className="flex justify-center mt-8">

              <button
                type="button"
                onClick={
                  loadMoreStaff
                }
                className="rounded-2xl border border-blue-400/30 bg-blue-700 px-8 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95"
              >
                Load More Staff

                <span className="ml-2 text-blue-200">
                  +
                  {Math.min(
                    STAFF_PAGE_SIZE,
                    filteredStaff.length -
                      visibleStaffCount
                  )}
                </span>

              </button>

            </div>
          )}

          {!hasMoreStaff &&
            filteredStaff.length >
              STAFF_PAGE_SIZE &&
            !searchStaff.trim() && (
              <div className="mt-8 text-center text-sm text-slate-500">
                All staff records loaded.
              </div>
            )}

        </div>

        {/* =====================================================
            DELETE STAFF MODAL
        ====================================================== */}

        {showDeleteModal &&
          staffToDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">

              <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

                <div className="bg-gradient-to-r from-red-700 to-rose-900 px-8 py-7">

                  <div className="flex items-center gap-4">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                      🗑️
                    </div>

                    <div>

                      <h2 className="text-2xl font-black text-white">
                        Delete Staff Member
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
                      You are about to permanently delete:
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {staffToDelete.full_name}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Staff ID:{" "}
                      <span className="font-bold">
                        {staffToDelete.staff_id}
                      </span>
                    </p>

                    <p className="mt-1 text-slate-600">
                      Department:{" "}
                      <span className="font-bold">
                        {
                          staffToDelete.department
                        }
                      </span>
                    </p>

                  </div>

                  {staffToDelete.erp_user && (
                    <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">

                      <p className="font-bold text-orange-800">
                        ⚠️ ERP Access Detected
                      </p>

                      <p className="mt-2 text-sm text-orange-700 leading-6">
                        This employee currently has ERP access.
                        Their ERP account will be removed before
                        the staff record is deleted.
                      </p>

                    </div>
                  )}

                  <p className="mt-6 text-sm leading-6 text-slate-600">
                    Deleting this staff record will remove
                    the employee from the Staff Directory
                    and remove their staff debt records.
                    Please make sure this employee is no
                    longer required before continuing.
                  </p>

                </div>

                <div className="flex justify-end gap-4 border-t border-slate-200 bg-slate-50 px-8 py-6">

                  <button
                    type="button"
                    disabled={deletingStaff}
                    onClick={() => {
                      setShowDeleteModal(
                        false
                      );

                      setStaffToDelete(
                        null
                      );
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deletingStaff}
                    onClick={
                      deleteStaff
                    }
                    className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 px-7 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:from-red-700 hover:to-rose-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingStaff
                      ? "Deleting..."
                      : "Yes, Delete Staff"}
                  </button>

                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            ERP ACCESS MANAGEMENT MODAL
        ====================================================== */}

        {showErpModal &&
          selectedMember && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">

              <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">

                <div
                  className={`p-7 ${
                    selectedMember.erp_user
                      ? "bg-gradient-to-r from-emerald-800 to-blue-900"
                      : "bg-gradient-to-r from-indigo-800 to-blue-900"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-3xl font-black text-white">
                        ERP Access Management
                      </h2>

                      <p className="text-blue-100 mt-1">
                        {selectedMember.erp_user
                          ? "Manage this employee's ERP account."
                          : "Grant system access to an existing employee."}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-2xl">
                      {selectedMember.erp_user
                        ? "🔐"
                        : "👤"}
                    </div>

                  </div>

                </div>

                <div className="p-8 space-y-6">

                  <div>

                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Employee
                    </label>

                    <input
                      value={
                        selectedMember.full_name ||
                        ""
                      }
                      readOnly
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-100 p-4 font-semibold"
                    />

                  </div>

                  {selectedMember.erp_user ? (

                    <>

                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">

                        <div className="flex items-center gap-4">

                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                            ✅
                          </div>

                          <div>

                            <p className="text-lg font-black text-emerald-900">
                              ERP Account Active
                            </p>

                            <p className="text-sm text-emerald-700">
                              This staff member can currently log into the ERP.
                            </p>

                          </div>

                        </div>

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        <div>

                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            ERP Email
                          </label>

                          <input
                            value={
                              selectedMember.erp_email ||
                              ""
                            }
                            readOnly
                            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-100 p-4"
                          />

                        </div>

                        <div>

                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            ERP Role
                          </label>

                          <input
                            value={
                              selectedMember.erp_role ||
                              ""
                            }
                            readOnly
                            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-100 p-4 capitalize"
                          />

                        </div>

                      </div>

                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                        <p className="font-bold text-red-800">
                          Remove ERP Access
                        </p>

                        <p className="mt-2 text-sm leading-6 text-red-700">
                          This will remove the employee's ERP
                          login account while keeping their
                          staff record, salary information,
                          debts and employment history intact.
                        </p>

                        <button
                          type="button"
                          onClick={
                            openRemoveErpModal
                          }
                          className="mt-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 px-7 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:from-red-700 hover:to-rose-800 active:scale-95"
                        >
                          🔒 Remove ERP Access
                        </button>

                      </div>

                    </>

                  ) : (

                    <>

                      <div>

                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          ERP Email
                        </label>

                        <input
                          type="email"
                          value={erpEmail}
                          onChange={(e) =>
                            setErpEmail(
                              e.target.value
                            )
                          }
                          placeholder="employee@iruka.com"
                          className="w-full rounded-2xl border-2 border-slate-200 p-4 focus:border-indigo-600 outline-none"
                        />

                      </div>

                      <div>

                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          ERP Role
                        </label>

                        <select
                          value={erpRole}
                          onChange={(e) =>
                            setErpRole(
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border-2 border-slate-200 p-4"
                        >

                          <option value="management">
                            Management
                          </option>

                          <option value="inventory officer">
                            Inventory Officer
                          </option>

                          <option value="cashier">
                            Cashier
                          </option>

                          <option value="accountant">
                            Accountant
                          </option>

                          <option value="production">
                            Production
                          </option>

                          <option value="admin">
                            Admin
                          </option>

                        </select>

                      </div>

                      <div>

                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Temporary Password
                        </label>

                        <input
                          type="text"
                          value={
                            temporaryPassword
                          }
                          onChange={(e) =>
                            setTemporaryPassword(
                              e.target.value
                            )
                          }
                          placeholder="Temporary Password"
                          className="w-full rounded-2xl border-2 border-slate-200 p-4 focus:border-indigo-600 outline-none"
                        />

                      </div>

                    </>

                  )}

                </div>

                <div className="flex justify-end gap-4 bg-slate-50 px-8 py-6">

                  <button
                    type="button"
                    onClick={() => {
                      setShowErpModal(
                        false
                      );

                      setSelectedMember(
                        null
                      );
                    }}
                    className="rounded-2xl border border-slate-300 px-6 py-3 font-semibold transition-all duration-200 hover:bg-slate-100 hover:-translate-y-0.5 active:scale-95"
                  >
                    Close
                  </button>

                  {!selectedMember.erp_user && (
                    <button
                      type="button"
                      onClick={
                        createErpAccount
                      }
                      className="rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-900 px-8 py-3 font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-95"
                    >
                      Create ERP Account
                    </button>
                  )}

                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            REMOVE ERP ACCESS CONFIRMATION
        ====================================================== */}

        {showRemoveErpModal &&
          selectedMember && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">

              <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

                <div className="bg-gradient-to-r from-red-700 to-rose-900 px-8 py-7">

                  <div className="flex items-center gap-4">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                      🔒
                    </div>

                    <div>

                      <h2 className="text-2xl font-black text-white">
                        Remove ERP Access?
                      </h2>

                      <p className="mt-1 text-red-100">
                        Confirm account access removal.
                      </p>

                    </div>

                  </div>

                </div>

                <div className="p-8">

                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

                    <p className="text-sm font-semibold text-red-700">
                      You are removing ERP access for:
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {selectedMember.full_name}
                    </p>

                    <p className="mt-2 text-slate-600">
                      Staff ID:{" "}
                      <span className="font-bold">
                        {selectedMember.staff_id}
                      </span>
                    </p>

                    <p className="mt-1 text-slate-600">
                      ERP Email:{" "}
                      <span className="font-bold">
                        {selectedMember.erp_email}
                      </span>
                    </p>

                    <p className="mt-1 text-slate-600">
                      Role:{" "}
                      <span className="font-bold capitalize">
                        {selectedMember.erp_role}
                      </span>
                    </p>

                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                    <p className="text-sm leading-6 text-slate-600">
                      The employee will no longer be able
                      to sign in to the IRUKA ERP. Their
                      staff profile, salary, debts,
                      employment history and other staff
                      records will remain untouched.
                    </p>

                  </div>

                </div>

                <div className="flex justify-end gap-4 border-t border-slate-200 bg-slate-50 px-8 py-6">

                  <button
                    type="button"
                    disabled={
                      removingErpAccess
                    }
                    onClick={() =>
                      setShowRemoveErpModal(
                        false
                      )
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      removingErpAccess
                    }
                    onClick={
                      removeErpAccess
                    }
                    className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 px-7 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 hover:from-red-700 hover:to-rose-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingErpAccess
                      ? "Removing Access..."
                      : "Yes, Remove Access"}
                  </button>

                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            STAFF PROFILE MODAL
        ====================================================== */}

        {showProfileModal &&
          profileStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 overflow-y-auto">

              <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden">

                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8">

                  <div className="flex items-center gap-6">

                    <div className="h-44 w-44 md:h-52 md:w-52 rounded-3xl bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/20 shadow-2xl flex-shrink-0">

                      {profileStaff.photo_url ? (
                        <img
                          src={profileStaff.photo_url}
                          alt={profileStaff.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-7xl">
                          👤
                        </span>
                      )}

                    </div>

                    <div>

                      <h2 className="text-4xl font-black">
                        {profileStaff.full_name}
                      </h2>

                      <p className="text-xl text-blue-200 mt-1 font-semibold">
                        {profileStaff.position ||
                          "No Position Assigned"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3">

                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            profileStaff.employment_status ===
                            "Active"
                              ? "bg-green-500"
                              : profileStaff.employment_status ===
                                "On Leave"
                              ? "bg-yellow-500"
                              : profileStaff.employment_status ===
                                "Suspended"
                              ? "bg-orange-500"
                              : "bg-red-600"
                          }`}
                        >
                          {
                            profileStaff.employment_status
                          }
                        </span>

                        <span className="px-4 py-2 rounded-full bg-white/20 text-sm font-semibold">
                          {
                            profileStaff.department
                          }
                        </span>

                      </div>

                      <div className="grid grid-cols-2 gap-5 mt-6 text-blue-100">

                        <div>
                          <p className="text-xs uppercase">
                            Staff ID
                          </p>

                          <p className="font-bold">
                            {
                              profileStaff.staff_id
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            ERP Role
                          </p>

                          <p className="font-bold">
                            {
                              profileStaff.erp_role ||
                              "No ERP Access"
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            Working Duration
                          </p>

                          <p className="font-bold">
                            {getWorkingDuration(
                              profileStaff.date_joined
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase">
                            Salary
                          </p>

                          <p className="font-bold">
                            ₦
                            {Number(
                              profileStaff.salary
                            ).toLocaleString()}
                          </p>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">

                  <div>

                    <h3 className="text-2xl font-black text-slate-900 mb-5">
                      Personal Information
                    </h3>

                    <div className="space-y-4">

                      <p>
                        <strong>
                          Gender:
                        </strong>{" "}
                        {profileStaff.gender ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Date of Birth:
                        </strong>{" "}
                        {profileStaff.date_of_birth ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Phone:
                        </strong>{" "}
                        {
                          profileStaff.phone_number
                        }
                      </p>

                      <p>
                        <strong>
                          Address:
                        </strong>{" "}
                        {profileStaff.address ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Emergency Contact:
                        </strong>{" "}
                        {
                          profileStaff.emergency_contact ||
                          "-"
                        }
                      </p>

                    </div>

                  </div>

                  <div>

                    <h3 className="text-2xl font-black text-slate-900 mb-5">
                      Employment
                    </h3>

                    <div className="space-y-4">

                      <p>
                        <strong>
                          Department:
                        </strong>{" "}
                        {
                          profileStaff.department
                        }
                      </p>

                      <p>
                        <strong>
                          Position:
                        </strong>{" "}
                        {profileStaff.position ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Date Joined:
                        </strong>{" "}
                        {profileStaff.date_joined ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Working Duration:
                        </strong>{" "}
                        {getWorkingDuration(
                          profileStaff.date_joined
                        )}
                      </p>

                      <p>
                        <strong>
                          Salary:
                        </strong>{" "}
                        ₦
                        {Number(
                          profileStaff.salary
                        ).toLocaleString()}
                      </p>

                      <p>
                        <strong>
                          Status:
                        </strong>{" "}
                        {
                          profileStaff.employment_status
                        }
                      </p>

                    </div>

                  </div>

                  <div>

                    <h3 className="text-2xl font-black text-slate-900 mb-5">
                      ERP Access
                    </h3>

                    <div className="space-y-4">

                      <p>
                        <strong>
                          ERP User:
                        </strong>{" "}
                        {profileStaff.erp_user
                          ? "YES"
                          : "NO"}
                      </p>

                      <p>
                        <strong>
                          Role:
                        </strong>{" "}
                        {
                          profileStaff.erp_role ||
                          "-"
                        }
                      </p>

                      <p>
                        <strong>
                          Email:
                        </strong>{" "}
                        {
                          profileStaff.erp_email ||
                          "-"
                        }
                      </p>

                      {profileStaff.erp_user && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileModal(
                              false
                            );

                            openErpAccess(
                              profileStaff
                            );
                          }}
                          className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-3 text-white font-bold shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                          🔒 Manage ERP Access
                        </button>
                      )}

                    </div>

                  </div>

                  <div>

                    <h3 className="text-2xl font-black text-slate-900 mb-5">
                      Documents
                    </h3>

                    <div className="space-y-4">

                      {profileStaff.cv_url ? (
                        <a
                          href={
                            profileStaff.cv_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-xl bg-blue-700 px-5 py-3 text-white font-semibold shadow-md transition hover:bg-blue-800 hover:-translate-y-0.5"
                        >
                          View CV
                        </a>
                      ) : (
                        <p>
                          No CV Uploaded
                        </p>
                      )}

                    </div>

                  </div>

                </div>

                <div className="flex justify-between items-center bg-slate-100 p-6">

                  <button
                    onClick={() =>
                      openDeleteModal(
                        profileStaff
                      )
                    }
                    className="rounded-xl bg-red-600 hover:bg-red-700 px-6 py-3 text-white font-bold shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    🗑 Delete Staff
                  </button>

                  <button
                    onClick={() =>
                      setShowProfileModal(
                        false
                      )
                    }
                    className="rounded-xl bg-slate-300 px-6 py-3 font-bold transition-all hover:bg-slate-400 hover:-translate-y-0.5 active:scale-95"
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            EDIT STAFF MODAL
        ====================================================== */}

        {showEditModal &&
          editingStaff && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">

              <div className="relative w-full max-w-5xl rounded-[28px] bg-white shadow-[0_35px_90px_rgba(0,0,0,0.25)] overflow-hidden">

                <div className="flex items-center justify-between border-b border-slate-200 px-10 py-7">

                  <div className="flex items-center gap-5">

                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">
                      👤
                    </div>

                    <div>

                      <h2 className="text-3xl font-bold text-slate-900">
                        Edit Staff
                      </h2>

                      <p className="text-slate-400 mt-1">
                        Update employee information.
                      </p>

                    </div>

                  </div>

                  <button
                    onClick={() => {
                      setShowEditModal(
                        false
                      );

                      setEditingStaff(
                        null
                      );
                    }}
                    className="w-11 h-11 rounded-xl border border-slate-200 hover:bg-slate-100 text-xl transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    ✕
                  </button>

                </div>

                <div className="px-10 py-8">

                  <div className="flex flex-col items-center mb-10">

                    <img
                      src={
                        editingStaff.photo_url ||
                        "https://placehold.co/180x180?text=Photo"
                      }
                      alt="Staff"
                      className="w-40 h-40 rounded-full object-cover border-[5px] border-slate-200 shadow-sm"
                    />

                    <label className="mt-5">

                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          if (
                            e.target.files?.[0]
                          ) {
                            uploadStaffPhoto(
                              e.target.files[0]
                            );
                          }
                        }}
                      />

                      <span className="cursor-pointer rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 font-semibold inline-block shadow-md transition-all hover:-translate-y-0.5 hover:shadow-blue-500/20 active:scale-95">

                        {uploadingPhoto
                          ? "Uploading..."
                          : "Choose Photo"}

                      </span>

                    </label>

                  </div>

                  {/* ==========================
    CV DOCUMENT
========================== */}

<div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">

  <div className="flex items-center justify-between gap-4">

    <div>

      <p className="text-sm font-bold text-slate-800">
        Staff CV
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {editingStaff.cv_url
          ? "A CV is currently attached to this staff record."
          : "No CV has been uploaded for this staff member."}
      </p>

    </div>

    {editingStaff.cv_url && (
      <a
        href={
          editingStaff.cv_url
        }
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-800"
      >
        View Current CV
      </a>
    )}

  </div>

  <div className="mt-5">

    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Replace CV
    </label>

    <input
      type="file"
      accept=".pdf"
      onChange={(e) => {
        const file =
          e.target.files?.[0] ||
          null;

        if (file) {
          setEditingStaff({
            ...editingStaff,
            new_cv_file: file,
          });
        }
      }}
      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
    />

    {editingStaff.new_cv_file && (
      <p className="mt-2 text-sm font-semibold text-blue-700">
        New CV selected:{" "}
        {editingStaff.new_cv_file.name}
      </p>
    )}

  </div>

</div>

                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Full Name
                      </label>

                      <input
                        type="text"
                        value={
                          editingStaff.full_name
                        }
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            full_name:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                      />

                    </div>

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number
                      </label>

                      <input
                        type="text"
                        value={
                          editingStaff.phone_number
                        }
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            phone_number:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                      />

                    </div>

<div>

  <label className="block text-sm font-semibold text-slate-700 mb-2">
    Department
  </label>

  <select
    value={
      editingStaff.department ||
      ""
    }
    onChange={(e) =>
      setEditingStaff({
        ...editingStaff,
        department:
          e.target.value,
      })
    }
    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
  >

    <option value="">
      Select Department
    </option>

    {DEPARTMENTS.map(
      (dept) => (
        <option
          key={dept}
          value={dept}
        >
          {dept}
        </option>
      )
    )}

  </select>

</div>

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Position
                      </label>

                      <input
                        type="text"
                        value={
                          editingStaff.position ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            position:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                      />

                    </div>

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Salary
                      </label>

                      <input
                        type="number"
                        value={
                          editingStaff.salary ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            salary:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                      />

                    </div>

                    <div>

  <label className="block text-sm font-semibold text-slate-700 mb-2">
    Gender
  </label>

  <select
    value={
      editingStaff.gender ||
      ""
    }
    onChange={(e) =>
      setEditingStaff({
        ...editingStaff,
        gender:
          e.target.value,
      })
    }
    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
  >

    <option value="">
      Select Gender
    </option>

    <option value="Male">
      Male
    </option>

    <option value="Female">
      Female
    </option>

  </select>

</div>

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Employment Status
                      </label>

                      <select
                        value={
                          editingStaff.employment_status ||
                          "Active"
                        }
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            employment_status:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                      >

                        <option value="Active">
                          🟢 Active
                        </option>

                        <option value="On Leave">
                          🟡 On Leave
                        </option>

                        <option value="Suspended">
                          🟠 Suspended
                        </option>

                        <option value="Terminated">
                          🔴 Terminated
                        </option>

                        <option value="Resigned">
                          ⚫ Resigned
                        </option>

                        <option value="Retired">
                          🔵 Retired
                        </option>

                      </select>

                    </div>

                  </div>

                  <div className="mt-12 border-t border-slate-200 pt-8 flex items-center justify-end gap-4">

                    <button
                      onClick={() => {
                        setShowEditModal(
                          false
                        );

                        setEditingStaff(
                          null
                        );
                      }}
                      className="px-8 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={
                        updateStaff
                      }
                      className="px-10 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95"
                    >
                      💾 Save Changes
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