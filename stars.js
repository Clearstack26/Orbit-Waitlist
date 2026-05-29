/**
 * Orbit — starfield with shooting stars.
 * ~100 twinkling stars, 1-2 shooting stars every 3-5 seconds.
 * Respects prefers-reduced-motion.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var animId;

  /* ── Tuning ─── */
  var STAR_COUNT        = 100;
  var DEEP_COUNT        = 50;
  var SHOOT_MIN_MS      = 3000;
  var SHOOT_MAX_MS      = 5500;
  var MAX_SHOOTS        = 2;
  /* ─────────────── */

  var stars = [];
  var deepStars = [];
  var shoots = [];
  var lastShoot = 0;
  var nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  var PALETTE = [
    "255,255,255",
    "255,255,255",
    "220,200,255",   // soft violet-white
    "200,160,255",   // lavender
    "180,120,255",   // purple
    "180,120,255",
    "210,180,255",   // pale purple
    "240,230,255",   // near-white with purple tint
    "34,211,238",    // cyan accent (rare)
  ];

  function pickColor() { return PALETTE[randInt(0, PALETTE.length - 1)]; }

  function makeStar(wide, tall) {
    return {
      x: rand(0, wide), y: rand(0, tall),
      r: rand(0.4, 1.8),
      color: pickColor(),
      baseA: rand(0.3, 0.95),
      speed: rand(0.005, 0.02),
      phase: rand(0, Math.PI * 2),
    };
  }

  function makeDeepStar(wide, tall) {
    return {
      x: rand(0, wide), y: rand(0, tall),
      r: rand(0.2, 0.6),
      baseA: rand(0.08, 0.32),
      speed: rand(0.002, 0.008),
      phase: rand(0, Math.PI * 2),
    };
  }

  function makeShoot() {
    var angle = rand(22, 58) * (Math.PI / 180);
    if (Math.random() < 0.2) angle = rand(122, 155) * (Math.PI / 180);
    var speed  = rand(7, 13);
    var length = rand(130, 300);
    var tint   = Math.random() < 0.45 ? "34,211,238" : "220,240,255";
    return {
      x: rand(W * 0.05, W * 0.85),
      y: rand(0, H * 0.5),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      alpha: rand(0.7, 1.0),
      decay: rand(0.014, 0.022),
      tint: tint,
      trail: [],
      maxT: Math.floor(length / speed),
      glowR: rand(1.5, 3.0),
    };
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

    stars = [];
    deepStars = [];
    for (var i = 0; i < STAR_COUNT; i++) stars.push(makeStar(W, H));
    for (var j = 0; j < DEEP_COUNT;  j++) deepStars.push(makeDeepStar(W, H));
  }

  /* ── Static render (reduced-motion) ── */
  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < deepStars.length; i++) {
      var s = deepStars[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(210,225,255," + s.baseA.toFixed(3) + ")";
      ctx.fill();
    }
    for (var j = 0; j < stars.length; j++) {
      var st = stars[j];
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + st.color + "," + st.baseA.toFixed(3) + ")";
      ctx.fill();
    }
  }

  /* ── Animated render loop ── */
  function drawDeep() {
    for (var i = 0; i < deepStars.length; i++) {
      var s = deepStars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.6 + 0.4 * Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(210,225,255," + a.toFixed(3) + ")";
      ctx.fill();
    }
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.5 + 0.5 * Math.sin(s.phase));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + s.color + "," + a.toFixed(3) + ")";
      ctx.fill();

      /* Soft glow on larger bright stars */
      if (s.r > 1.1 && a > 0.6) {
        var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        glow.addColorStop(0, "rgba(" + s.color + "," + (a * 0.3).toFixed(3) + ")");
        glow.addColorStop(1, "rgba(" + s.color + ",0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }
  }

  function drawShoots(ts) {
    /* Spawn */
    if (shoots.length < MAX_SHOOTS && ts - lastShoot > nextShootDelay) {
      shoots.push(makeShoot());
      lastShoot = ts;
      nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);
    }

    for (var j = shoots.length - 1; j >= 0; j--) {
      var ss = shoots[j];

      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.maxT) ss.trail.shift();

      ss.x += ss.dx;
      ss.y += ss.dy;
      ss.alpha -= ss.decay;

      if (ss.alpha <= 0 || ss.x < -80 || ss.x > W + 80 || ss.y > H + 80) {
        shoots.splice(j, 1);
        continue;
      }

      /* Trail */
      if (ss.trail.length > 1) {
        for (var k = 1; k < ss.trail.length; k++) {
          var p = k / ss.trail.length;
          var a = ss.alpha * p * 0.8;
          if (a <= 0.01) continue;
          ctx.beginPath();
          ctx.moveTo(ss.trail[k - 1].x, ss.trail[k - 1].y);
          ctx.lineTo(ss.trail[k].x, ss.trail[k].y);
          ctx.strokeStyle = "rgba(" + ss.tint + "," + a.toFixed(3) + ")";
          ctx.lineWidth = p * 2.0;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      /* Glowing head */
      var hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, ss.glowR * 3);
      hg.addColorStop(0,   "rgba(" + ss.tint + "," + (ss.alpha * 0.9).toFixed(3) + ")");
      hg.addColorStop(0.4, "rgba(" + ss.tint + "," + (ss.alpha * 0.25).toFixed(3) + ")");
      hg.addColorStop(1,   "rgba(" + ss.tint + ",0)");
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.glowR * 3, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();
    }
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    drawDeep();
    drawStars();
    drawShoots(ts);
    animId = requestAnimationFrame(draw);
  }

  /* ── Public API: fire a shooting star on demand ── */
  window.orbitShoot = function () {
    if (reducedMotion) return;
    shoots.push(makeShoot());
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
