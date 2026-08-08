async function loadBookings() {
  if (!isLoggedIn()) {
    document.getElementById("not-logged-in").style.display = "block";
    return;
  }

  try {
    const data = await api("/api/bookings/mine", { auth: true });
    const list = document.getElementById("bookings-list");

    if (data.bookings.length === 0) {
      document.getElementById("empty-state").style.display = "block";
      return;
    }

    list.innerHTML = data.bookings.map(renderBooking).join("");
  } catch (err) {
    document.getElementById("bookings-list").innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}

function renderBooking(b) {
  const itemLines = b.items
    .map((i) => `<div class="summary-line"><span>${i.qty} &times; ${i.name}</span><span>${formatMoney(i.unitPrice * i.qty)}</span></div>`)
    .join("");

  return `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <strong style="font-family:'IBM Plex Mono',monospace; font-size:1.05rem;">
            ${b.bookingCode || "Payment Pending"}
          </strong>
        </div>
        ${statusBadge(b.status)}
      </div>
      ${itemLines}
      ${b.roomPickup ? `<div class="summary-line"><span>Room Pickup Service</span><span>${formatMoney(b.roomPickupFee)}</span></div>` : ""}
      <div class="summary-line"><span>Package</span><span>${b.packageLabel}</span></div>
      <div class="summary-line total"><span>Total</span><span>${formatMoney(b.totalAmount)}</span></div>
      <p class="field-help">Booked ${new Date(b.createdAt).toLocaleDateString()}</p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", loadBookings);
