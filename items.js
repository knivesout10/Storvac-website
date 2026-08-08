// StorVac Logistics — Item price catalog
// Prices are in GHS. "bonus" items are free only when the booking's total
// ticked item quantity is 3 or more (see Terms & Conditions, NB clause).
// If that condition is not met, a bonus item is charged at the "Other" bag rate.

const OTHER_BAG_RATE = 20;

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

// Room Pickup Service fee schedule — replaces the old flat GHS 50.
// Picking up specific bulky/common items costs a set fee per unit;
// any other item picked up alongside them adds one flat GHS 10 to the trip.
const ROOM_PICKUP_RATES = {
  small_suitcase: 20,
  small_checkbag: 20,
  big_suitcase: 25,
  big_checkbag: 25,
  fridge_small: 30,
  fridge_big: 40,
  microwave: 25,
};
const OTHER_PICKUP_FLAT_FEE = 10; // added once per booking if any non-listed item needs pickup too

const PACKAGES = {
  "1m": { label: "1 Month", multiplier: 1 },
  "1.5m": { label: "1.5 Months", multiplier: 1.5 },
  "2m": { label: "2 Months", multiplier: 2 },
};

const BONUS_QUALIFYING_QTY = 3; // total ticked item quantity needed for bonus items to be free

function findItem(id) {
  return ITEMS.find((i) => i.id === id);
}

module.exports = {
  ITEMS,
  ROOM_PICKUP_RATES,
  OTHER_PICKUP_FLAT_FEE,
  PACKAGES,
  OTHER_BAG_RATE,
  BONUS_QUALIFYING_QTY,
  findItem,
};
