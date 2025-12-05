const APPOINTMENTS_URL = "https://looped-fluid-demo.squarespace.com/appointments";
const SHOP_URL = "https://looped-fluid-demo.squarespace.com/shop";
const VAPID_PUBLIC_KEY = "BLpWK5brPIBDoIcXQzPV2rtiR6A-ycn_YpW-LWM7UJwcnJW6w1TR9MkdfzUmKCBlwf0iqt2X46aQFQHs2eRXa54";

const views = {
  home: document.getElementById("home-view"),
  contact: document.getElementById("contact-view")
};

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

let refreshing = false;
let splashStart = performance.now();
let pullStartY = 0;
let pulling = false;
let pullDistance = 0;
const PULL_THRESHOLD = 80;
const PULL_MAX = 140;
let swRegistration = null;
const subscriptionOutput = document.getElementById("subscription-json");
const pushStatus = document.getElementById("push-status");

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
      } else if (action === "refresh") {
        window.scrollTo({ top: 0, behavior: "auto" });
        setTimeout(() => window.location.reload(), 20);
      } else if (action === "enable-push") {
        enablePush();
      } else if (action === "disable-push") {
        disablePush();
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function renderSubscription(sub) {
  if (!subscriptionOutput || !pushStatus) return;
  if (sub) {
    subscriptionOutput.value = JSON.stringify(sub, null, 2);
    pushStatus.textContent = "Subscribed. Copy this JSON to send a test push.";
  } else {
    subscriptionOutput.value = "";
    pushStatus.textContent = "Not subscribed.";
  }
}

async function enablePush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    if (pushStatus) pushStatus.textContent = "Push not supported on this device.";
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    if (pushStatus) pushStatus.textContent = "Permission denied.";
    return;
  }

  const registration = swRegistration || (await navigator.serviceWorker.ready);
  if (!registration) {
    if (pushStatus) pushStatus.textContent = "Service worker not ready.";
    return;
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    renderSubscription(existing);
    return;
  }

  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    renderSubscription(sub);
  } catch (err) {
    console.error("Push subscribe failed", err);
    if (pushStatus) pushStatus.textContent = "Subscribe failed. Check VAPID key.";
  }
}

async function disablePush() {
  const registration = swRegistration || (await navigator.serviceWorker.ready);
  if (!registration) return;
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
  }
  renderSubscription(null);
}

function initPullToRefresh() {
  const ptr = document.getElementById("ptr");
  const root = document.scrollingElement || document.documentElement;
  if (!ptr) return;

  const applyTransform = (dist) => {
    const translate = Math.max(0, dist / 2);
    document.body.style.transform = `translateY(${translate}px)`;
    ptr.classList.toggle("show", dist > 10);
    ptr.querySelector(".ptr-icon").textContent = dist > PULL_THRESHOLD ? "↻" : "↓";
  };

  const reset = () => {
    pulling = false;
    pullDistance = 0;
    document.body.style.transform = "";
    ptr.classList.remove("show");
  };

  window.addEventListener(
    "touchstart",
    (e) => {
      if (root.scrollTop !== 0) return;
      pulling = true;
      pullStartY = e.touches[0].clientY;
      pullDistance = 0;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!pulling) return;
      const currentY = e.touches[0].clientY;
      pullDistance = Math.min(Math.max(0, currentY - pullStartY), PULL_MAX);
      if (pullDistance > 0) {
        e.preventDefault();
        applyTransform(pullDistance);
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "touchend",
    () => {
      if (!pulling) return;
      if (pullDistance >= PULL_THRESHOLD) {
        reset();
        window.location.reload();
      } else {
        reset();
      }
    },
    { passive: true }
  );
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    window.scrollTo({ top: 0, behavior: "auto" });
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        swRegistration = reg;
        reg.pushManager.getSubscription().then((sub) => renderSubscription(sub));
      })
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
initPullToRefresh();
registerServiceWorker();
