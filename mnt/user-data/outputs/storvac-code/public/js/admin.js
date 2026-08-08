async function initAdmin() {
  if (!getAdminToken()) {
    document.getElementById("not-logged-in").style.display = "block";
    return;
  }
  document.getElementById("dashboard").style.display = "block";

  document.getElementById("admin-logout").addEventListener("click", (e) => {
    e.preventDefault();
    clearAdminToken();
    window.location.href = "/admin-login.html";
  });

  document.getElementById("search-box").addEventListener("input", debounce(loadBookings, 300));
  document.getElementById("status-filter").addEventListener("change", loadBookings);

  await loadSummary();
  await loadBookings();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function loadSummary() {
  try {
    const s = await api("/api/admin/summary", { adminAuth: true });
    document.getElementById("stat-active").textContent = s.activeBookings;
    document.getElementById("stat-collected").textContent = s.collectedBookings;
    document.getElementById("stat-revenue").textContent = formatMoney(s.totalRevenue);
  } catch (err) {
    if (err.message.includes("Session expired") || err.message.includes("Admin login")) {
      clearAdminToken();
      window.location.href = "/admin-login.html";
    }
  }
}

async function loadBookings() {
  const q = document.getElementById("search-box").value.trim();
  const status = document.getElementById("status-filter").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  try {
    const data = await api(`/api/admin/bookings?${params.toString()}`, { adminAuth: true });
    const tbody = document.getElementById("bookings-tbody");
    tbody.innerHTML = data.bookings.map(renderRow).join("");

    tbody.querySelectorAll(".mark-collected").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/api/admin/bookings/${btn.dataset.id}/collect`, { method: "PATCH", adminAuth: true });
        loadBookings();
        loadSummary();
      });
    });
    tbody.querySelectorAll(".mark-ready").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/api/admin/bookings/${btn.dataset.id}/ready`, { method: "PATCH", adminAuth: true });
        loadBookings();
      });
    });
  } catch (err) {
    document.getElementById("bookings-tbody").innerHTML = `<tr><td colspan="10">${err.message}</td></tr>`;
  }
}

function renderRow(b) {
  const itemsSummary = b.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
  let actionBtn = "";
  if (b.status === "paid") {
    actionBtn = `<button class="btn btn-secondary mark-ready" data-id="${b.id}" style="padding:6px 10px; font-size:0.8rem;">Mark Ready</button>`;
  } else if (b.status === "ready") {
    actionBtn = `<button class="btn btn-primary mark-collected" data-id="${b.id}" style="padding:6px 10px; font-size:0.8rem;">Mark Collected</button>`;
  }
  return `
    <tr>
      <td style="font-family:'IBM Plex Mono',monospace;">${b.bookingCode || "—"}</td>
      <td>${b.studentName}<br><span class="field-help">${b.phone || b.email || ""}</span></td>
      <td>${b.institution}</td>
      <td>${b.hall}, Rm ${b.room}</td>
      <td style="max-width:220px; font-size:0.85rem;">${itemsSummary}${b.roomPickup ? " + Room Pickup" : ""}</td>
      <td>${b.package}</td>
      <td>${formatMoney(b.totalAmount)}</td>
      <td>${b.paymentMethod || "—"}</td>
      <td>${statusBadge(b.status)}</td>
      <td>${actionBtn}</td>
    </tr>
  `;
}

document.addEventListener("DOMContentLoaded", initAdmin);
