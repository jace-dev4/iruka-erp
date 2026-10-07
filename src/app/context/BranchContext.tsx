"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Branch = {
  id: string;
  branch_code: string;
  branch_name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

type BranchContextType = {
  branches: Branch[];
  currentBranch: Branch | null;
  currentBranchId: string | null;

  loading: boolean;

  canAccessAllBranches: boolean;
  isAllBranches: boolean;

  setCurrentBranch: (branchId: string) => void;
  selectAllBranches: () => void;

  refreshBranches: () => Promise<void>;
};

/* =========================================================
   CONTEXT
========================================================= */

const BranchContext =
  createContext<BranchContextType | undefined>(
    undefined
  );

/* =========================================================
   STORAGE KEYS
========================================================= */

const CURRENT_BRANCH_KEY =
  "iruka_current_branch_id";

const ALL_BRANCHES_KEY =
  "iruka_all_branches";

/* =========================================================
   PROVIDER
========================================================= */

export function BranchProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);

  const [currentBranch, setCurrentBranchState] =
    useState<Branch | null>(null);

  const [currentBranchId, setCurrentBranchId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [canAccessAllBranches, setCanAccessAllBranches] =
    useState(false);

  const [isAllBranches, setIsAllBranches] =
    useState(false);

  /* =======================================================
     LOAD BRANCHES
  ======================================================= */

  async function refreshBranches() {
    try {
      setLoading(true);

      /* -----------------------------------------------
         GET AUTHENTICATED USER
      ------------------------------------------------ */

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setBranches([]);
        setCurrentBranchState(null);
        setCurrentBranchId(null);
        setCanAccessAllBranches(false);
        setIsAllBranches(false);
        return;
      }

      const userId = authData.user.id;

      /* -----------------------------------------------
         GET ERP USER
      ------------------------------------------------ */

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select(
          "id, role, branch_id, access_all_branches"
        )
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error(
          "BranchContext user lookup error:",
          userError
        );

        return;
      }

      if (!userData) {
        console.error(
          "BranchContext: ERP user record not found."
        );

        return;
      }

      /* -----------------------------------------------
         CHECK ALL-BRANCH ACCESS
      ------------------------------------------------ */

      const hasAllBranchAccess =
        userData.access_all_branches === true;

      setCanAccessAllBranches(
        hasAllBranchAccess
      );

      /* -----------------------------------------------
         LOAD ACTIVE BRANCHES
      ------------------------------------------------ */

      const {
        data: branchData,
        error: branchError,
      } = await supabase
        .from("branches")
        .select(
          "id, branch_code, branch_name, location, phone, email, is_active"
        )
        .eq("is_active", true)
        .order("branch_code", {
          ascending: true,
        });

      if (branchError) {
        console.error(
          "BranchContext branch lookup error:",
          branchError
        );

        return;
      }

      const allBranches: Branch[] =
        (branchData ?? []) as Branch[];

      /* -----------------------------------------------
         ALL BRANCH ACCESS
      ------------------------------------------------ */

      if (hasAllBranchAccess) {
        setBranches(allBranches);

        const savedAll =
          localStorage.getItem(
            ALL_BRANCHES_KEY
          );

        const savedBranch =
          localStorage.getItem(
            CURRENT_BRANCH_KEY
          );

        /* -------------------------------------------
           IF USER PREVIOUSLY SELECTED ALL
        -------------------------------------------- */

        if (savedAll === "true") {
          setIsAllBranches(true);
          setCurrentBranchState(null);
          setCurrentBranchId(null);
          return;
        }

        /* -------------------------------------------
           IF USER PREVIOUSLY SELECTED A BRANCH
        -------------------------------------------- */

        if (savedBranch) {
          const selectedBranch =
            allBranches.find(
              (branch) =>
                branch.id === savedBranch
            );

          if (selectedBranch) {
            setCurrentBranchState(
              selectedBranch
            );

            setCurrentBranchId(
              selectedBranch.id
            );

            setIsAllBranches(false);

            return;
          }
        }

        /* -------------------------------------------
           DEFAULT TO FIRST BRANCH
        -------------------------------------------- */

        if (allBranches.length > 0) {
          const firstBranch =
            allBranches[0];

          setCurrentBranchState(
            firstBranch
          );

          setCurrentBranchId(
            firstBranch.id
          );

          setIsAllBranches(false);

          localStorage.setItem(
            CURRENT_BRANCH_KEY,
            firstBranch.id
          );

          localStorage.setItem(
            ALL_BRANCHES_KEY,
            "false"
          );
        }

        return;
      }

      /* =================================================
         NORMAL USER
      ================================================= */

      let assignedBranchIds: string[] = [];

      /* -----------------------------------------------
         GET USER BRANCH ASSIGNMENTS
      ------------------------------------------------ */

      const {
        data: userBranches,
        error: userBranchesError,
      } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", userId);

      if (userBranchesError) {
        console.warn(
          "BranchContext user_branches lookup warning:",
          userBranchesError
        );
      }

      if (userBranches?.length) {
        assignedBranchIds =
          userBranches
            .map(
              (item) => item.branch_id
            )
            .filter(
              (id): id is string =>
                typeof id === "string"
            );
      }

      /* -----------------------------------------------
         FALLBACK TO users.branch_id
      ------------------------------------------------ */

      if (
        assignedBranchIds.length === 0 &&
        userData.branch_id
      ) {
        assignedBranchIds = [
          userData.branch_id,
        ];
      }

      /* -----------------------------------------------
         FILTER BRANCHES USER CAN ACCESS
      ------------------------------------------------ */

      const allowedBranches =
        allBranches.filter(
          (branch) =>
            assignedBranchIds.includes(
              branch.id
            )
        );

      setBranches(
        allowedBranches
      );

      /* -----------------------------------------------
         NORMAL USER CANNOT USE ALL BRANCHES
      ------------------------------------------------ */

      setIsAllBranches(false);

      localStorage.setItem(
        ALL_BRANCHES_KEY,
        "false"
      );

      /* -----------------------------------------------
         RESTORE SAVED BRANCH
      ------------------------------------------------ */

      const savedBranch =
        localStorage.getItem(
          CURRENT_BRANCH_KEY
        );

      if (savedBranch) {
        const selectedBranch =
          allowedBranches.find(
            (branch) =>
              branch.id === savedBranch
          );

        if (selectedBranch) {
          setCurrentBranchState(
            selectedBranch
          );

          setCurrentBranchId(
            selectedBranch.id
          );

          return;
        }
      }

      /* -----------------------------------------------
         DEFAULT TO FIRST ASSIGNED BRANCH
      ------------------------------------------------ */

      if (
        allowedBranches.length > 0
      ) {
        const firstBranch =
          allowedBranches[0];

        setCurrentBranchState(
          firstBranch
        );

        setCurrentBranchId(
          firstBranch.id
        );

        localStorage.setItem(
          CURRENT_BRANCH_KEY,
          firstBranch.id
        );
      } else {
        setCurrentBranchState(null);
        setCurrentBranchId(null);
      }
    } catch (error) {
      console.error(
        "BranchContext error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    refreshBranches();
  }, []);

  /* =======================================================
     SELECT BRANCH
  ======================================================= */

  function setCurrentBranch(
    branchId: string
  ) {
    const branch =
      branches.find(
        (item) =>
          item.id === branchId
      );

    if (!branch) {
      console.error(
        "Branch not available:",
        branchId
      );

      return;
    }

    setCurrentBranchState(
      branch
    );

    setCurrentBranchId(
      branch.id
    );

    setIsAllBranches(false);

    localStorage.setItem(
      CURRENT_BRANCH_KEY,
      branch.id
    );

    localStorage.setItem(
      ALL_BRANCHES_KEY,
      "false"
    );
  }

  /* =======================================================
     SELECT ALL BRANCHES
  ======================================================= */

  function selectAllBranches() {
    if (!canAccessAllBranches) {
      console.warn(
        "User does not have access to all branches."
      );

      return;
    }

    setCurrentBranchState(null);

    setCurrentBranchId(null);

    setIsAllBranches(true);

    localStorage.removeItem(
      CURRENT_BRANCH_KEY
    );

    localStorage.setItem(
      ALL_BRANCHES_KEY,
      "true"
    );
  }

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        currentBranchId,
        loading,
        canAccessAllBranches,
        isAllBranches,
        setCurrentBranch,
        selectAllBranches,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useBranch() {
  const context =
    useContext(BranchContext);

  if (!context) {
    throw new Error(
      "useBranch must be used inside a BranchProvider"
    );
  }

  return context;
}