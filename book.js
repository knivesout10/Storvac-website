let CATALOG = null;
let selectedPackage = null;
let latestBreakdown = null;

async function init() {
  if (!isLoggedIn()) {
    document.getElementById("not-logged-in").style.display = "block";
    return;
  }
  document.getElementById("booking-flow").style.display = "block";

  const user = getUser();
  if (user && user.email) {
    document.getElementById("receipt-email").value = user.email;
  }

  CATALOG = await api("/api/bookings/catalog");
  renderItems(CATALOG.items);

  document.querySelectorAll(".package-option").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".package-option").forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      selectedPackage = el.dataset.pkg;
      recalculate();
    });
  });

  document.getElementById("room-pickup").addEventListener("change", recalculate);
  document.getElementById("terms-accept").addEventListener("change", updatePayButtonState);
  document.getElementById("pay-btn").addEventListener("click", startPayment);
}

function renderItems(items) {
  const categories = [...new Set(items.map((i) => i.category))];
  const container = document.getElementById("items-list");
  container.innerHTML = "";

  categories.forEach((cat) => {
    const catTitle = document.createElement("div");
    catTitle.className = "category-title";
    catTitle.textContent = cat;
    container.appendChild(catTitle);

    items
      .filter((i) => i.category === cat)
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML = `
          <div class="item-left">
            <input type="checkbox" class="item-check" data-id="${item.id}">
            <div>
              <span class="item-name">${item.name}${item.bonus ? '<span class="bonus-tag">Bonus*</span>' : ""}</span>
              <span class="item-price">${item.bonus ? "Free with 3+ items, else GHS 20" : formatMoney(item.price)}</span>
            </div>
          </div>
          <input type="number" class="item-qty" data-id="${item.id}" min="1" value="1" disabled>
        `;
        container.appendChild(row);
      });
  });

  container.querySelectorAll(".item-check").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const qtyInput = container.querySelector(`.item-qty[data-id="${e.target.dataset.id}"]`);
      qtyInput.disabled = !e.target.checked;
      recalculate();
    });
  });
  container.querySelectorAll(".item-qty").forEach((input) => {
    input.addEventListener("input", recalculate);
  });
}

function getSelections() {
  const selections = [];
  document.querySelectorAll(".item-check:checked").forEach((cb) => {
    const id = cb.dataset.id;
    const qty = parseInt(document.querySelector(`.item-qty[data-id="${id}"]`).value, 10) || 1;
    selections.push({ id, qty });
  });
  return selections;
}

async function recalculate() {
  const selections = getSelections();
  const roomPickup = document.getElementById("room-pickup").checked;

  if (selections.length === 0 || !selectedPackage) {
    document.getElementById("total-display").textContent = "GHS 0.00";
    latestBreakdown = null;
    updatePayButtonState();
    return;
  }

  try {
    const breakdown = await api("/api/bookings/calculate", {
      method: "POST",
      body: { items: selections, roomPickup, package: selectedPackage },
    });
    latestBreakdown = breakdown;
    document.getElementById("total-display").textContent = formatMoney(breakdown.total);
    const hint = document.getElementById("pickup-fee-hint");
    if (roomPickup && breakdown.pickupFee > 0) {
      hint.dataset.original = hint.dataset.original || hint.textContent;
      hint.innerHTML = `Pickup fee for this booking: <strong>${formatMoney(breakdown.pickupFee)}</strong> (added once, not multiplied by package).`;
    } else if (hint.dataset.original) {
      hint.textContent = hint.dataset.original;
    }
  } catch (err) {
    latestBreakdown = null;
    document.getElementById("total-display").textContent = "—";
  }
  updatePayButtonState();
}

function updatePayButtonState() {
  const termsChecked = document.getElementById("terms-accept").checked;
  const btn = document.getElementById("pay-btn");
  btn.disabled = !(latestBreakdown && latestBreakdown.total > 0 && termsChecked);
}

function showError(message) {
  document.getElementById("error-slot").innerHTML = `<div class="error-box">${message}</div>`;
}

async function startPayment() {
  const email = document.getElementById("receipt-email").value.trim(); // optional
  const selections = getSelections();
  const roomPickup = document.getElementById("room-pickup").checked;

  document.getElementById("pay-btn").disabled = true;
  document.getElementById("pay-btn").textContent = "Starting payment…";

  try {
    const config = await api("/api/config");
    const init = await api("/api/bookings/initiate", {
      method: "POST",
      auth: true,
      body: {
        items: selections,
        roomPickup,
        package: selectedPackage,
        termsAccepted: true,
        email,
      },
    });

    const handler = PaystackPop.setup({
      key: config.paystackPublicKey,
      email: init.email,
      amount: init.amountPesewas, // smallest currency unit (pesewas)
      currency: "GHS",
      ref: init.reference,
      channels: ["card", "mobile_money"],
      callback: function (response) {
        verifyPayment(response.reference);
      },
      onClose: function () {
        document.getElementById("pay-btn").disabled = false;
        document.getElementById("pay-btn").textContent = "Pay Now";
      },
    });
    handler.openIframe();
  } catch (err) {
    showError(err.message);
    document.getElementById("pay-btn").disabled = false;
    document.getElementById("pay-btn").textContent = "Pay Now";
  }
}

async function verifyPayment(reference) {
  try {
    const result = await api("/api/bookings/verify", {
      method: "POST",
      auth: true,
      body: { reference },
    });
    showReceipt(result.booking);
  } catch (err) {
    showError(`Payment succeeded but verification failed: ${err.message}. Keep your reference (${reference}) and contact support.`);
  }
}

function showReceipt(booking) {
  document.getElementById("booking-flow").style.display = "none";
  document.getElementById("receipt-view").style.display = "block";
  document.getElementById("receipt-code").textContent = booking.bookingCode;

  const user = getUser();
  if (user) {
    document.getElementById("tag-name").textContent = user.name || "";
    document.getElementById("tag-hall").textContent = `${user.hall || ""}, Rm ${user.room || ""}`;
    document.getElementById("tag-contact").textContent = user.phone || user.email || "";
  }

  const itemLines = booking.items
    .map((i) => `<div class="summary-line"><span>${i.qty} &times; ${i.name}</span><span>${formatMoney(i.unitPrice * i.qty)}</span></div>`)
    .join("");

  document.getElementById("receipt-details").innerHTML = `
    ${itemLines}
    ${booking.roomPickup ? `<div class="summary-line"><span>Room Pickup Service</span><span>${formatMoney(booking.roomPickupFee)}</span></div>` : ""}
    <div class="summary-line"><span>Package</span><span>${booking.packageLabel}</span></div>
    <div class="summary-line total"><span>Total Paid</span><span>${formatMoney(booking.totalAmount)}</span></div>
  `;
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", init);
