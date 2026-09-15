"use client";

import { useEffect, useState } from "react";

import ProtectedRoute from "@/components/ProtectedRoute";

import { supabase } from "@/lib/supabase";

import ProductionForm from "@/components/production/ProductionForm";

import RecipePreview from "@/components/production/RecipePreview";

export default function ProductionPage() {

  /* =========================
     STATES
  ========================== */

  const [products, setProducts] = useState<any[]>([]);

  const [productionLogs, setProductionLogs] =
    useState<any[]>([]);

  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState("");

  const [shift, setShift] = useState("Morning");

  const [quantityProduced, setQuantityProduced] =
    useState("");

  const [doughBatches, setDoughBatches] =
    useState("");

  const [selectedProduction, setSelectedProduction] =
    useState<any>(null);

  const [showProductionDetails, setShowProductionDetails] =
    useState(false);

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyLimit, setHistoryLimit] =
    useState(10);

  /* =========================
     STORE CONFIRMATION
  ========================== */

  const [confirmationReceived, setConfirmationReceived] =
    useState("");

  const [confirmationDamage, setConfirmationDamage] =
    useState("");

  const [confirming, setConfirming] =
    useState(false);

  /* =========================
     KPI DATE FILTER
  ========================== */

  const getLocalDate = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const [selectedKpiDate, setSelectedKpiDate] =
    useState(getLocalDate());

  /* =========================
     PREMIUM NOTIFICATIONS
  ========================== */

  const [notification, setNotification] =
    useState<{
      type: "success" | "error" | "info";
      title: string;
      message: string;
    } | null>(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [productionToDelete, setProductionToDelete] =
    useState<any>(null);

  const [deleting, setDeleting] =
    useState(false);

  const selectedProductData = products.find(
    (product) => product.name === selectedProduct
  );

  const selectedRecipeName =
    selectedProductData?.recipe_name || "";

  /* =========================
     NOTIFICATION HELPER
  ========================== */

  function showNotification(
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) {
    setNotification({
      type,
      title,
      message,
    });

    setTimeout(() => {
      setNotification(null);
    }, 4500);
  }

  /* =========================
     LOAD DATA
  ========================== */

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================
     SUPABASE REALTIME
  ========================== */

  useEffect(() => {
    const channel =
      supabase
        .channel("production-page-realtime")

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "production_logs",
          },
          async () => {
            await fetchData();
          }
        )

        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {

    /* PRODUCTS */

    const {
      data: productsData,
      error: productsError,
    } = await supabase
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (productsError) {
      console.error(
        "Products fetch error:",
        productsError
      );
    }

    /* PRODUCTION LOGS */

    const {
      data: productionData,
      error: productionError,
    } = await supabase
      .from("production_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (productionError) {
      console.error(
        "Production logs fetch error:",
        productionError
      );
    }

    console.log(
      "Production Logs:",
      productionData
    );

    setProducts(productsData || []);

    setProductionLogs(
      productionData || []
    );
  }

  /* =========================
     MANUAL REFRESH
  ========================== */

  async function handleRefresh() {

    if (refreshing) return;

    setRefreshing(true);

    try {

      await fetchData();

      showNotification(
        "success",
        "Production Refreshed",
        "Production records and KPI figures are now up to date."
      );

    } catch (error: any) {

      console.error(
        "Production refresh error:",
        error
      );

      showNotification(
        "error",
        "Refresh Failed",
        error?.message ||
        "Unable to refresh production data."
      );

    } finally {

      setRefreshing(false);

    }
  }

  /* =========================
     SAVE PRODUCTION
  ========================== */

  async function saveProduction() {

    if (saving) return;

    if (!selectedProduct || !quantityProduced) {

      showNotification(
        "error",
        "Incomplete Production",
        "Please fill all required production fields."
      );

      return;
    }

    const batches = Number(
      doughBatches || 0
    );

    const produced = Number(
      quantityProduced || 0
    );

    if (produced <= 0) {

      showNotification(
        "error",
        "Invalid Quantity",
        "Production quantity must be greater than 0."
      );

      return;
    }

    if (batches <= 0) {

      showNotification(
        "error",
        "Invalid Dough Batches",
        "Dough batches must be greater than 0."
      );

      return;
    }

    setSaving(true);

    try {

      /* =========================
         SELECTED PRODUCT
      ========================== */

      const product = products.find(
        (item) => item.name === selectedProduct
      );

      if (!product) {
        throw new Error(
          "Selected product was not found."
        );
      }

      /* =========================
         RECIPE MAPPING
      ========================== */

      let recipeName = "";

      if (
        [
          "Small Iruka",
          "Medium Iruka",
          "Classic Iruka",
          "Jumbo Iruka",
          "Big Smart",
        ].includes(selectedProduct)
      ) {

        recipeName = "Iruka Recipe";

      } else if (
        [
          "Small Rosy",
          "Medium Rosy",
          "Big Brother Family",
        ].includes(selectedProduct)
      ) {

        recipeName = "White Recipe";

      } else if (
        [
          "Classic Fruits",
          "Jumbo Fruits",
        ].includes(selectedProduct)
      ) {

        recipeName = "Fruits Recipe";

      }

      if (!recipeName) {

        throw new Error(
          "Recipe mapping not found."
        );

      }

      /* =========================
         GET INVENTORY
      ========================== */

      const {
        data: inventory,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select("*");

      if (inventoryError) {

        throw new Error(
          inventoryError.message
        );

      }

      /* =========================
         FIND MATERIALS
      ========================== */

      const flour = inventory?.find(
        (item) => item.name === "Flour"
      );

      const sugar = inventory?.find(
        (item) => item.name === "Sugar"
      );

      const butter = inventory?.find(
        (item) => item.name === "Butter"
      );

      const yeast = inventory?.find(
        (item) => item.name === "Yeast"
      );

      const groundnutOil = inventory?.find(
        (item) => item.name === "Groundnut Oil"
      );

      const resins = inventory?.find(
        (item) => item.name === "Resins"
      );

      const recipeInventory = inventory?.find(
        (item) => item.name === recipeName
      );

      const brown = inventory?.find(
        (item) => item.name === "Brown"
      );

      const flavour = inventory?.find(
        (item) => item.name === "Flavour"
      );

      const tape = inventory?.find(
        (item) => item.name === "Tape"
      );

      const twist = inventory?.find(
        (item) => item.name === "Twist"
      );

      /* =========================
         PRODUCT-SPECIFIC NYLON
      ========================== */

      const nylonNameMap: Record<string, string> = {

        "Small Iruka":
          "Small Iruka Nylon",

        "Small Rosy":
          "Small Rosy Nylon",

        "Medium Iruka":
          "Medium Iruka Nylon",

        "Medium Rosy":
          "Medium Rosy Nylon",

        "Big Smart":
          "Big Smart Nylon",

        "Classic Iruka":
          "Classic Iruka Nylon",

        "Classic Fruits":
          "Classic Fruits Nylon",

        "Jumbo Iruka":
          "Jumbo Iruka Nylon",

        "Jumbo Fruits":
          "Jumbo Fruits Nylon",

        "Big Brother Family":
          "Big Brother Family Nylon",

      };

      const nylonName =
        nylonNameMap[selectedProduct];

      const nylon =
        inventory?.find(
          (item) =>
            item.name === nylonName
        );

      /* =========================
         AUTOMATIC MATERIAL CALCULATIONS
         DO NOT CHANGE
      ========================== */

      const flourNeeded =
        batches * 2;

      const sugarNeeded =
        (batches * 12) / 50;

      const butterNeeded =
        (batches * 1.6) / 15;

      const yeastNeeded =
        batches;

      const groundnutOilNeeded =
        (batches * 0.23) / 23;

      /* =========================
         RECIPE PACK
      ========================== */

      const recipeNeeded =
        batches;

      /* =========================
         BROWN
      ========================== */

      const brownNeeded =
        [
          "Small Iruka",
          "Big Smart",
          "Medium Iruka",
          "Classic Iruka",
          "Jumbo Iruka",
        ].includes(selectedProduct)
          ? batches * 0.5
          : 0;

      /* =========================
         FLAVOUR
      ========================== */

      const flavourNeeded =
        batches * 0.25;

      /* =========================
         TAPE
      ========================== */

      const tapeNeeded =
        [
          "Small Iruka",
          "Small Rosy",
        ].includes(selectedProduct)
          ? batches * 0.8181
          : 0;

      /* =========================
         TWIST
      ========================== */

      const twistNeeded =
        [
          "Big Smart",
          "Medium Rosy",
          "Medium Iruka",
          "Jumbo Fruits",
          "Jumbo Iruka",
          "Classic Fruits",
          "Classic Iruka",
          "Big Brother Family",
        ].includes(selectedProduct)
          ? produced / 600
          : 0;

      /* =========================
         NYLON
      ========================== */

      const nylonNeeded =
        produced;

      /* =========================
         RESINS
      ========================== */

      const resinNeededKg =
        [
          "Small Rosy",
          "Classic Fruits",
          "Jumbo Fruits",
          "Big Brother Family",
        ].includes(selectedProduct)
          ? batches
          : 0;

      const resinNeededCartons =
        resinNeededKg / 10;

      /* =========================
         INVENTORY VALIDATION
      ========================== */

      const requiredMaterials = [

        {
          item: flour,
          name: "Flour",
          amount: flourNeeded,
        },

        {
          item: sugar,
          name: "Sugar",
          amount: sugarNeeded,
        },

        {
          item: butter,
          name: "Butter",
          amount: butterNeeded,
        },

        {
          item: yeast,
          name: "Yeast",
          amount: yeastNeeded,
        },

        {
          item: groundnutOil,
          name: "Groundnut Oil",
          amount: groundnutOilNeeded,
        },

        {
          item: recipeInventory,
          name: recipeName,
          amount: recipeNeeded,
        },

        {
          item: flavour,
          name: "Flavour",
          amount: flavourNeeded,
        },

        {
          item: nylon,
          name: nylonName,
          amount: nylonNeeded,
        },

        ...(brownNeeded > 0
          ? [
              {
                item: brown,
                name: "Brown",
                amount: brownNeeded,
              },
            ]
          : []),

        ...(tapeNeeded > 0
          ? [
              {
                item: tape,
                name: "Tape",
                amount: tapeNeeded,
              },
            ]
          : []),

        ...(twistNeeded > 0
          ? [
              {
                item: twist,
                name: "Twist",
                amount: twistNeeded,
              },
            ]
          : []),

        ...(resinNeededCartons > 0
          ? [
              {
                item: resins,
                name: "Resins",
                amount: resinNeededCartons,
              },
            ]
          : []),

      ];

      /* =========================
         CHECK MATERIALS EXIST
      ========================== */

      for (
        const material of requiredMaterials
      ) {

        if (!material.item) {

          throw new Error(
            `${material.name} inventory item not found.`
          );

        }

      }

      /* =========================
         CHECK ENOUGH STOCK
      ========================== */

      for (
        const material of requiredMaterials
      ) {

        const available =
          Number(
            material.item.quantity || 0
          );

        if (
          available <
          material.amount
        ) {

          throw new Error(
            `Not enough ${material.name}. Required: ${material.amount}, Available: ${available}`
          );

        }

      }

      /* =========================
         CREATE BATCH NUMBER
      ========================== */

      const batchNumber =
        `IRK-${new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "")}-${Math.floor(
          Math.random() * 900 + 100
        )}`;

      /* =========================
         1. INSERT PRODUCTION LOG
         
         IMPORTANT:
         No production waste is recorded here.
      ========================== */

      const {
        data: productionData,
        error: productionError,
      } = await supabase
        .from("production_logs")
        .insert([
          {
            product_id: product.id,

            bread: selectedProduct,

            quantity: produced,

            /*
             * Kept at zero for compatibility with
             * existing production_logs records.
             *
             * New damage is recorded during
             * Store Confirmation.
             */
            waste_quantity: 0,

            dough_batches: batches,

            produced_by: "Production Staff",

            batch: batchNumber,

            shift: shift,

            team: "A",

            status: "Completed",

            production_date:
              getLocalDate(),

            received_quantity: 0,

            confirmation_damage: 0,

            confirmation_status: "Pending",

            confirmed_at: null,

            confirmed_by: null,
          },
        ])
        .select()
        .single();

      if (productionError) {

        throw new Error(
          `Production save failed: ${productionError.message}`
        );

      }

      console.log(
        "Production created:",
        productionData
      );

      /*
       * IMPORTANT:
       *
       * Finished goods are NOT added to store
       * stock at this stage.
       *
       * Stock will be added only when the
       * Store Confirmation is completed.
       */

      /* =========================
         2. AUTOMATICALLY DEDUCT
            ALL PRODUCTION MATERIALS
         
         DO NOT CHANGE
      ========================== */

      for (
        const material of requiredMaterials
      ) {

        const newQuantity =
          Number(
            material.item.quantity || 0
          ) -
          material.amount;

        const {
          error: deductionError,
        } = await supabase
          .from("inventory")
          .update({
            quantity: newQuantity,
          })
          .eq("id", material.item.id);

        if (deductionError) {

          throw new Error(
            `Failed to deduct ${material.name}: ${deductionError.message}`
          );

        }

      }

      /* =========================
         3. INVENTORY HISTORY
         
         DO NOT CHANGE
      ========================== */

      const inventoryTransactions =
        requiredMaterials.map(
          (material) => ({

            material_name:
              material.name,

            quantity_used:
              material.amount,

            transaction_type:
              "AUTO_DEDUCTION",

            reference:
              `${selectedProduct} Production - ${batchNumber}`,

            created_at:
              new Date().toISOString(),

          })
        );

      const {
        error: transactionError,
      } = await supabase
        .from("inventory_transactions")
        .insert(
          inventoryTransactions
        );

      if (transactionError) {

        throw new Error(
          `Inventory history failed: ${transactionError.message}`
        );

      }

      /* =========================
         4. REFRESH DATA
      ========================== */

      await fetchData();

      /* =========================
         5. RESET FORM
      ========================== */

      setSelectedProduct("");

      setQuantityProduced("");

      setDoughBatches("");

      setShift("Morning");

      showNotification(
        "success",
        "Production Uploaded",
        `${selectedProduct} production was recorded successfully. Raw materials have been automatically deducted. The production is now waiting for Store Confirmation.`
      );

    } catch (error: any) {

      console.error(
        "Production upload error:",
        error
      );

      showNotification(
        "error",
        "Production Upload Failed",
        error?.message ||
        "Failed to upload production."
      );

    } finally {

      setSaving(false);

    }
  }

  /* =========================
     STORE CONFIRMATION
  ========================== */

  const pendingProductions =
    productionLogs.filter(
      (log) =>
        log.confirmation_status !==
        "Confirmed"
    );

  function openConfirmation(
    log: any
  ) {

    setSelectedProduction(log);

    setConfirmationReceived("");

    setConfirmationDamage("");

    setShowProductionDetails(true);
  }

  async function confirmProduction() {

    if (confirming) return;

    const log =
      selectedProduction;

    if (!log) return;

    const produced =
      Number(
        log.quantity || 0
      );

    const received =
      Number(
        confirmationReceived || 0
      );

    const damage =
      Number(
        confirmationDamage || 0
      );

    if (received < 0 || damage < 0) {

      showNotification(
        "error",
        "Invalid Confirmation",
        "Received and damaged quantities cannot be negative."
      );

      return;
    }

    if (
      received +
      damage >
      produced
    ) {

      showNotification(
        "error",
        "Invalid Quantities",
        `Received plus damaged pieces cannot exceed the ${produced.toLocaleString()} pieces produced.`
      );

      return;
    }

    const missing =
      produced -
      received -
      damage;

    setConfirming(true);

    try {

      /* =========================
         GET CURRENT PRODUCT
      ========================== */

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("id", log.product_id)
        .single();

      if (
        productError ||
        !product
      ) {

        throw new Error(
          "Finished product was not found."
        );

      }

      /* =========================
         ADD ONLY RECEIVED
         TO FINISHED GOODS STOCK
      ========================== */

      const currentStock =
        Number(
          product.stock || 0
        );

      const newStock =
        currentStock +
        received;

      const {
        error: stockError,
      } = await supabase
        .from("products")
        .update({
          stock: newStock,
        })
        .eq(
          "id",
          product.id
        );

      if (stockError) {

        throw new Error(
          `Failed to update ${log.bread} stock: ${stockError.message}`
        );

      }

      /* =========================
         UPDATE PRODUCTION LOG
      ========================== */

      const {
        error: confirmationError,
      } = await supabase
        .from("production_logs")
        .update({
          received_quantity:
            received,

          confirmation_damage:
            damage,

          confirmation_status:
            "Confirmed",

          confirmed_at:
            new Date().toISOString(),

          confirmed_by:
            "Store",
        })
        .eq(
          "id",
          log.id
        );

      if (confirmationError) {

        /*
         * If the confirmation update fails,
         * reverse the stock addition so we
         * don't leave inconsistent finished stock.
         */
        await supabase
          .from("products")
          .update({
            stock: currentStock,
          })
          .eq(
            "id",
            product.id
          );

        throw new Error(
          `Production confirmation failed: ${confirmationError.message}`
        );

      }

      await fetchData();

      setSelectedProduction(null);

      setShowProductionDetails(false);

      setConfirmationReceived("");

      setConfirmationDamage("");

      showNotification(
        "success",
        "Production Confirmed",
        `${log.bread}: ${received.toLocaleString()} received, ${damage.toLocaleString()} damaged and ${missing.toLocaleString()} missing.`
      );

    } catch (error: any) {

      console.error(
        "Production confirmation error:",
        error
      );

      showNotification(
        "error",
        "Confirmation Failed",
        error?.message ||
        "Failed to confirm production."
      );

    } finally {

      setConfirming(false);

    }
  }

  /* =========================
     DELETE PRODUCTION
  ========================== */

  function requestDeleteProduction(
    log: any
  ) {

    setProductionToDelete(log);

    setShowDeleteModal(true);
  }

  async function deleteProduction() {

    const log =
      productionToDelete;

    if (!log || deleting) return;

    setDeleting(true);

    try {

      /* =========================
         BASIC VALUES
      ========================== */

      const batches =
        Number(
          log.dough_batches || 0
        );

      const produced =
        Number(
          log.quantity || 0
        );

      /*
       * NEW WORKFLOW:
       *
       * If confirmed, only the quantity
       * actually received was added to
       * finished goods stock.
       *
       * If pending, nothing was added.
       */
      const received =
        Number(
          log.received_quantity || 0
        );

      if (batches <= 0) {

        throw new Error(
          "Invalid dough batch value."
        );

      }

      if (produced <= 0) {

        throw new Error(
          "Invalid production quantity."
        );

      }

      /* =========================
         FIND PRODUCT
      ========================== */

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("id", log.product_id)
        .single();

      if (
        productError ||
        !product
      ) {

        throw new Error(
          "Finished product not found."
        );

      }

      /* =========================
         RECIPE MAPPING
      ========================== */

      let recipeName = "";

      if (
        [
          "Small Iruka",
          "Medium Iruka",
          "Classic Iruka",
          "Jumbo Iruka",
          "Big Smart",
        ].includes(log.bread)
      ) {

        recipeName =
          "Iruka Recipe";

      } else if (
        [
          "Small Rosy",
          "Medium Rosy",
          "Big Brother Family",
        ].includes(log.bread)
      ) {

        recipeName =
          "White Recipe";

      } else if (
        [
          "Classic Fruits",
          "Jumbo Fruits",
        ].includes(log.bread)
      ) {

        recipeName =
          "Fruits Recipe";

      }

      if (!recipeName) {

        throw new Error(
          `Recipe mapping not found for ${log.bread}.`
        );

      }

      /* =========================
         MATERIAL CALCULATIONS
         SAME AS EXISTING SYSTEM
      ========================== */

      const flourUsed =
        batches * 2;

      const sugarUsed =
        (batches * 12) / 50;

      const butterUsed =
        (batches * 1.6) / 15;

      const yeastUsed =
        batches;

      const groundnutOilUsed =
        (batches * 0.23) / 23;

      const recipeUsed =
        batches;

      const brownUsed =
        [
          "Small Iruka",
          "Big Smart",
          "Medium Iruka",
          "Classic Iruka",
          "Jumbo Iruka",
        ].includes(log.bread)
          ? batches * 0.5
          : 0;

      const flavourUsed =
        batches * 0.25;

      const tapeUsed =
        [
          "Small Iruka",
          "Small Rosy",
        ].includes(log.bread)
          ? batches * 0.8181
          : 0;

      const twistUsed =
        [
          "Big Smart",
          "Medium Rosy",
          "Medium Iruka",
          "Jumbo Fruits",
          "Jumbo Iruka",
          "Classic Fruits",
          "Classic Iruka",
          "Big Brother Family",
        ].includes(log.bread)
          ? produced / 600
          : 0;

      const nylonUsed =
        produced;

      const nylonNameMap:
        Record<string, string> = {

        "Small Iruka":
          "Small Iruka Nylon",

        "Small Rosy":
          "Small Rosy Nylon",

        "Medium Iruka":
          "Medium Iruka Nylon",

        "Medium Rosy":
          "Medium Rosy Nylon",

        "Big Smart":
          "Big Smart Nylon",

        "Classic Iruka":
          "Classic Iruka Nylon",

        "Classic Fruits":
          "Classic Fruits Nylon",

        "Jumbo Iruka":
          "Jumbo Iruka Nylon",

        "Jumbo Fruits":
          "Jumbo Fruits Nylon",

        "Big Brother Family":
          "Big Brother Family Nylon",

      };

      const nylonName =
        nylonNameMap[log.bread];

      if (!nylonName) {

        throw new Error(
          `Nylon mapping not found for ${log.bread}.`
        );

      }

      /* =========================
         RESINS
      ========================== */

      const resinUsedKg =
        [
          "Small Rosy",
          "Classic Fruits",
          "Jumbo Fruits",
          "Big Brother Family",
        ].includes(log.bread)
          ? batches
          : 0;

      const resinUsedCartons =
        resinUsedKg / 10;

      /* =========================
         GET INVENTORY
      ========================== */

      const {
        data: inventory,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select("*");

      if (inventoryError) {

        throw new Error(
          `Failed to load inventory: ${inventoryError.message}`
        );

      }

      /* =========================
         BUILD RESTORATION LIST
      ========================== */

      const materialsToRestore = [

        {
          name: "Flour",
          amount: flourUsed,
        },

        {
          name: "Sugar",
          amount: sugarUsed,
        },

        {
          name: "Butter",
          amount: butterUsed,
        },

        {
          name: "Yeast",
          amount: yeastUsed,
        },

        {
          name: "Groundnut Oil",
          amount: groundnutOilUsed,
        },

        {
          name: recipeName,
          amount: recipeUsed,
        },

        {
          name: "Flavour",
          amount: flavourUsed,
        },

        {
          name: nylonName,
          amount: nylonUsed,
        },

      ];

      if (brownUsed > 0) {

        materialsToRestore.push({
          name: "Brown",
          amount: brownUsed,
        });

      }

      if (tapeUsed > 0) {

        materialsToRestore.push({
          name: "Tape",
          amount: tapeUsed,
        });

      }

      if (twistUsed > 0) {

        materialsToRestore.push({
          name: "Twist",
          amount: twistUsed,
        });

      }

      if (resinUsedCartons > 0) {

        materialsToRestore.push({
          name: "Resins",
          amount:
            resinUsedCartons,
        });

      }

      /* =========================
         VERIFY INVENTORY
      ========================== */

      for (
        const material of
        materialsToRestore
      ) {

        const item =
          inventory?.find(
            (i) =>
              i.name ===
              material.name
          );

        if (!item) {

          throw new Error(
            `${material.name} inventory item not found.`
          );

        }

      }

      /* =========================
         CHECK FINISHED STOCK
         
         ONLY RECEIVED QUANTITY
      ========================== */

      const currentProductStock =
        Number(
          product.stock || 0
        );

      if (
        currentProductStock <
        received
      ) {

        throw new Error(
          `Cannot delete this production.\n\n` +
          `Current ${log.bread} stock: ${currentProductStock.toLocaleString()}\n` +
          `Stock received from this record: ${received.toLocaleString()}\n\n` +
          `The finished product has already been used.`
        );

      }

      /* =========================
         RESTORE INVENTORY
      ========================== */

      for (
        const material of
        materialsToRestore
      ) {

        const item =
          inventory?.find(
            (i) =>
              i.name ===
              material.name
          );

        if (!item) {

          throw new Error(
            `${material.name} inventory item not found.`
          );

        }

        const newQuantity =
          Number(
            item.quantity || 0
          ) +
          material.amount;

        const {
          error,
        } = await supabase
          .from("inventory")
          .update({
            quantity:
              newQuantity,
          })
          .eq(
            "id",
            item.id
          );

        if (error) {

          throw new Error(
            `Failed to restore ${material.name}: ${error.message}`
          );

        }

      }

      /* =========================
         REVERSE FINISHED PRODUCT
         
         ONLY IF IT WAS RECEIVED
      ========================== */

      if (received > 0) {

        const newProductStock =
          currentProductStock -
          received;

        const {
          error: stockError,
        } = await supabase
          .from("products")
          .update({
            stock:
              newProductStock,
          })
          .eq(
            "id",
            product.id
          );

        if (stockError) {

          throw new Error(
            `Failed to reverse ${log.bread} stock: ${stockError.message}`
          );

        }

      }

      /* =========================
         DELETE PRODUCTION LOG
      ========================== */

      const {
        error: deleteError,
      } = await supabase
        .from("production_logs")
        .delete()
        .eq(
          "id",
          log.id
        );

      if (deleteError) {

        throw new Error(
          `Failed to delete production record: ${deleteError.message}`
        );

      }

      /* =========================
         DELETE INVENTORY HISTORY
      ========================== */

      const {
        error: historyError,
      } = await supabase
        .from("inventory_transactions")
        .delete()
        .eq(
          "reference",
          `${log.bread} Production - ${log.batch}`
        );

      if (historyError) {

        console.error(
          "Inventory history cleanup error:",
          historyError
        );

      }

      /* =========================
         REFRESH EVERYTHING
      ========================== */

      await fetchData();

      setShowDeleteModal(false);

      setProductionToDelete(null);

      showNotification(
        "success",
        "Production Deleted",
        `${log.bread} production was deleted. Production materials have been restored${received > 0 ? " and received finished stock has been reversed" : ""}.`
      );

    } catch (error: any) {

      console.error(
        "Delete production error:",
        error
      );

      showNotification(
        "error",
        "Deletion Failed",
        error?.message ||
        "Failed to delete production."
      );

    } finally {

      setDeleting(false);

    }
  }

/* =========================
   TOTALS
========================= */

/*
 * Use the selected KPI date.
 *
 * We primarily use production_date.
 * The created_at fallback protects against
 * timezone/date differences caused by
 * storing dates with toISOString().
 */
const selectedDateLogs =
  productionLogs.filter((item) => {

    const productionDate =
      item.production_date;

    const createdDate = item.created_at
      ? new Date(item.created_at)
          .toLocaleDateString(
            "en-CA",
            {
              timeZone: "Africa/Lagos",
            }
          )
      : "";

    return (
      productionDate === selectedKpiDate ||
      createdDate === selectedKpiDate
    );
  });

/*
 * Normalize confirmation status so that
 * "Confirmed", "confirmed", or accidental
 * spaces do not prevent the KPI from displaying.
 */
const confirmedDateLogs =
  selectedDateLogs.filter((item) => {

    const status =
      String(
        item.confirmation_status || ""
      )
        .trim()
        .toLowerCase();

    return status === "confirmed";
  });

/* =========================
   TOTAL PRODUCED
========================= */

const totalProduced =
  selectedDateLogs.reduce(
    (sum, item) =>
      sum +
      Number(
        item.quantity || 0
      ),
    0
  );

/* =========================
   TOTAL DAMAGED
========================= */

const totalWaste =
  confirmedDateLogs.reduce(
    (sum, item) =>
      sum +
      Number(
        item.confirmation_damage || 0
      ),
    0
  );

/* =========================
   TOTAL DOUGH BATCHES
========================= */

const totalDoughBatches =
  selectedDateLogs.reduce(
    (sum, item) =>
      sum +
      Number(
        item.dough_batches || 0
      ),
    0
  );

/* =========================
   TOTAL RECEIVED
========================= */

const totalReceived =
  confirmedDateLogs.reduce(
    (sum, item) =>
      sum +
      Number(
        item.received_quantity || 0
      ),
    0
  );

/* =========================
   TOTAL MISSING
========================= */

const totalMissing =
  confirmedDateLogs.reduce(
    (sum, item) => {

      const produced =
        Number(
          item.quantity || 0
        );

      const received =
        Number(
          item.received_quantity || 0
        );

      const damage =
        Number(
          item.confirmation_damage || 0
        );

      const missing =
        produced -
        received -
        damage;

      return (
        sum +
        Math.max(
          0,
          missing
        )
      );
    },
    0
  );

  /* =========================
     SELECTED DATE DISPLAY
  ========================== */

  const selectedDateDisplay =
    new Date(
      `${selectedKpiDate}T00:00:00`
    ).toLocaleDateString(
      "en-GB",
      {
        timeZone: "Africa/Lagos",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  /* =========================
     PRODUCTION HISTORY
  ========================== */

  const filteredHistory =
    productionLogs

      .filter((item) => {

        const search =
          historySearch.toLowerCase();

        return (

          (item.bread || "")
            .toLowerCase()
            .includes(search)

          ||

          (item.batch || "")
            .toLowerCase()
            .includes(search)

          ||

          (item.shift || "")
            .toLowerCase()
            .includes(search)

          ||

          (item.status || "")
            .toLowerCase()
            .includes(search)

          ||

          (item.confirmation_status || "")
            .toLowerCase()
            .includes(search)

        );

      })

      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

  const displayedHistory =
    filteredHistory.slice(
      0,
      historyLimit
    );

  return (

    <ProtectedRoute
      allowedRoles={[
        "admin",
        "accountant",
      ]}
    >

      <div className="min-h-screen bg-[#08111f] -m-6 p-8">

        {/* ==========================================
                    PREMIUM NOTIFICATION
        ========================================== */}

        {notification && (

          <div className="fixed top-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-32px)]">

            <div
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl ${
                notification.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500/30"
                  : notification.type === "error"
                  ? "bg-red-950/95 border-red-500/30"
                  : "bg-blue-950/95 border-blue-500/30"
              }`}
            >

              <div className="p-5">

                <div className="flex items-start gap-4">

                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      notification.type === "success"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : notification.type === "error"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >

                    {notification.type === "success" && (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}

                    {notification.type === "error" && (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}

                    {notification.type === "info" && (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                        />
                      </svg>
                    )}

                  </div>

                  <div className="flex-1">

                    <h3 className="text-white font-bold text-base">
                      {notification.title}
                    </h3>

                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                      {notification.message}
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setNotification(null)
                    }
                    className="text-slate-500 hover:text-white transition"
                  >
                    ✕
                  </button>

                </div>

              </div>

              <div
                className={`h-1 ${
                  notification.type === "success"
                    ? "bg-emerald-500"
                    : notification.type === "error"
                    ? "bg-red-500"
                    : "bg-blue-500"
                }`}
              />

            </div>

          </div>

        )}

        {/* ==========================================
                    PREMIUM DELETE MODAL
        ========================================== */}

        {showDeleteModal &&
          productionToDelete && (

          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-6">

            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => {
                if (!deleting) {
                  setShowDeleteModal(false);
                  setProductionToDelete(null);
                }
              }}
            />

            <div className="relative w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0b1424] shadow-2xl overflow-hidden">

              <div className="p-8">

                <div className="flex items-start gap-5">

                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">

                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h10"
                      />
                    </svg>

                  </div>

                  <div>

                    <h2 className="text-2xl font-black text-white">
                      Delete Production?
                    </h2>

                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                      This action will reverse the production and restore all materials used.
                    </p>

                  </div>

                </div>

                <div className="mt-7 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Product
                    </span>

                    <span className="text-white font-bold text-right">
                      {productionToDelete.bread}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Produced
                    </span>

                    <span className="text-blue-300 font-bold">
                      {Number(
                        productionToDelete.quantity || 0
                      ).toLocaleString()}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Received
                    </span>

                    <span className="text-green-400 font-bold">
                      {Number(
                        productionToDelete.received_quantity || 0
                      ).toLocaleString()}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Damaged
                    </span>

                    <span className="text-red-400 font-bold">
                      {Number(
                        productionToDelete.confirmation_damage || 0
                      ).toLocaleString()}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Missing
                    </span>

                    <span className="text-yellow-400 font-bold">
                      {(
                        Number(
                          productionToDelete.quantity || 0
                        ) -
                        Number(
                          productionToDelete.received_quantity || 0
                        ) -
                        Number(
                          productionToDelete.confirmation_damage || 0
                        )
                      ).toLocaleString()}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 py-2">

                    <span className="text-slate-400">
                      Dough Batches
                    </span>

                    <span className="text-yellow-400 font-bold">
                      {Number(
                        productionToDelete.dough_batches || 0
                      ).toLocaleString()}
                    </span>

                  </div>

                </div>

                <div className="mt-5 rounded-2xl bg-red-500/5 border border-red-500/10 p-4">

                  <p className="text-red-300 text-sm leading-relaxed">

                    <span className="font-bold">
                      Warning:
                    </span>{" "}
                    All production materials deducted by this record will be restored. Any finished stock received from this record will also be reversed.

                  </p>

                </div>

                <div className="flex gap-3 mt-7">

                  <button
                    disabled={deleting}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setProductionToDelete(null);
                    }}
                    className="flex-1 px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={deleting}
                    onClick={deleteProduction}
                    className="flex-1 px-5 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >

                    {deleting ? (

                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>

                    ) : (

                      "Delete Production"

                    )}

                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        {/* ==========================================
                    STORE CONFIRMATION MODAL
        ========================================== */}

        {showProductionDetails &&
          selectedProduction && (

          <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6">

            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => {
                if (!confirming) {
                  setShowProductionDetails(false);
                  setSelectedProduction(null);
                }
              }}
            />

            <div className="relative w-full max-w-2xl rounded-3xl border border-yellow-500/20 bg-[#0b1424] shadow-2xl overflow-hidden">

              <div className="px-8 py-6 border-b border-slate-700">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider">
                      Store Confirmation
                    </p>

                    <h2 className="text-3xl font-black text-white mt-2">
                      {selectedProduction.bread}
                    </h2>

                    <p className="text-slate-400 mt-1">
                      Batch {selectedProduction.batch}
                    </p>

                  </div>

                  <button
                    disabled={confirming}
                    onClick={() => {
                      setShowProductionDetails(false);
                      setSelectedProduction(null);
                    }}
                    className="text-slate-500 hover:text-white text-xl"
                  >
                    ✕
                  </button>

                </div>

              </div>

              <div className="p-8">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">

                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">

                    <p className="text-blue-300 text-xs uppercase">
                      Produced
                    </p>

                    <p className="text-2xl font-black text-white mt-2">
                      {Number(
                        selectedProduction.quantity || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4">

                    <p className="text-yellow-300 text-xs uppercase">
                      Dough
                    </p>

                    <p className="text-2xl font-black text-white mt-2">
                      {Number(
                        selectedProduction.dough_batches || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">

                    <p className="text-orange-300 text-xs uppercase">
                      Shift
                    </p>

                    <p className="text-lg font-black text-white mt-2">
                      {selectedProduction.shift}
                    </p>

                  </div>

                  <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">

                    <p className="text-slate-400 text-xs uppercase">
                      Status
                    </p>

                    <p className="text-lg font-black text-yellow-400 mt-2">
                      Pending
                    </p>

                  </div>

                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">

                  <h3 className="text-xl font-black text-white">
                    Receive Bread Into Store
                  </h3>

                  <p className="text-slate-400 text-sm mt-1">
                    Record the actual quantity physically received from production.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

                    <div>

                      <label className="block text-slate-300 text-sm font-bold mb-2">
                        Received Pieces
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={Number(
                          selectedProduction.quantity || 0
                        )}
                        value={confirmationReceived}
                        disabled={confirming}
                        onChange={(e) =>
                          setConfirmationReceived(
                            e.target.value
                          )
                        }
                        placeholder="Enter received quantity"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg font-bold outline-none focus:border-green-500 disabled:opacity-60"
                      />

                    </div>

                    <div>

                      <label className="block text-slate-300 text-sm font-bold mb-2">
                        Damaged / Waste
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={Number(
                          selectedProduction.quantity || 0
                        )}
                        value={confirmationDamage}
                        disabled={confirming}
                        onChange={(e) =>
                          setConfirmationDamage(
                            e.target.value
                          )
                        }
                        placeholder="Enter damaged pieces"
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-4 text-white text-lg font-bold outline-none focus:border-red-500 disabled:opacity-60"
                      />

                    </div>

                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-800 border border-slate-700 p-5">

                    <div className="flex justify-between py-2">

                      <span className="text-slate-400">
                        Total Produced
                      </span>

                      <span className="text-white font-bold">
                        {Number(
                          selectedProduction.quantity || 0
                        ).toLocaleString()}
                      </span>

                    </div>

                    <div className="flex justify-between py-2">

                      <span className="text-green-400">
                        Received
                      </span>

                      <span className="text-green-400 font-bold">
                        {Number(
                          confirmationReceived || 0
                        ).toLocaleString()}
                      </span>

                    </div>

                    <div className="flex justify-between py-2">

                      <span className="text-red-400">
                        Damaged
                      </span>

                      <span className="text-red-400 font-bold">
                        {Number(
                          confirmationDamage || 0
                        ).toLocaleString()}
                      </span>

                    </div>

                    <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between">

                      <span className="text-yellow-400 font-bold">
                        Missing Pieces
                      </span>

                      <span className="text-yellow-400 font-black text-xl">

                        {(
                          Number(
                            selectedProduction.quantity || 0
                          ) -
                          Number(
                            confirmationReceived || 0
                          ) -
                          Number(
                            confirmationDamage || 0
                          )
                        ).toLocaleString()}

                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex gap-3 mt-7">

                  <button
                    disabled={confirming}
                    onClick={() => {
                      setShowProductionDetails(false);
                      setSelectedProduction(null);
                    }}
                    className="flex-1 px-5 py-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={confirming}
                    onClick={confirmProduction}
                    className="flex-1 px-5 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black transition shadow-lg shadow-yellow-900/20 disabled:opacity-50"
                  >

                    {confirming
                      ? "Confirming..."
                      : "Confirm & Receive Stock"}

                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        {/* ==========================================
                    HEADER
        ========================================== */}

        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-8 mb-10">

          <div>

            <h1 className="text-5xl font-black text-white">
              Production Center
            </h1>

            <p className="text-slate-400 mt-3 text-lg">
              Live bakery production, dough tracking and inventory automation
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group flex items-center gap-3 px-5 py-4 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 text-white font-bold transition-all shadow-xl disabled:opacity-60"
            >

              <svg
                className={`w-5 h-5 transition-transform ${
                  refreshing
                    ? "animate-spin"
                    : "group-hover:rotate-180"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h5M20 20v-5h-5M5.5 9A7.5 7.5 0 0118.9 6.1L20 7M18.5 15A7.5 7.5 0 015.1 17.9L4 17"
                />

              </svg>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}

            </button>

            <div className="bg-slate-900 border border-slate-700 rounded-3xl px-8 py-6">

              <p className="text-slate-400">
                Today
              </p>

              <h2 className="text-2xl font-bold text-white mt-2">

                {new Date().toLocaleDateString(
                  "en-GB",
                  {
                    timeZone: "Africa/Lagos",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}

              </h2>

              <p className="text-yellow-400 mt-3 font-semibold">
                Production Operations
              </p>

            </div>

          </div>

        </div>

        {/* ==========================================
                    KPI DATE FILTER
        ========================================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

          <div>

            <h3 className="text-xl font-bold text-white">
              Production Performance
            </h3>

            <p className="text-slate-400 text-sm mt-1">

              KPI figures are showing production for{" "}

              <span className="text-yellow-400 font-semibold">
                {selectedDateDisplay}
              </span>

            </p>

          </div>

          <div className="flex items-center gap-3">

            <label className="text-slate-400 text-sm font-semibold">
              View Date
            </label>

            <input
              type="date"
              value={selectedKpiDate}
              onChange={(e) =>
                setSelectedKpiDate(
                  e.target.value
                )
              }
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition"
            />

            {selectedKpiDate !==
              getLocalDate() && (

              <button
                onClick={() =>
                  setSelectedKpiDate(
                    getLocalDate()
                  )
                }
                className="px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition"
              >
                Today
              </button>

            )}

          </div>

        </div>

        {/* ==========================================
                    KPI CARDS
        ========================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          {/* Production */}

          <div className="rounded-3xl border border-blue-800 bg-gradient-to-br from-slate-900 to-blue-950 p-7 shadow-xl">

            <p className="text-blue-300 text-sm uppercase tracking-wider">
              Production
            </p>

            <h2 className="text-5xl font-black text-white mt-4">
              {totalProduced.toLocaleString()}
            </h2>

            <p className="text-blue-200 mt-3">
              Pieces Produced
            </p>

          </div>

          {/* Damaged */}

          <div className="rounded-3xl border border-red-800 bg-gradient-to-br from-slate-900 to-red-950 p-7 shadow-xl">

            <p className="text-red-300 text-sm uppercase tracking-wider">
              Damaged
            </p>

            <h2 className="text-5xl font-black text-red-400 mt-4">
              {totalWaste.toLocaleString()}
            </h2>

            <p className="text-red-200 mt-3">
              Confirmed Damaged Pieces
            </p>

          </div>

          {/* Missing */}

          <div className="rounded-3xl border border-yellow-800 bg-gradient-to-br from-slate-900 to-yellow-950 p-7 shadow-xl">

            <p className="text-yellow-300 text-sm uppercase tracking-wider">
              Missing Pieces
            </p>

            <h2 className="text-5xl font-black text-yellow-400 mt-4">
              {totalMissing.toLocaleString()}
            </h2>

            <p className="text-yellow-200 mt-3">
              Unaccounted For
            </p>

          </div>

          {/* Dough Batches */}

          <div className="rounded-3xl border border-yellow-800 bg-gradient-to-br from-slate-900 to-yellow-950 p-7 shadow-xl">

            <p className="text-yellow-300 text-sm uppercase tracking-wider">
              Dough Batches
            </p>

            <h2 className="text-5xl font-black text-yellow-400 mt-4">
              {totalDoughBatches.toLocaleString()}
            </h2>

            <p className="text-yellow-200 mt-3">
              Mixed On Selected Date
            </p>

          </div>

        </div>

        {/* ==========================================
                PRODUCTION WORKSPACE
        ========================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 mb-10">

          {/* RECORD PRODUCTION */}

          <div className="xl:col-span-3 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">

            <div className="px-8 py-6 border-b border-slate-700">

              <h2 className="text-3xl font-bold text-white">
                Record Production
              </h2>

              <p className="text-slate-400 mt-2">
                Upload today's bakery production and automatically update inventory.
              </p>

            </div>

            <div
              className="
                p-8
                [&_button]:transition-all
                [&_button]:duration-200
                [&_button[type='submit']]:rounded-2xl
                [&_button[type='submit']]:font-black
                [&_button[type='submit']]:shadow-lg
                [&_button[type='submit']]:shadow-yellow-900/20
                [&_button[type='submit']]:hover:-translate-y-0.5
              "
            >

              <ProductionForm
                products={products}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                quantityProduced={quantityProduced}
                setQuantityProduced={setQuantityProduced}
                doughBatches={doughBatches}
                setDoughBatches={setDoughBatches}
                shift={shift}
                setShift={setShift}
                saveProduction={saveProduction}
                saving={saving}
              />

            </div>

          </div>

          {/* LIVE RECIPE */}

          <div className="xl:col-span-2 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">

            <div className="px-8 py-6 border-b border-slate-700">

              <h2 className="text-3xl font-bold text-white">
                Live Recipe Preview
              </h2>

              <p className="text-slate-400 mt-2">
                Ingredient deduction before production is uploaded.
              </p>

            </div>

            <div className="p-8">

              <RecipePreview
                selectedProduct={
                  selectedProduct
                }
                doughBatches={
                  doughBatches
                }
                quantityProduced={
                  quantityProduced
                }
                recipeName={
                  selectedRecipeName
                }
              />

            </div>

          </div>

        </div>

        {/* ==========================================
                    STORE CONFIRMATION
        ========================================== */}

        <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mt-10">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-8 py-6 border-b border-slate-700">

            <div>

              <h2 className="text-3xl font-bold text-white">
                Store Confirmation
              </h2>

              <p className="text-slate-400 mt-2">
                Confirm bread received from production and record damaged or missing pieces.
              </p>

            </div>

            <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">

              <span className="text-yellow-400 font-bold">
                {pendingProductions.length} Pending
              </span>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-slate-800">

                <tr>

                  <th className="px-6 py-4 text-left text-slate-300">
                    Product
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Shift
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Produced
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Dough
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Date
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {pendingProductions.length === 0 && (

                  <tr>

                    <td
                      colSpan={6}
                      className="text-center py-16 text-slate-400"
                    >
                      No production is waiting for Store Confirmation.
                    </td>

                  </tr>

                )}

                {pendingProductions.map(
                  (log, index) => (

                    <tr
                      key={
                        log.id ||
                        index
                      }
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                    >

                      <td className="px-6 py-5">

                        <div>

                          <p className="font-bold text-white">
                            {log.bread}
                          </p>

                          <p className="text-xs text-slate-400">
                            {log.batch}
                          </p>

                        </div>

                      </td>

                      <td className="px-6 py-5 text-center">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.shift ===
                            "Morning"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          }`}
                        >
                          {log.shift}
                        </span>

                      </td>

                      <td className="px-6 py-5 text-center text-blue-300 font-bold">

                        {Number(
                          log.quantity || 0
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-5 text-center text-yellow-400 font-bold">

                        {Number(
                          log.dough_batches || 0
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-5 text-center text-slate-300">

                        {log.production_date}

                      </td>

                      <td className="px-6 py-5 text-center">

                        <button
                          onClick={() =>
                            openConfirmation(log)
                          }
                          className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 rounded-xl font-black transition shadow-lg shadow-yellow-950/20"
                        >
                          Confirm Receipt
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ==========================================
                    PRODUCTION HISTORY
        ========================================== */}

        <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mt-10">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-8 py-6 border-b border-slate-700">

            <div>

              <h2 className="text-3xl font-bold text-white">
                Production History
              </h2>

              <p className="text-slate-400 mt-2">
                Latest production uploaded to the database
              </p>

            </div>

            <input
              type="text"
              placeholder="Search product, batch, shift..."
              value={historySearch}
              onChange={(e) =>
                setHistorySearch(
                  e.target.value
                )
              }
              className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white w-full lg:w-80 outline-none focus:border-yellow-500"
            />

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-slate-800">

                <tr>

                  <th className="px-6 py-4 text-left text-slate-300">
                    Product
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Shift
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Dough
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Produced
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Received
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Damaged
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Missing
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Status
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Date
                  </th>

                  <th className="px-6 py-4 text-center text-slate-300">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {displayedHistory.length === 0 && (

                  <tr>

                    <td
                      colSpan={10}
                      className="text-center py-16 text-slate-400"
                    >
                      No production history found.
                    </td>

                  </tr>

                )}

                {displayedHistory.map(
                  (log, index) => {

                    const produced =
                      Number(
                        log.quantity || 0
                      );

                    const received =
                      Number(
                        log.received_quantity || 0
                      );

                    const damage =
                      Number(
                        log.confirmation_damage || 0
                      );

                    const missing =
                      log.confirmation_status ===
                      "Confirmed"
                        ? produced -
                          received -
                          damage
                        : 0;

                    return (

                      <tr
                        key={
                          log.id ||
                          index
                        }
                        className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                      >

                        <td className="px-6 py-5">

                          <div>

                            <p className="font-bold text-white">
                              {log.bread}
                            </p>

                            <p className="text-xs text-slate-400">
                              {log.batch}
                            </p>

                          </div>

                        </td>

                        <td className="px-6 py-5 text-center">

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              log.shift ===
                              "Morning"
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-indigo-500/20 text-indigo-300"
                            }`}
                          >
                            {log.shift}
                          </span>

                        </td>

                        <td className="px-6 py-5 text-center text-yellow-400 font-bold">
                          {log.dough_batches}
                        </td>

                        <td className="px-6 py-5 text-center text-blue-300 font-bold">
                          {produced.toLocaleString()}
                        </td>

                        <td className="px-6 py-5 text-center text-green-400 font-bold">
                          {received.toLocaleString()}
                        </td>

                        <td className="px-6 py-5 text-center text-red-400 font-bold">
                          {damage.toLocaleString()}
                        </td>

                        <td className="px-6 py-5 text-center text-yellow-400 font-black">
                          {missing.toLocaleString()}
                        </td>

                        <td className="px-6 py-5 text-center">

                          {log.confirmation_status ===
                          "Confirmed" ? (

                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold">
                              Confirmed
                            </span>

                          ) : (

                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold">
                              Pending Store
                            </span>

                          )}

                        </td>

                        <td className="px-6 py-5 text-center text-slate-300">

                          {new Date(log.created_at).toLocaleString(
                            "en-NG",
                            {
                              timeZone: "Africa/Lagos",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )}

                        </td>

                        <td className="px-6 py-5 text-center">

                          <button
                            onClick={() =>
                              requestDeleteProduction(
                                log
                              )
                            }
                            className="bg-red-600/90 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold transition shadow-lg shadow-red-950/20"
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>

          </div>

          {filteredHistory.length >
            historyLimit && (

            <div className="p-6 border-t border-slate-700 flex justify-center">

              <button
                onClick={() =>
                  setHistoryLimit(
                    historyLimit + 10
                  )
                }
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-yellow-900/20"
              >
                Load More
              </button>

            </div>

          )}

        </div>

      </div>

    </ProtectedRoute>
  );
}