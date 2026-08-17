// Shared helpers used across all pages

function getToken() {
  return localStorage.getItem("storvac_token");
}
function setToken(token) {
  localStorage.setItem("storvac_token", token);
}
function clearToken() {
  localStorage.removeItem("storvac_token");
  localStorage.removeItem("storvac_user");
}
function getUser() {
  const raw = localStorage.getItem("storvac_user");
  return raw ? JSON.parse(raw) : null;
}
function setUser(user) {
  localStorage.setItem("storvac_user", JSON.stringify(user));
}
function isLoggedIn() {
  return !!getToken();
}

function getAdminToken() {
  return localStorage.getItem("storvac_admin_token");
}
function setAdminToken(token) {
  localStorage.setItem("storvac_admin_token", token);
}
function clearAdminToken() {
  localStorage.removeItem("storvac_admin_token");
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (options.auth) headers["Authorization"] = `Bearer ${getToken()}`;
  if (options.adminAuth) headers["Authorization"] = `Bearer ${getAdminToken()}`;

  const res = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function formatMoney(n) {
  return `GHS ${Number(n).toFixed(2)}`;
}

function statusBadge(status) {
  const map = {
    pending: ["Pending Payment", "badge-pending"],
    paid: ["Stored", "badge-paid"],
    ready: ["Ready for Pickup", "badge-ready"],
    collected: ["Collected", "badge-collected"],
    cancelled: ["Cancelled", "badge-cancelled"],
  };
  const [label, cls] = map[status] || [status, "badge-pending"];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ==========================================================================
// OVERLAY INTERACTION HELPERS (Welcome & Farewell)
// ==========================================================================

function initWelcomeOverlay() {
  const welcomeModal = document.getElementById("welcomeModal");
  const introForm = document.getElementById("introForm");

  if (!welcomeModal || !introForm) return;

  // Handle form submission on entry
  introForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const userName = document.getElementById("userName")?.value.trim();
    const serviceType = document.getElementById("serviceType")?.value;

    if (userName) {
      // Save user preference/name for session use
      localStorage.setItem("storvac_guest_name", userName);
    }

    // Smoothly fade out the welcome overlay
    welcomeModal.classList.add("fade-out");

    setTimeout(() => {
      welcomeModal.style.display = "none";
    }, 1000); // Matches CSS transition duration
  });
}

function triggerFarewellOverlay(callback) {
  const farewellModal = document.getElementById("farewellModal");
  const displayUserName = document.getElementById("displayUserName");

  if (!farewellModal) {
    if (callback) callback();
    return;
  }

  // Set the guest/user name if available
  const user = getUser();
  const guestName = localStorage.getItem("storvac_guest_name");
  const nameToShow = user?.name || guestName || "User";

  if (displayUserName) {
    displayUserName.textContent = nameToShow;
  }

  // Show the Farewell Overlay
  farewellModal.style.display = "flex";
  // Remove fade-out class to make it visible
  setTimeout(() => farewellModal.classList.remove("fade-out"), 10);

  // Play progress bar animation before calling redirect/logout
  setTimeout(() => {
    farewellModal.classList.add("fade-out");
    setTimeout(() => {
      farewellModal.style.display = "none";
      if (callback) callback();
    }, 1000);
  }, 2200); // Matches loader progress duration
}

function renderHeader(activePage) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const loggedIn = isLoggedIn();
  el.innerHTML = `
    <div class="container">
      <a href="/" class="brand">
        <img src="/assets/logo-icon.png" alt="StorVac Logistics">
        <span class="brand-text">Stor<span>Vac</span></span>
      </a>
      <nav class="nav-links">
        <a href="/book.html">Book Storage</a>
        <a href="/track.html">Track Booking</a>
        ${loggedIn ? '<a href="/my-bookings.html">My Bookings</a>' : ""}
        <a href="/terms.html">Terms</a>
        ${
          loggedIn
            ? '<a href="#" id="logout-link">Log Out</a>'
            : '<a href="/login.html">Log In</a>'
        }
      </nav>
    </div>
  `;

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();

      // Trigger the farewell sequence before logging out
      triggerFarewellOverlay(() => {
        clearToken();
        localStorage.removeItem("storvac_guest_name");
        window.location.href = "/";
      });
    });
  }
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div>
        <div class="footer-brand">StorVac Logistics</div>
        <div class="footer-tagline">Secure, swift and reliable.</div>
      </div>
      <div>
        <div>0576881262 &middot; 0542688948</div>
        <div><a href="mailto:storvaclogistics@gmail.com">storvaclogistics@gmail.com</a></div>
      </div>
      <div>
        <div>Mensah Wood Avenue, East Legon</div>
        <div><a href="/terms.html">Terms &amp; Conditions</a></div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  initWelcomeOverlay();
});