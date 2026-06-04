(function () {
  "use strict";

  function installModalScrollStyles() {
    if (document.getElementById("scheduleBuilderModalScrollStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderModalScrollStyles";
    style.textContent = `
      .modal-backdrop {
        overflow: auto !important;
        align-items: flex-start !important;
        padding: 24px !important;
      }

      .schedule-library-modal,
      .entry-manager-modal,
      .release-modal,
      .reset-modal,
      .notes-manager-modal,
      .duplicate-day-modal {
        max-height: calc(100vh - 48px) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .library-list,
      .library-list-v2,
      .entry-manager-table-wrap,
      .entry-builder-table-wrap,
      .entries-table-wrap,
      .notes-list {
        overflow: auto !important;
        max-height: min(58vh, 620px) !important;
        -webkit-overflow-scrolling: touch;
      }

      .entry-manager-modal table,
      .entry-builder-modal table,
      .entry-manager-modal thead,
      .entry-builder-modal thead {
        position: relative;
      }

      .entry-manager-modal thead th,
      .entry-builder-modal thead th {
        position: sticky !important;
        top: 0 !important;
        z-index: 2 !important;
      }

      .library-hero,
      .notes-hero,
      .release-hero,
      .reset-hero,
      .duplicate-hero,
      .entry-manager-modal > :first-child {
        flex: 0 0 auto !important;
      }

      @media (max-height: 760px) {
        .modal-backdrop { padding: 12px !important; }
        .schedule-library-modal,
        .entry-manager-modal,
        .release-modal,
        .reset-modal,
        .notes-manager-modal,
        .duplicate-day-modal {
          max-height: calc(100vh - 24px) !important;
        }
        .library-list,
        .library-list-v2,
        .entry-manager-table-wrap,
        .entry-builder-table-wrap,
        .entries-table-wrap,
        .notes-list {
          max-height: 50vh !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function wrapEntryTables() {
    document.querySelectorAll(".entry-manager-modal table, .entry-builder-modal table").forEach((table) => {
      if (table.parentElement && /entry-(manager|builder)-table-wrap|entries-table-wrap/.test(table.parentElement.className)) return;
      const wrap = document.createElement("div");
      wrap.className = "entry-manager-table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function install() {
    installModalScrollStyles();
    wrapEntryTables();
    setInterval(wrapEntryTables, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();