(function () {
  "use strict";

  var STORAGE_KEY = "pwa-theme"; // "light" | "dark"
  var root = document.documentElement;

  var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function getSystemPreference() {
    return mediaQuery.matches ? "dark" : "light";
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* التخزين مش متاح — تجاهل بأمان */
    }
  }

  function updateMetaThemeColor(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }

    // حاول نقرأ اللون من متغيرات CSS بعد تطبيق الثيم
    var bg = "";
    try {
      bg = getComputedStyle(root).getPropertyValue("--bg-base").trim();
    } catch (e) {
      bg = "";
    }

    // Fallbacks: لو CSS مش متاحة لسبب ما، استخدم ألوان معقولة حسب الثيم
    if (!bg) {
      bg = theme === "dark" ? "#17281C" /* forest-900 */ : "#F8FAF5" /* cream-50 */;
    }
    meta.setAttribute("content", bg);
  }

  function syncToggleButtons(theme) {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    buttons.forEach(function (btn) {
      // Ensure an accessible role for non-button elements; buttons keep their semantics.
      if (btn.tagName.toLowerCase() !== "button" && !btn.hasAttribute("role")) {
        btn.setAttribute("role", "switch");
        btn.setAttribute("tabindex", "0");
      }
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"
      );
    });
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) storeTheme(theme);
    updateMetaThemeColor(theme);
    syncToggleButtons(theme);
    try {
      document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
    } catch (e) {
      // عدم دعم CustomEvent في بيئات قديمة — تجاهل بأمان
    }
  }

  function toggleTheme() {
    var current = root.getAttribute("data-theme") || getSystemPreference();
    applyTheme(current === "dark" ? "light" : "dark", true);
  }

  // compatibility helper for media query changes
  function addMediaQueryChangeListener(mq, cb) {
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", cb);
    } else if (typeof mq.addListener === "function") {
      // older browsers (very few modern ones use this)
      mq.addListener(function (e) {
        cb(e);
      });
    }
  }

  function initTheme() {
    // منع انتقالات CSS أثناء التطبيق الأول عشان ما يحصلش "وميض" لوني
    root.classList.add("theme-loading");

    var stored = getStoredTheme();
    applyTheme(stored || getSystemPreference(), false);

    requestAnimationFrame(function () {
      root.classList.remove("theme-loading");
    });

    // لو المستخدم مغيّرش تفضيله يدويًا، اتبع تغيير النظام تلقائيًا لحظيًا
    addMediaQueryChangeListener(mediaQuery, function (e) {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? "dark" : "light", false);
      }
    });

    // اربط أي زرار عليه data-theme-toggle
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest && e.target.closest("[data-theme-toggle]");
      if (toggle) toggleTheme();
    });

    // دعم تفعيل toggle عبر مفاتيح Enter / Space للأماكن غير-button
    document.addEventListener("keydown", function (e) {
      var el = document.activeElement;
      if (!el) return;
      if (el.hasAttribute && el.hasAttribute("data-theme-toggle")) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggleTheme();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }

  // إتاحة التحكم يدويًا من أي مكان في التطبيق
  window.ThemeManager = {
    apply: function (theme) { applyTheme(theme, true); },
    toggle: toggleTheme,
    current: function () { return root.getAttribute("data-theme") || getSystemPreference(); },
    onChange: function (cb) {
      if (typeof cb === "function") document.addEventListener("themechange", cb);
    }
  };
})();
