document.getElementById("track-btn").addEventListener("click", async () => {
  const code = document.getElementById("code-input").value.trim().toUpperCase();
  const slot = document.getElementById("result-slot");
  if (!code) {
    slot.innerHTML = `<div class="error-box">Enter a booking code.</div>`;
    return;
  }
  try {
    const data = await api(`/api/bookings/track/${encodeURIComponent(code)}`);
    const b = data.booking;
    const itemLines = b.items
      .map((i) => `<div class="summary-line"><span>${i.qty} &times; ${i.name}</span><span>${formatMoney(i.unitPrice * i.qty)}</span></div>`)
      .join("");
    slot.innerHTML = `
      <div class="luggage-tag">
        <div class="tag-label">Booking Code</div>
        <div class="tag-code">${b.bookingCode}</div>
        <div class="tag-row"><span class="tag-key">Name</span><span class="tag-val">${b.studentName || ""}</span></div>
        <div class="tag-row"><span class="tag-key">Hostel/Room No</span><span class="tag-val">${b.hall || ""}, Rm ${b.room || ""}</span></div>
      </div>
      <div style="margin-bottom:10px;">${statusBadge(b.status)}</div>
      ${itemLines}
      ${b.roomPickup ? `<div class="summary-line"><span>Room Pickup Service</span><span>${formatMoney(b.roomPickupFee)}</span></div>` : ""}
      <div class="summary-line"><span>Package</span><span>${b.packageLabel}</span></div>
      <div class="summary-line total"><span>Total</span><span>${formatMoney(b.totalAmount)}</span></div>
    `;
  } catch (err) {
    slot.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
});

document.getElementById("code-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("track-btn").click();
});
