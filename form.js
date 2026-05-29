/**
 * Orbit Waitlist — step manager + form submission.
 */
(function () {

  /* ── Step constants ── */
  var STEP_INTRO   = 0;
  var STEP_PROBLEM = 1;
  var STEP_SOLUTION= 2;
  var STEP_OUTCOME = 3;
  var STEP_FORM    = 4;
  var STEP_SUCCESS = 5;

  var currentStep = STEP_INTRO;
  var transitioning = false;

  /* ── Supabase ── */
  var SUPABASE_URL      = "";
  var SUPABASE_ANON_KEY = "";

  /* ── Elements ── */
  var btnEnter  = document.getElementById("btn-enter");
  var btnNext1  = document.getElementById("btn-next-1");
  var btnNext2  = document.getElementById("btn-next-2");
  var btnNext3  = document.getElementById("btn-next-3");
  var btnSkip   = document.getElementById("btn-skip");

  var form      = document.getElementById("waitlist-form");
  var formState = document.getElementById("form-state");
  var btnSubmit = document.getElementById("btn-submit");
  var bannerEl  = document.getElementById("form-banner");

  var nameInput    = document.getElementById("field-name");
  var emailInput   = document.getElementById("field-email");
  var featureInput = document.getElementById("field-feature");
  var painInput    = document.getElementById("field-pain");
  var errName      = document.getElementById("err-name");
  var errEmail     = document.getElementById("err-email");

  /* ── Step navigation ── */
  function getStepEl(n) { return document.getElementById("step-" + n); }

  function goTo(next) {
    if (transitioning || next === currentStep) return;
    transitioning = true;

    var cur  = getStepEl(currentStep);
    var dest = getStepEl(next);
    if (!dest) { transitioning = false; return; }

    /* Exit current */
    if (cur) {
      cur.classList.add("is-exit");
      cur.classList.remove("is-active");
    }

    /* Enter next after a brief delay (lets exit animation start) */
    setTimeout(function () {
      if (cur) cur.classList.remove("is-exit");
      dest.classList.add("is-active");
      currentStep = next;
      transitioning = false;

      /* Show / hide skip button (visible only on slides 1-3) */
      updateSkip();

      /* Focus management */
      var firstFocus = dest.querySelector("button, input, textarea, [tabindex]");
      if (firstFocus) setTimeout(function () { firstFocus.focus({ preventScroll: true }); }, 60);
    }, 180);
  }

  function updateSkip() {
    if (!btnSkip) return;
    var onSlide = currentStep >= STEP_PROBLEM && currentStep <= STEP_OUTCOME;
    btnSkip.classList.toggle("is-visible", onSlide);
  }

  /* ── Button wiring ── */
  if (btnEnter)  btnEnter.addEventListener("click",  function () { goTo(STEP_PROBLEM);  });
  if (btnNext1)  btnNext1.addEventListener("click",  function () { goTo(STEP_SOLUTION); });
  if (btnNext2)  btnNext2.addEventListener("click",  function () { goTo(STEP_OUTCOME);  });
  if (btnNext3)  btnNext3.addEventListener("click",  function () { goTo(STEP_FORM);     });
  if (btnSkip)   btnSkip.addEventListener("click",   function () { goTo(STEP_FORM);     });

  /* ── Form validation ── */
  function clearErrors() {
    nameInput.classList.remove("is-error");
    emailInput.classList.remove("is-error");
    errName.textContent  = "";  errName.classList.remove("is-visible");
    errEmail.textContent = "";  errEmail.classList.remove("is-visible");
    bannerEl.className = "form-banner";
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

  function showBanner(type, msg) {
    bannerEl.className = "form-banner " + type;
    bannerEl.textContent = msg;
  }

  /* ── Supabase submit ── */
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
      return res.json().then(function (body) {
        return { ok: false, status: res.status, body: body };
      }).catch(function () {
        return { ok: false, status: res.status, body: null };
      });
    });
  }

  /* ── Load config then wire form ── */
  fetch("/site-config.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg && cfg.supabase) {
        SUPABASE_URL      = String(cfg.supabase.url      || "").trim().replace(/\/$/, "");
        SUPABASE_ANON_KEY = String(cfg.supabase.anonKey  || "").trim();
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
        var feature = featureInput ? featureInput.value.trim() : "";
        var pain    = painInput    ? painInput.value.trim()    : "";

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
        if (feature) payload.feature_request = feature;
        if (pain)    payload.pain_point       = pain;

        submitToSupabase(payload)
          .then(function (result) {
            if (result.ok) {
              goTo(STEP_SUCCESS);
              return;
            }
            var isDupe =
              result.status === 409 ||
              (result.body &&
                typeof result.body.message === "string" &&
                result.body.message.toLowerCase().indexOf("unique") !== -1);

            if (isDupe) {
              showBanner("is-duplicate", "You're already on the list! We'll be in touch when Orbit launches.");
            } else {
              showBanner("is-error", "Something went wrong. Please try again in a moment.");
            }
          })
          .catch(function () {
            showBanner("is-error", "Connection error. Please check your internet and try again.");
          })
          .finally(function () {
            setLoading(false);
          });
      });
    });

})();
