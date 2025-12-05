const APPOINTMENTS_URL = "https://looped-fluid-demo.squarespace.com/appointments";
const SHOP_URL = "https://looped-fluid-demo.squarespace.com/shop";

function wireActions() {
  const buttons = document.querySelectorAll("button[data-action]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "appointments") {
        window.location.href = APPOINTMENTS_URL;
      } else if (action === "shop") {
        window.location.href = SHOP_URL;
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

wireActions();
registerServiceWorker();
