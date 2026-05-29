/**
 * Orbit Waitlist: step manager, swipe, and form submission.
 */
(function () {

  var STEP_INTRO    = 0;
  var STEP_PROBLEM  = 1;
  var STEP_SOLUTION = 2;
  var STEP_FORM     = 3;
  var STEP_SUCCESS  = 4;

  var SLIDE_FIRST = STEP_PROBLEM;
  var SLIDE_LAST  = STEP_SOLUTION;

  var currentStep   = STEP_INTRO;
  var transitioning = false;

  var SUPABASE_URL      = "";
  var SUPABASE_ANON_KEY = "";

  var btnEnter  = document.getElementById("btn-enter");
  var btnSkip   = document.getElementById("btn-skip");
  var form      = document.getElementById("waitlist-form");
  var btnSubmit = document.getElementById("btn-submit");
  var bannerEl  = document.getElementById("form-banner");
  var formState = document.getElementById("form-state");
  var footer    = document.querySelector(".page-footer");

  var nameInput    = document.getElementById("field-name");
  var emailInput   = document.getElementById("field-email");
  var featureInput = document.getElementById("field-feature");
  var painInput    = document.getElementById("field-pain");
  var errName      = document.getElementById("err-name");
  var errEmail     = document.getElementById("err-email");

  function el(n) { return document.getElementById("step-" + n); }

  function buildProgressDots() {
    document.querySelectorAll(".progress-dots").forEach(function (container) {
      if (container.children.length) return;
      for (var i = SLIDE_FIRST; i <= SLIDE_LAST; i++) {
        var dot = document.createElement("div");
        dot.className = "progress-dot";
        dot.setAttribute("data-goto", String(i));
        dot.setAttribute("role", "button");
        dot.setAttribute("tabindex", "0");
        dot.setAttribute("aria-label", "Slide " + (i - SLIDE_FIRST + 1));
        container.appendChild(dot);
      }
    });
  }

  function updateProgressDots() {
    document.querySelectorAll(".progress-dots").forEach(function (container) {
      container.querySelectorAll(".progress-dot").forEach(function (dot) {
        var target = parseInt(dot.getAttribute("data-goto"), 10);
        dot.classList.toggle("is-active", target === currentStep);
      });
    });
  }

  function updateFooter() {
    if (!footer) return;
    var hide = (currentStep === STEP_FORM || currentStep === STEP_SUCCESS);
    footer.classList.toggle("is-hidden", hide);
  }

  function goTo(next, direction) {
    if (transitioning || next === currentStep) return;
    if (next < 0 || next > STEP_SUCCESS) return;
    transitioning = true;

    var dir  = direction || "fwd";
    var cur  = el(currentStep);
    var dest = el(next);
    if (!dest) { transitioning = false; return; }

    if (next >= SLIDE_FIRST && next <= SLIDE_LAST) {
      if (dir === "back") dest.classList.add("from-left");
    }

    if (cur) {
      cur.classList.remove("is-active");
      cur.classList.add(dir === "back" ? "is-exit-back" : "is-exit-fwd");
    }

    setTimeout(function () {
      if (cur) cur.classList.remove("is-exit-fwd", "is-exit-back");

      dest.classList.remove("from-left");
      dest.classList.add("is-active");

      currentStep   = next;
      transitioning = false;

      updateSkip();
      updateProgressDots();
      updateFooter();
      scrollTop(dest);

      var first = dest.querySelector("button:not([tabindex='-1']), input, textarea");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 80);
    }, 160);
  }

  function scrollTop(stepEl) {
    if (stepEl) stepEl.scrollTop = 0;
  }

  function updateSkip() {
    if (!btnSkip) return;
    var skippable = currentStep === STEP_INTRO ||
      (currentStep >= SLIDE_FIRST && currentStep <= SLIDE_LAST);
    btnSkip.classList.toggle("is-visible", skippable);
  }

  /* ── Wire up buttons ── */

  if (btnEnter) {
    btnEnter.addEventListener("click", function () { goTo(STEP_PROBLEM, "fwd"); });
  }

  if (btnSkip) {
    btnSkip.addEventListener("click", function () { goTo(STEP_FORM, "fwd"); });
  }

  document.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = parseInt(btn.getAttribute("data-next"), 10);
      if (isNaN(target)) return;
      goTo(target, target < currentStep ? "back" : "fwd");
    });
  });

  document.addEventListener("click", function (e) {
    var dot = e.target.closest(".progress-dot[data-goto]");
    if (!dot) return;
    var target = parseInt(dot.getAttribute("data-goto"), 10);
    if (isNaN(target)) return;
    goTo(target, target < currentStep ? "back" : "fwd");
  });

  document.addEventListener("keydown", function (e) {
    var dot = e.target.closest(".progress-dot[data-goto]");
    if (!dot) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      var target = parseInt(dot.getAttribute("data-goto"), 10);
      if (isNaN(target)) return;
      goTo(target, target < currentStep ? "back" : "fwd");
    }
  });

  /* ── Swipe navigation ── */
  var touchX = 0, touchY = 0;

  document.addEventListener("touchstart", function (e) {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (currentStep < SLIDE_FIRST || currentStep > SLIDE_LAST) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && currentStep < SLIDE_LAST) {
      goTo(currentStep + 1, "fwd");
    } else if (dx > 0 && currentStep > SLIDE_FIRST) {
      goTo(currentStep - 1, "back");
    }
  }, { passive: true });

  /* ── Form validation ── */
  function clearErrors() {
    nameInput.classList.remove("is-error");
    emailInput.classList.remove("is-error");
    errName.textContent  = "";
    errName.classList.remove("is-visible");
    errEmail.textContent = "";
    errEmail.classList.remove("is-visible");
    bannerEl.className   = "form-banner";
    bannerEl.textContent = "";
  }

  function fieldErr(input, errEl, msg) {
    input.classList.add("is-error");
    errEl.textContent = msg;
    errEl.classList.add("is-visible");
  }

  function validate(name, email) {
    var ok = true;
    if (!name || name.trim().length < 2) {
      fieldErr(nameInput, errName, "Please enter your name.");
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fieldErr(emailInput, errEmail, "Please enter a valid email address.");
      ok = false;
    }
    return ok;
  }

  function setLoading(on) {
    btnSubmit.disabled = on;
    btnSubmit.classList.toggle("is-loading", on);
  }

  function showBanner(cls, msg) {
    bannerEl.className   = "form-banner " + cls;
    bannerEl.textContent = msg;
  }

  function submitToSupabase(payload) {
    return fetch(SUPABASE_URL + "/rest/v1/orbit_waitlist", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (res.status === 201 || res.status === 200) return { ok: true };
      return res.json().then(function (b) {
        return { ok: false, status: res.status, body: b };
      }).catch(function () {
        return { ok: false, status: res.status, body: null };
      });
    });
  }

  /* ── Bootstrap ── */
  buildProgressDots();
  updateSkip();
  updateProgressDots();
  updateFooter();

  fetch("/site-config.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg && cfg.supabase) {
        SUPABASE_URL      = String(cfg.supabase.url     || "").trim().replace(/\/$/, "");
        SUPABASE_ANON_KEY = String(cfg.supabase.anonKey || "").trim();
      }
    })
    .catch(function () {})
    .finally(function () {
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearErrors();

        var name    = nameInput.value;
        var email   = emailInput.value;
        var pain    = painInput    ? painInput.value.trim()    : "";
        var feature = featureInput ? featureInput.value.trim() : "";

        if (!validate(name, email)) {
          var first = form.querySelector(".is-error");
          if (first) first.focus();
          return;
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          showBanner("is-error", "Configuration error. Please try again later.");
          return;
        }

        setLoading(true);

        var payload = {
          name:  name.trim(),
          email: email.trim().toLowerCase(),
        };
        if (pain)    payload.pain_point      = pain;
        if (feature) payload.feature_request = feature;

        submitToSupabase(payload)
          .then(function (result) {
            if (result.ok) { goTo(STEP_SUCCESS, "fwd"); return; }

            var isDupe =
              result.status === 409 ||
              (result.body &&
                typeof result.body.message === "string" &&
                result.body.message.toLowerCase().indexOf("unique") !== -1);

            showBanner(
              isDupe ? "is-duplicate" : "is-error",
              isDupe
                ? "You are already on the list. We will be in touch when Orbit launches."
                : "Something went wrong. Please try again in a moment."
            );
          })
          .catch(function () {
            showBanner("is-error", "Connection error. Please check your internet and try again.");
          })
          .finally(function () { setLoading(false); });
      });
    });

})();
