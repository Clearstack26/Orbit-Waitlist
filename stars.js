/**
 * Orbit — immersive starfield animation.
 * Dense twinkling stars, frequent shooting stars, depth layers, nebula glow.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0;
  var dpr = 1;
  var animId;

  /* ── Tuning ─────────────────────────────────── */
  var STAR_COUNT          = 420;
  var DEEP_COUNT          = 180;   // tiny far-away layer
  var SHOOTING_MIN_MS     = 800;
  var SHOOTING_MAX_MS     = 2200;
  var MAX_CONCURRENT_SHOOTS = 5;
  /* ─────────────────────────────────────────────── */

  var stars = [];
  var deepStars = [];
  var shoots = [];
  var lastShoot = 0;
  var nextShootDelay = rand(SHOOTING_MIN_MS, SHOOTING_MAX_MS);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  /* ── Star colour palette ── */
  var PALETTE = [
    "255,255,255",   // white  — most common
    "255,255,255",
    "255,255,255",
    "210,235,255",   // blue-white
    "34,211,238",    // cyan
    "34,211,238",
    "168,85,247",    // purple
    "180,200,255",   // cool blue
    "255,210,180",   // warm orange (rare)
  ];

  function pickColor() {
    return PALETTE[randInt(0, PALETTE.length - 1)];
  }

  function makeStar(wide, tall) {
    return {
      x:     rand(0, wide),
      y:     rand(0, tall),
      r:     rand(0.4, 2.0),
      color: pickColor(),
      baseA: rand(0.3, 1.0),
      alpha: 0,
      speed: rand(0.005, 0.022),
      phase: rand(0, Math.PI * 2),
    };
  }

  function makeDeepStar(wide, tall) {
    return {
      x:     rand(0, wide),
      y:     rand(0, tall),
      r:     rand(0.2, 0.7),
      color: "210,225,255",
      baseA: rand(0.08, 0.35),
      alpha: 0,
      speed: rand(0.002, 0.009),
      phase: rand(0, Math.PI * 2),
    };
  }

  /* ── Shooting star ── */
  function makeShoot() {
    /* Varied entry angles — mostly left-to-right but some steep diagonals */
    var angle = rand(20, 65) * (Math.PI / 180);
    /* Sometimes flip and come from top-right */
    if (Math.random() < 0.25) angle = rand(115, 155) * (Math.PI / 180);

    var speed  = rand(6, 14);
    var length = rand(120, 320);
    var sx = rand(W * 0.05, W * 0.9);
    var sy = rand(0, H * 0.55);

    /* Brighter ones occasionally get a cyan or white tint */
    var tint = Math.random() < 0.4 ? "34,211,238" : "220,240,255";

    return {
      x:       sx,
      y:       sy,
      dx:      Math.cos(angle) * speed,
      dy:      Math.sin(angle) * speed,
      speed:   speed,
      length:  length,
      alpha:   rand(0.7, 1.0),
      decay:   rand(0.012, 0.025),
      tint:    tint,
      trail:   [],
      maxT:    Math.floor(length / speed),
      /* Glow head */
      glowR:   rand(1.5, 3.5),
    };
  }

  /* ── Resize / init ── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars     = [];
    deepStars = [];
    for (var i = 0; i < STAR_COUNT; i++) stars.push(makeStar(W, H));
    for (var j = 0; j < DEEP_COUNT;  j++) deepStars.push(makeDeepStar(W, H));
  }

  /* ── Draw deep (far) layer ── */
  function drawDeep(ts) {
    for (var i = 0; i < deepStars.length; i++) {
      var s = deepStars[i];
      s.phase += s.speed;
      s.alpha  = s.baseA * (0.6 + 0.4 * Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + s.color + "," + s.alpha.toFixed(3) + ")";
      ctx.fill();
    }
  }

  /* ── Draw main star layer ── */
  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.speed;
      s.alpha  = s.baseA * (0.5 + 0.5 * Math.sin(s.phase));

      /* Core dot */
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + s.color + "," + s.alpha.toFixed(3) + ")";
      ctx.fill();

      /* Soft glow halo on bigger/brighter stars */
      if (s.r > 1.1 && s.alpha > 0.55) {
        var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        glow.addColorStop(0, "rgba(" + s.color + "," + (s.alpha * 0.35).toFixed(3) + ")");
        glow.addColorStop(1, "rgba(" + s.color + ",0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      /* 4-point sparkle cross on the very brightest */
      if (s.r > 1.5 && s.alpha > 0.8) {
        var arm = s.r * 5;
        var aw  = s.r * 0.3;
        ctx.save();
        ctx.globalAlpha = s.alpha * 0.4;
        ctx.strokeStyle = "rgba(" + s.color + ",1)";
        ctx.lineWidth   = aw;
        ctx.lineCap     = "round";
        ctx.beginPath();
        ctx.moveTo(s.x - arm, s.y);
        ctx.lineTo(s.x + arm, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - arm);
        ctx.lineTo(s.x, s.y + arm);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ── Draw shooting stars ── */
  function drawShoots(ts) {
    /* Spawn new ones */
    if (shoots.length < MAX_CONCURRENT_SHOOTS && ts - lastShoot > nextShootDelay) {
      shoots.push(makeShoot());
      lastShoot      = ts;
      nextShootDelay = rand(SHOOTING_MIN_MS, SHOOTING_MAX_MS);
    }

    for (var j = shoots.length - 1; j >= 0; j--) {
      var ss = shoots[j];

      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.maxT) ss.trail.shift();

      ss.x += ss.dx;
      ss.y += ss.dy;
      ss.alpha -= ss.decay;

      if (ss.alpha <= 0 || ss.x < -60 || ss.x > W + 60 || ss.y > H + 60) {
        shoots.splice(j, 1);
        continue;
      }

      /* Trail gradient */
      if (ss.trail.length > 1) {
        for (var k = 1; k < ss.trail.length; k++) {
          var p   = k / ss.trail.length;
          var a   = ss.alpha * p * 0.85;
          if (a <= 0.01) continue;
          ctx.beginPath();
          ctx.moveTo(ss.trail[k - 1].x, ss.trail[k - 1].y);
          ctx.lineTo(ss.trail[k].x, ss.trail[k].y);
          ctx.strokeStyle = "rgba(" + ss.tint + "," + a.toFixed(3) + ")";
          ctx.lineWidth   = p * 2.2;
          ctx.lineCap     = "round";
          ctx.stroke();
        }
      }

      /* Glowing head */
      var hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, ss.glowR * 3);
      hg.addColorStop(0,   "rgba(" + ss.tint + "," + (ss.alpha * 0.9).toFixed(3) + ")");
      hg.addColorStop(0.4, "rgba(" + ss.tint + "," + (ss.alpha * 0.3).toFixed(3) + ")");
      hg.addColorStop(1,   "rgba(" + ss.tint + ",0)");
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.glowR * 3, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();
    }
  }

  /* ── Nebula ambient patches (static, drawn once on resize) ── */
  var nebulaCanvas = document.createElement("canvas");
  var nebCtx = nebulaCanvas.getContext("2d");

  function buildNebula() {
    nebulaCanvas.width  = Math.round(W * dpr);
    nebulaCanvas.height = Math.round(H * dpr);
    nebCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebCtx.clearRect(0, 0, W, H);

    var patches = [
      { x: W * 0.18, y: H * 0.22, rx: W * 0.35, ry: H * 0.28, color: "34,211,238",  a: 0.028 },
      { x: W * 0.78, y: H * 0.72, rx: W * 0.32, ry: H * 0.30, color: "168,85,247",  a: 0.032 },
      { x: W * 0.55, y: H * 0.45, rx: W * 0.25, ry: H * 0.22, color: "100,120,255", a: 0.018 },
      { x: W * 0.05, y: H * 0.80, rx: W * 0.28, ry: H * 0.25, color: "34,211,238",  a: 0.015 },
    ];

    patches.forEach(function (p) {
      var g = nebCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(p.rx, p.ry));
      g.addColorStop(0,   "rgba(" + p.color + "," + p.a + ")");
      g.addColorStop(0.5, "rgba(" + p.color + "," + (p.a * 0.4) + ")");
      g.addColorStop(1,   "rgba(" + p.color + ",0)");
      nebCtx.save();
      nebCtx.scale(p.rx / Math.max(p.rx, p.ry), p.ry / Math.max(p.rx, p.ry));
      var sx = p.x / (p.rx / Math.max(p.rx, p.ry));
      var sy = p.y / (p.ry / Math.max(p.rx, p.ry));
      nebCtx.beginPath();
      nebCtx.arc(sx, sy, Math.max(p.rx, p.ry), 0, Math.PI * 2);
      nebCtx.fillStyle = g;
      nebCtx.fill();
      nebCtx.restore();
    });
  }

  /* ── Main render loop ── */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    /* Nebula layer */
    ctx.drawImage(nebulaCanvas, 0, 0, W, H);

    drawDeep(ts);
    drawStars(ts);
    drawShoots(ts);

    animId = requestAnimationFrame(draw);
  }

  /* ── Init ── */
  resize();
  buildNebula();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(animId);
      resize();
      buildNebula();
      animId = requestAnimationFrame(draw);
    }, 150);
  });

  animId = requestAnimationFrame(draw);
})();
