const {
  ITEMS,
  ROOM_PICKUP_RATES,
  OTHER_PICKUP_FLAT_FEE,
  PACKAGES,
  OTHER_BAG_RATE,
  BONUS_QUALIFYING_QTY,
  findItem,
} = require("../data/items");

/**
 * selections: [{ id: "big_suitcase", qty: 2 }, ...]
 * roomPickup: boolean
 * pkg: "1m" | "1.5m" | "2m"
 *
 * Returns a breakdown object or throws an Error with a user-facing message.
 */
function calculateTotal(selections, roomPickup, pkg) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("Select at least one item to store.");
  }
  if (!PACKAGES[pkg]) {
    throw new Error("Invalid storage package selected.");
  }

  // Validate items & total quantity ticked
  let totalQty = 0;
  const lines = [];
  for (const sel of selections) {
    const item = findItem(sel.id);
    const qty = Number(sel.qty);
    if (!item) throw new Error(`Unknown item: ${sel.id}`);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Invalid quantity for ${item.name}`);
    totalQty += qty;
    lines.push({ id: item.id, name: item.name, category: item.category, bonus: item.bonus, qty });
  }

  const bonusQualifies = totalQty >= BONUS_QUALIFYING_QTY;

  let itemsSubtotal = 0;
  const priced = lines.map((line) => {
    let unitPrice;
    if (line.bonus) {
      unitPrice = bonusQualifies ? 0 : OTHER_BAG_RATE;
    } else {
      unitPrice = findItem(line.id).price;
    }
    const lineTotal = unitPrice * line.qty;
    itemsSubtotal += lineTotal;
    return { ...line, unitPrice, lineTotal };
  });

  const multiplier = PACKAGES[pkg].multiplier;
  const itemsAfterPackage = itemsSubtotal * multiplier;

  const pickupFee = roomPickup ? calculateRoomPickupFee(lines) : 0;
  const total = itemsAfterPackage + pickupFee;

  return {
    lines: priced,
    bonusQualifies,
    itemsSubtotal,
    package: pkg,
    packageLabel: PACKAGES[pkg].label,
    multiplier,
    itemsAfterPackage,
    roomPickup: !!roomPickup,
    pickupFee,
    total: Math.round(total * 100) / 100,
  };
}

// Room Pickup Service fee: itemized per item that has a set rate; any other
// item in the booking (no set rate) adds one flat GHS 10 to the trip total,
// charged once per booking rather than once per such item.
function calculateRoomPickupFee(lines) {
  let fee = 0;
  let hasUnratedItem = false;
  for (const line of lines) {
    const rate = ROOM_PICKUP_RATES[line.id];
    if (rate != null) {
      fee += rate * line.qty;
    } else {
      hasUnratedItem = true;
    }
  }
  if (hasUnratedItem) fee += OTHER_PICKUP_FLAT_FEE;
  return Math.round(fee * 100) / 100;
}

module.exports = { calculateTotal, calculateRoomPickupFee };
