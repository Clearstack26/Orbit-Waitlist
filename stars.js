/**
 * Orbit — animated dot-grid background.
 * Structured dot lattice with gentle pulse and ripple-wave on demand.
 * Replaces the starfield to give a premium SaaS aesthetic.
 * Public API: window.orbitShoot() — fires an expanding ripple wave.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var animId;

  /* ── Tuning ─── */
  var SPACING     = 52;    // px between dot centres
  var DOT_R       = 1.2;   // base dot radius
  var PULSE_SPEED = 0.006; // phase increment per frame
  var RIPPLES     = [];    // active ripple waves
  /* ─────────────── */

  var dots = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function buildGrid() {
    dots = [];
    var cols = Math.ceil(W / SPACING) + 2;
    var rows = Math.ceil(H / SPACING) + 2;
    var offX = ((W % SPACING) / 2);
    var offY = ((H % SPACING) / 2);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = offX + c * SPACING;
        var y = offY + r * SPACING;
        /* Radial intensity: dots near viewport centre glow a touch more */
        var dx = (x - W / 2) / (W / 2);
        var dy = (y - H / 2) / (H / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var centreBoost = Math.max(0, 1 - dist * 0.85); // 0–1
        dots.push({
          x: x,
          y: y,
          phase: rand(0, Math.PI * 2),
          baseA: 0.10 + centreBoost * 0.10, // 0.10–0.20
          ampA:  0.06 + centreBoost * 0.06, // pulse amplitude
        });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  }

  /* ── Ripple ── */
  function makeRipple() {
    return {
      x:     rand(W * 0.2, W * 0.8),
      y:     rand(H * 0.2, H * 0.8),
      r:     0,
      speed: rand(4.5, 7),
      maxR:  rand(Math.max(W, H) * 0.5, Math.max(W, H) * 0.85),
      alpha: 0.75,
      decay: rand(0.008, 0.013),
      width: rand(30, 55),  // wave band thickness
    };
  }

  /* ── Static render (reduced-motion) ── */
  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(180,170,255," + d.baseA.toFixed(3) + ")";
      ctx.fill();
    }
  }

  /* ── Animated render loop ── */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    /* Advance ripples */
    for (var j = RIPPLES.length - 1; j >= 0; j--) {
      RIPPLES[j].r     += RIPPLES[j].speed;
      RIPPLES[j].alpha -= RIPPLES[j].decay;
      if (RIPPLES[j].alpha <= 0 || RIPPLES[j].r > RIPPLES[j].maxR) {
        RIPPLES.splice(j, 1);
      }
    }

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      d.phase += PULSE_SPEED;

      /* Base pulse */
      var a = d.baseA + d.ampA * Math.sin(d.phase);

      /* Ripple boost: check each active ripple */
      for (var k = 0; k < RIPPLES.length; k++) {
        var rip = RIPPLES[k];
        var ddx = d.x - rip.x;
        var ddy = d.y - rip.y;
        var distToRip = Math.sqrt(ddx * ddx + ddy * ddy);
        var delta = Math.abs(distToRip - rip.r);
        if (delta < rip.width) {
          /* Gaussian falloff across the wave band */
          var norm = delta / rip.width;
          var boost = rip.alpha * Math.exp(-norm * norm * 3.5);
          a += boost * 0.55;
        }
      }

      a = Math.min(a, 0.92);

      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(190,175,255," + a.toFixed(3) + ")";
      ctx.fill();

      /* Soft glow on boosted dots */
      if (a > 0.35) {
        var gr = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, DOT_R * 5);
        gr.addColorStop(0, "rgba(180,160,255," + (a * 0.22).toFixed(3) + ")");
        gr.addColorStop(1, "rgba(180,160,255,0)");
        ctx.beginPath();
        ctx.arc(d.x, d.y, DOT_R * 5, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(draw);
  }

  /* ── Public API: fire a ripple wave on demand (replaces shooting star) ── */
  window.orbitShoot = function () {
    if (reducedMotion) return;
    RIPPLES.push(makeRipple());
  };

  /* ── Init ── */
  resize();

  if (reducedMotion) {
    drawStatic();
  } else {
    animId = requestAnimationFrame(draw);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(animId);
      resize();
      if (reducedMotion) {
        drawStatic();
      } else {
        animId = requestAnimationFrame(draw);
      }
    }, 150);
  });
})();
