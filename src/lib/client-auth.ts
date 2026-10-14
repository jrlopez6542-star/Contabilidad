"use client";

export async function clientLogout() {
  try {
    localStorage.removeItem("contabilidad_last_active");
    localStorage.removeItem("contabilidad_hidden_at");
    localStorage.setItem("contabilidad_logout_broadcast", String(Date.now()));
  } catch {
    /* ignore storage errors */
  }

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* ignore network errors */
  }

  // Force clean navigation replacing history so Back button cannot restore previous page
  window.location.replace("/login?logout=1");
}
