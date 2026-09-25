interface RecipePreviewProps {
  doughBatches: string;
  quantityProduced: string;
  selectedProduct: string;
  recipeName: string;
}

export default function RecipePreview({
  doughBatches,
  quantityProduced,
  selectedProduct,
  recipeName,
}: RecipePreviewProps) {
  const batches = Number(doughBatches || 0);
  const produced = Number(quantityProduced || 0);

  /* =========================
     BASIC MATERIALS
  ========================== */

  // Flour
  // 2 bags per dough batch
  const flour = batches * 2;

  // Sugar
  // 12kg per batch
  // Inventory is stored in 50kg bags
  const sugarKg = batches * 12;
  const sugarBags = sugarKg / 50;

// Butter
// 1.6kg per dough batch
// Inventory is stored in 15kg units
const butterKg = batches * 1.6;
const butterUnits = butterKg / 15;

  // Yeast
  // 1 inventory unit per batch
  const yeast = batches;

  // Groundnut oil
  // 0.23kg per batch
  // Inventory is stored in 23kg units
  const oilKg = batches * 0.23;
  const oilUnits = oilKg / 23;

  /* =========================
     RECIPE
  ========================== */

  const recipe = batches;

  /* =========================
     FLAVOUR
     0.25 KG PER BATCH
  ========================== */

  const flavour = batches * 0.25;

  /* =========================
     BROWN
     200 GRAMS PER DOUGH BATCH

     PRODUCTION:
     Brown is consumed in KG.

     INVENTORY:
     Brown is stored in BUCKETS.

     1 bucket = 25 KG
     1 KG = 1,000 GRAMS
     200 GRAMS = 0.2 KG

     ONLY:
     Small Iruka
     Big Smart
     Medium Iruka
     Classic Iruka
     Jumbo Iruka
  ========================== */

  const brownGrams =
    [
      "Small Iruka",
      "Big Smart",
      "Medium Iruka",
      "Classic Iruka",
      "Jumbo Iruka",
    ].includes(selectedProduct)
      ? batches * 200
      : 0;

  const brownKg = brownGrams / 1000;

  const brownBuckets = brownKg / 25;
  /* =========================
     TAPE
     0.8181 PACK PER BATCH

     ONLY:
     Small Iruka
     Small Rosy
  ========================== */

  const tape =
    [
      "Small Iruka",
      "Small Rosy",
    ].includes(selectedProduct)
      ? batches * 0.8181
      : 0;

  /* =========================
     TWIST
     1 STRIP PER PIECE

     Inventory:
     600 strips = 1 pack

     Therefore:
     produced / 600 = packs
  ========================== */

  const twist =
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
     RESINS
     1 KG PER DOUGH BATCH

     PRODUCTS:
     Small Rosy
     Classic Fruits
     Jumbo Fruits
     Big Brother Family

     Inventory:
     1 carton = 10 KG
  ========================== */

  const resinKg =
    [
      "Small Rosy",
      "Classic Fruits",
      "Jumbo Fruits",
      "Big Brother Family",
    ].includes(selectedProduct)
      ? batches
      : 0;

  const resinCartons = resinKg / 10;

  /* =========================
     PRODUCT NYLON

     PRODUCTION:
     Nylon is required per PIECE produced.

     INVENTORY:
     Nylon is stored in PACKS.

     Therefore:
     Pieces Produced / Pieces Per Pack
     = Packs Deducted
  ========================== */

  const nylonNameMap: Record<string, string> = {
    "Small Iruka": "Small Iruka Nylon",
    "Small Rosy": "Small Rosy Nylon",
    "Medium Iruka": "Medium Iruka Nylon",
    "Medium Rosy": "Medium Rosy Nylon",
    "Big Smart": "Big Smart Nylon",
    "Classic Iruka": "Classic Iruka Nylon",
    "Classic Fruits": "Classic Fruits Nylon",
    "Jumbo Iruka": "Jumbo Iruka Nylon",
    "Jumbo Fruits": "Jumbo Fruits Nylon",
    "Big Brother Family": "Big Brother Family Nylon",
  };

  const nylonPiecesPerPackMap: Record<string, number> = {
    "Small Iruka": 100,
    "Small Rosy": 100,

    "Medium Iruka": 200,
    "Medium Rosy": 200,

    "Big Smart": 200,

    "Classic Iruka": 200,
    "Classic Fruits": 200,

    "Jumbo Iruka": 200,
    "Jumbo Fruits": 200,

    "Big Brother Family": 100,
  };

  const nylonName =
    nylonNameMap[selectedProduct] || "";

  const nylonPiecesPerPack =
    nylonPiecesPerPackMap[selectedProduct] || 1;

  const nylonPieces = produced;

  const nylonPacks =
    nylonPieces / nylonPiecesPerPack;

  /* =========================
     NO PRODUCT SELECTED
  ========================== */

  if (!selectedProduct) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
        <h2 className="text-3xl font-black text-[#071028]">
          Live Recipe Preview
        </h2>

        <p className="text-gray-500 mt-2">
          Select a product and enter production quantities to see the
          materials that will be automatically deducted.
        </p>

        <div className="mt-8 bg-slate-50 rounded-2xl p-6 text-center">
          <p className="text-slate-500 font-semibold">
            No production selected yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

      {/* =========================
          HEADER
      ========================== */}

      <div className="flex justify-between items-start gap-4">

        <div>
          <h2 className="text-3xl font-black text-[#071028]">
            Live Recipe Preview
          </h2>

          <p className="text-gray-500 mt-2">
            Exact inventory quantities that will be consumed
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">

          <div className="bg-green-100 text-green-700 rounded-2xl px-4 py-2 font-bold">
            {recipeName
              ? `${recipeName} RECIPE`
              : "No Recipe"}
          </div>

          <span className="text-sm text-gray-500">
            {selectedProduct}
          </span>

        </div>
      </div>

      {/* =========================
          PRODUCTION INPUT SUMMARY
      ========================== */}

      <div className="grid grid-cols-2 gap-4 mt-8">

        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-sm text-slate-500">
            Dough Batches
          </p>

          <p className="text-2xl font-black text-slate-900 mt-1">
            {batches.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-sm text-slate-500">
            Pieces Produced
          </p>

          <p className="text-2xl font-black text-slate-900 mt-1">
            {produced.toLocaleString()}
          </p>
        </div>

      </div>

      {/* =========================
          MATERIALS
      ========================== */}

      <div className="mt-8 space-y-4">

        <RecipeRow
          title="Flour"
          value={`${flour.toLocaleString()} Bags`}
        />

        <RecipeRow
          title="Sugar"
          value={`${sugarBags.toFixed(2)} Bags (${sugarKg.toFixed(2)} kg)`}
        />

        <RecipeRow
          title="Butter"
          value={`${butterUnits.toFixed(2)} Units (${butterKg.toFixed(2)} kg)`}
        />

        <RecipeRow
          title="Yeast"
          value={`${yeast.toFixed(2)} Units`}
        />

        <RecipeRow
          title="Groundnut Oil"
          value={`${oilUnits.toFixed(2)} Units (${oilKg.toFixed(2)} kg)`}
        />

        <RecipeRow
          title={recipeName || "Recipe"}
          value={`${recipe.toLocaleString()} Packs`}
        />

        <RecipeRow
          title="Flavour"
          value={`${flavour.toFixed(2)} kg`}
        />

        {/* =========================
            NYLON
        ========================== */}

        {nylonName && (
          <RecipeRow
            title={nylonName}
            value={`${nylonPacks.toFixed(2)} Packs (${nylonPieces.toLocaleString()} Pieces)`}
          />
        )}

        {/* =========================
            BROWN
        ========================== */}

{brownKg > 0 && (
  <RecipeRow
    title="Brown"
    value={`${brownBuckets.toFixed(3)} Buckets (${brownKg.toFixed(2)} kg)`}
  />
)}

        {/* =========================
            TAPE
        ========================== */}

        {tape > 0 && (
          <RecipeRow
            title="Tape"
            value={`${tape.toFixed(4)} Packs`}
          />
        )}

        {/* =========================
            TWIST
        ========================== */}

        {twist > 0 && (
          <RecipeRow
            title="Twist"
            value={`${twist.toFixed(2)} Packs`}
          />
        )}

        {/* =========================
            RESINS
        ========================== */}

        {resinCartons > 0 && (
          <RecipeRow
            title="Resins"
            value={`${resinCartons.toFixed(2)} Cartons (${resinKg.toFixed(2)} kg)`}
          />
        )}

      </div>

      {/* =========================
          BATCH SUMMARY
      ========================== */}

      <div className="mt-10 bg-blue-50 rounded-2xl p-5">

        <p className="text-blue-900 font-bold text-lg">
          {batches} Dough Batch
          {batches !== 1 ? "es" : ""}
        </p>

        <p className="text-gray-600 mt-2">
          These quantities will be deducted automatically from inventory
          when this production is uploaded.
        </p>

      </div>

      {/* =========================
          IMPORTANT NOTICE
      ========================== */}

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">

        <p className="text-amber-800 text-sm font-semibold">
          ⚠ Nylon and Twist are calculated from the actual bread pieces
          produced. Resins are calculated from dough batches and converted
          to cartons using 10 kg per carton.
        </p>

      </div>

    </div>
  );
}


/* =========================
   RECIPE ROW
========================== */

function RecipeRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-3 gap-4">

      <span className="font-semibold text-gray-700">
        {title}
      </span>

      <span className="text-lg font-black text-red-600 text-right">
        {value}
      </span>

    </div>
  );
}