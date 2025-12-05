const APPOINTMENTS_URL = "https://looped-fluid-demo.squarespace.com/appointments";
const SHOP_URL = "https://looped-fluid-demo.squarespace.com/shop";

const views = {
  home: document.getElementById("home-view"),
  contact: document.getElementById("contact-view")
};

let refreshing = false;
let splashStart = performance.now();

function initSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const MIN_VISIBLE_MS = 1000;
  window.addEventListener("load", () => {
    const elapsed = performance.now() - splashStart;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    setTimeout(() => {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 400);
    }, remaining);
  });
}

function wireActions() {
  const buttons = document.querySelectorAll("button[data-action]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "appointments") {
        window.location.href = APPOINTMENTS_URL;
      } else if (action === "shop") {
        window.location.href = SHOP_URL;
      } else if (action === "contact") {
        showView("contact");
      } else {
        showView("home");
      }
    });
  });
}

function showView(target) {
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    if (key === target) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
  if (target === "contact") {
    history.replaceState(null, "", "#contact");
  } else {
    history.replaceState(null, "", location.pathname);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hydrateRouteFromHash() {
  if (location.hash === "#contact") {
    showView("contact");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed", err));

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

wireActions();
hydrateRouteFromHash();
initSplash();
registerServiceWorker();
