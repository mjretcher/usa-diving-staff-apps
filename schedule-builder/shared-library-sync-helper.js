(function () {
  "use strict";

  const LIBRARY_KEY = "usa-diving-schedule-builder-saved-schedules-v1";
  const STATUS_ID = "sharedLibrarySyncStatus";
  const REFRESH_ID = "sharedLibraryRefreshButton";
  const POLL_MS = 45000;

  let installed = false;
  let lastStatus = "";
  let lastSyncAt = 0;
  let syncing = false;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => waitForDependencies(install));

  function waitForDependencies(callback, attempts = 0) {
    if (window.actions && window.ScheduleSync) {
      callback();
      return;
    }
    if (attempts > 100) return;
    window.setTimeout(() => waitForDependencies(callback, attempts + 1), 50);
  }

  function install() {
    if (installed) return;
    installed = true;
    window.actions.refreshSharedLibrary = () => refreshSharedLibrary({ manual: true });
    window.actions.syncSharedLibraryNow = window.actions.refreshSharedLibrary;

    injectStyles();
    attachRefreshControl();
    const observer = new MutationObserver(attachRefreshControl);
    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => refreshSharedLibrary({ manual: false }), 1200);
    window.setInterval(() => refreshSharedLibrary({ manual: false }), POLL_MS);
  }

  function readLocalLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocalLibrary(items) {
    const clean = (items || [])
      .filter((item) => item && !item.builtIn)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, 50);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(clean));
  }

  function scheduleTimestamp(item) {
    const candidates = [item?.updatedAt, item?.schedule?.updatedAt, item?.schedule?.meet?.updatedAt, item?.schedule?.releasedAt];
    for (const candidate of candidates) {
      const value = new Date(candidate || 0).getTime();
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }

  function mergeLibraries(local, remote) {
    const byId = new Map();
    local.filter((item) => item && item.id && !item.builtIn).forEach((item) => byId.set(item.id, item));
    let added = 0;
    let updated = 0;

    remote.filter((item) => item && item.id && !item.builtIn).forEach((remoteItem) => {
      const localItem = byId.get(remoteItem.id);
      if (!localItem) {
        byId.set(remoteItem.id, remoteItem);
        added += 1;
      } else if (scheduleTimestamp(remoteItem) > scheduleTimestamp(localItem)) {
        byId.set(remoteItem.id, remoteItem);
        updated += 1;
      }
    });

    return { items: Array.from(byId.values()), added, updated };
  }

  async function refreshSharedLibrary(options = {}) {
    if (syncing || !window.ScheduleSync) return;
    const now = Date.now();
    if (!options.manual && now - lastSyncAt < 10000) return;
    syncing = true;
    lastSyncAt = now;
    setStatus(options.manual ? "Checking shared library..." : "Syncing shared library...");

    try {
      const remote = await window.ScheduleSync.loadSchedules();
      const local = readLocalLibrary();
      const { items, added, updated } = mergeLibraries(local, Array.isArray(remote) ? remote : []);
      if (added || updated) {
        writeLocalLibrary(items);
        setStatus(`Shared library updated: ${added} added, ${updated} updated.`);
        rerenderLibrary();
      } else {
        setStatus(`Shared library is current${remote?.length ? ` (${remote.length} shared)` : ""}.`);
      }
    } catch (error) {
      console.warn("[shared-library-sync] refresh failed:", error);
      setStatus("Shared library refresh failed. Check connection or configuration.", true);
    } finally {
      syncing = false;
    }
  }

  function rerenderLibrary() {
    try {
      if (window.actions?.switchSidebarTab) {
        const active = window._sbActiveTab || "library";
        window.actions.switchSidebarTab(active);
      }
    } catch (_) {}
  }

  function setStatus(message, isError = false) {
    lastStatus = message || "";
    const node = document.getElementById(STATUS_ID);
    if (node) {
      node.textContent = lastStatus;
      node.classList.toggle("sync-error", Boolean(isError));
    }
  }

  function attachRefreshControl() {
    const saveInput = document.getElementById("sbLibSaveName");
    if (!saveInput || document.getElementById(REFRESH_ID)) return;
    const saveButton = saveInput.parentElement?.querySelector("button");
    const wrapper = document.createElement("div");
    wrapper.className = "shared-library-sync-controls";
    wrapper.innerHTML = `<button id="${REFRESH_ID}" type="button" onclick="actions.refreshSharedLibrary()">Refresh shared library</button><div id="${STATUS_ID}" class="shared-library-sync-status">${escapeHtml(lastStatus || "Auto-sync checks every 45 seconds.")}</div>`;
    if (saveButton?.parentElement) saveButton.parentElement.appendChild(wrapper);
  }

  function injectStyles() {
    if (document.getElementById("sharedLibrarySyncHelperStyles")) return;
    const style = document.createElement("style");
    style.id = "sharedLibrarySyncHelperStyles";
    style.textContent = `
      .shared-library-sync-controls{margin-top:6px;display:grid;gap:4px}
      #sharedLibraryRefreshButton{width:100%;height:26px;border-radius:var(--sb-r,7px);background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);color:var(--sb-nav-ink,#fff);font-size:11px;font-weight:700;cursor:pointer}
      #sharedLibraryRefreshButton:hover{background:rgba(255,255,255,.14)}
      .shared-library-sync-status{font-size:9.5px;line-height:1.25;color:var(--sb-nav-muted,rgba(255,255,255,.65));text-align:center}
      .shared-library-sync-status.sync-error{color:#fecdd3}
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
