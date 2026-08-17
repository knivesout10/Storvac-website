// StorVac Logistics — Item price catalog & Dynamic Quantity Calculator
// Prices are in GHS. "bonus" items are free only when total item quantity is 3 or more.
// If total quantity < 3, bonus items are charged at OTHER_BAG_RATE per unit.

const OTHER_BAG_RATE = 20;
const BONUS_QUALIFYING_QTY = 3;

const ITEMS = [
  // Bags
  { id: "big_suitcase", name: "Big Suitcase/Traveller", category: "Bags", price: 50, bonus: false },
  { id: "small_suitcase", name: "Small Suitcase/Traveller", category: "Bags", price: 40, bonus: false },
  { id: "big_checkbag", name: "Big Check Bag", category: "Bags", price: 40, bonus: false },
  { id: "small_checkbag", name: "Small Check Bag", category: "Bags", price: 30, bonus: false },
  { id: "veronica_bucket", name: "Veronica Bucket", category: "Bags", price: 30, bonus: false },
  { id: "other_bag", name: "Other (bag not listed)", category: "Bags", price: OTHER_BAG_RATE, bonus: false },

  // Electrical Appliances
  { id: "fridge_big", name: "Refrigerator (Big / Double Door)", category: "Electrical Appliances", price: 70, bonus: false },
  { id: "fridge_small", name: "Refrigerator (Small / One Door)", category: "Electrical Appliances", price: 60, bonus: false },
  { id: "tv", name: "Television Set", category: "Electrical Appliances", price: 60, bonus: false },
  { id: "microwave", name: "Microwave", category: "Electrical Appliances", price: 40, bonus: false },
  { id: "standing_fan", name: "Standing Fan", category: "Electrical Appliances", price: 0, bonus: true },
  { id: "rice_cooker", name: "Rice Cooker", category: "Electrical Appliances", price: 0, bonus: true },

  // Others
  { id: "furniture", name: "Furniture (e.g. Sofa, Bed Frame)", category: "Others", price: 100, bonus: false },
  { id: "mattress_small", name: "Mattress (Small)", category: "Others", price: 90, bonus: false },
  { id: "mattress_big", name: "Mattress (Big)", category: "Others", price: 100, bonus: false },
  { id: "gas_cylinder_empty", name: "Gas Cylinder (Empty only)", category: "Others", price: 100, bonus: false },
  { id: "gas_stove_small", name: "Gas Stove (Small)", category: "Others", price: 70, bonus: false },
  { id: "gas_stove_big", name: "Gas Stove (Big)", category: "Others", price: 100, bonus: false },
];

// Room Pickup Service fee schedule per unit
const ROOM_PICKUP_RATES = {
  small_suitcase: 20,
  small_checkbag: 20,
  big_suitcase: 25,
  big_checkbag: 25,
  fridge_small: 30,
  fridge_big: 40,
  microwave: 25,
};
const OTHER_PICKUP_FLAT_FEE = 10; // Flat GHS 10 added once per booking if unlisted items need pickup

const PACKAGES = {
  "1m": { label: "1 Month", multiplier: 1 },
  "1.5m": { label: "1.5 Months", multiplier: 1.5 },
  "2m": { label: "2 Months", multiplier: 2 },
};

// --- Helper Functions ---

function findItem(id) {
  return ITEMS.find((i) => i.id === id);
}

/**
 * Calculates total item cost based on selected quantities.
 * @param {Object} itemQuantities - Object map of itemId to quantity count (e.g., { big_suitcase: 2, rice_cooker: 1 })
 * @returns {number} Base items subtotal in GHS
 */
function calculateItemsTotal(itemQuantities = {}) {
  // Calculate aggregate quantity across all items
  const totalQty = Object.values(itemQuantities).reduce((sum, qty) => sum + (Math.max(0, Number(qty)) || 0), 0);
  const qualifiesForBonus = totalQty >= BONUS_QUALIFYING_QTY;

  let total = 0;

  for (const [id, count] of Object.entries(itemQuantities)) {
    const qty = Math.max(0, Number(count)) || 0;
    if (qty <= 0) continue;

    const item = findItem(id);
    if (!item) continue;

    if (item.bonus) {
      // Free if qualifies for bonus; otherwise charged at OTHER_BAG_RATE per unit
      const unitPrice = qualifiesForBonus ? 0 : OTHER_BAG_RATE;
      total += unitPrice * qty;
    } else {
      total += item.price * qty;
    }
  }

  return total;
}

/**
 * Calculates Room Pickup Fee according to individual item counts.
 * @param {Object} itemQuantities - Object map of itemId to quantity count
 * @returns {number} Pickup fee total in GHS
 */
function calculatePickupFee(itemQuantities = {}) {
  let pickupTotal = 0;
  let hasUnlistedPickupItems = false;

  for (const [id, count] of Object.entries(itemQuantities)) {
    const qty = Math.max(0, Number(count)) || 0;
    if (qty <= 0) continue;

    if (ROOM_PICKUP_RATES[id] !== undefined) {
      pickupTotal += ROOM_PICKUP_RATES[id] * qty;
    } else {
      hasUnlistedPickupItems = true;
    }
  }

  // Add one-time flat fee if any unlisted items are present
  if (hasUnlistedPickupItems) {
    pickupTotal += OTHER_PICKUP_FLAT_FEE;
  }

  return pickupTotal;
}

/**
 * Calculates Grand Total bill amount.
 * @param {Object} itemQuantities - Object map of itemId to quantity count
 * @param {string} packageKey - Key for PACKAGES ("1m", "1.5m", "2m")
 * @param {boolean} includePickup - True if room pickup service is required
 * @returns {number} Grand total in GHS
 */
function calculateGrandTotal(itemQuantities = {}, packageKey = "1m", includePickup = false) {
  const selectedPackage = PACKAGES[packageKey] || PACKAGES["1m"];
  const baseTotal = calculateItemsTotal(itemQuantities);
  const storageTotal = baseTotal * selectedPackage.multiplier;
  const pickupFee = includePickup ? calculatePickupFee(itemQuantities) : 0;

  return storageTotal + pickupFee;
}

module.exports = {
  ITEMS,
  ROOM_PICKUP_RATES,
  OTHER_PICKUP_FLAT_FEE,
  PACKAGES,
  OTHER_BAG_RATE,
  BONUS_QUALIFYING_QTY,
  findItem,
  calculateItemsTotal,
  calculatePickupFee,
  calculateGrandTotal,
};


