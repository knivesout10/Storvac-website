function showError(message) {
  const slot = document.getElementById("error-slot");
  if (!slot) return;
  slot.innerHTML = `<div class="error-box">${message}</div>`;
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    const payload = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim() || null,
      email: document.getElementById("email").value.trim() || null,
      institution: document.getElementById("institution").value,
      hall: document.getElementById("hall").value.trim(),
      room: document.getElementById("room").value.trim(),
      password,
    };
    try {
      const data = await api("/api/auth/signup", { method: "POST", body: payload });
      setToken(data.token);
      setUser(data.user);
      window.location.href = "/book.html";
    } catch (err) {
      showError(err.message);
    }
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      identifier: document.getElementById("identifier").value.trim(),
      password: document.getElementById("password").value,
    };
    try {
      const data = await api("/api/auth/login", { method: "POST", body: payload });
      setToken(data.token);
      setUser(data.user);
      window.location.href = "/book.html";
    } catch (err) {
      showError(err.message);
    }
  });
}
