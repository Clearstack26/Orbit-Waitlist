/**
 * Orbit Waitlist — form submission handler.
 * Submits to Supabase REST API. No SDK required.
 */
(function () {
  var SUPABASE_URL = "";
  var SUPABASE_ANON_KEY = "";

  var form = document.getElementById("waitlist-form");
  var formState = document.getElementById("form-state");
  var successState = document.getElementById("success-state");
  var btnSubmit = document.getElementById("btn-submit");
  var bannerEl = document.getElementById("form-banner");

  var nameInput = document.getElementById("field-name");
  var emailInput = document.getElementById("field-email");
  var errName = document.getElementById("err-name");
  var errEmail = document.getElementById("err-email");

  if (!form) return;

  function clearErrors() {
    nameInput.classList.remove("is-error");
    emailInput.classList.remove("is-error");
    errName.textContent = "";
    errName.classList.remove("is-visible");
    errEmail.textContent = "";
    errEmail.classList.remove("is-visible");
    bannerEl.className = "form-banner";
    bannerEl.textContent = "";
  }

  function setFieldError(input, errEl, msg) {
    input.classList.add("is-error");
    errEl.textContent = msg;
    errEl.classList.add("is-visible");
  }

  function validate(name, email) {
    var valid = true;

    if (!name || name.trim().length < 2) {
      setFieldError(nameInput, errName, "Please enter your name.");
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError(emailInput, errEmail, "Please enter a valid email address.");
      valid = false;
    }

    return valid;
  }

  function setLoading(loading) {
    btnSubmit.disabled = loading;
    btnSubmit.classList.toggle("is-loading", loading);
  }

  function showBanner(type, msg) {
    bannerEl.className = "form-banner " + type;
    bannerEl.textContent = msg;
  }

  function showSuccess() {
    formState.classList.add("is-hidden");
    successState.classList.add("is-visible");
    successState.focus();
  }

  function loadConfig() {
    return fetch("/site-config.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (cfg && cfg.supabase) {
          SUPABASE_URL = String(cfg.supabase.url || "").trim().replace(/\/$/, "");
          SUPABASE_ANON_KEY = String(cfg.supabase.anonKey || "").trim();
        }
      })
      .catch(function () {});
  }

  function submitToSupabase(name, email) {
    var url = SUPABASE_URL + "/rest/v1/orbit_waitlist";
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
    }).then(function (res) {
      if (res.status === 201 || res.status === 200) {
        return { ok: true };
      }
      return res.json().then(function (body) {
        return { ok: false, status: res.status, body: body };
      }).catch(function () {
        return { ok: false, status: res.status, body: null };
      });
    });
  }

  loadConfig().then(function () {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors();

      var name = nameInput.value;
      var email = emailInput.value;

      if (!validate(name, email)) {
        var firstErr = form.querySelector(".is-error");
        if (firstErr) firstErr.focus();
        return;
      }

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        showBanner("is-error", "Configuration error. Please try again later.");
        return;
      }

      setLoading(true);

      submitToSupabase(name, email)
        .then(function (result) {
          if (result.ok) {
            showSuccess();
            return;
          }

          var isUnique =
            result.status === 409 ||
            (result.body &&
              typeof result.body.message === "string" &&
              result.body.message.toLowerCase().indexOf("unique") !== -1);

          if (isUnique) {
            showBanner(
              "is-duplicate",
              "You're already on the list! We'll be in touch when Orbit launches."
            );
          } else {
            showBanner(
              "is-error",
              "Something went wrong. Please try again in a moment."
            );
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
