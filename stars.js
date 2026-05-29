/**
 * Orbit — lightweight starfield. 60fps on any phone.
 * Twinkling stars + fast long shooting stars from all edges. No gradients per frame.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, dpr = 1;
  var animId;

  /* ── Config ── */
  var STAR_COUNT   = 280;
  var DEEP_COUNT   = 100;
  var SHOOT_MIN_MS = 700;
  var SHOOT_MAX_MS = 1600;
  var MAX_SHOOTS   = 4;

  var stars     = [];
  var deepStars = [];
  var shoots    = [];
  var lastShoot      = 0;
  var nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);

  /* Nebula — pre-rendered once, never redrawn */
  var nebCanvas = document.createElement("canvas");
  var nebCtx    = nebCanvas.getContext("2d");

  /* ── Helpers ── */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b)); }

  var COLORS = [
    "255,255,255", "255,255,255", "255,255,255",
    "210,230,255", "210,230,255",
    "34,211,238",
    "168,85,247",
  ];
  function pickColor() { return COLORS[randInt(0, COLORS.length)]; }

  /* ── Star factories ── */
  function makeStar() {
    return {
      x:     rand(0, W),
      y:     rand(0, H),
      r:     rand(0.4, 1.8),
      color: pickColor(),
      baseA: rand(0.25, 0.95),
      speed: rand(0.005, 0.022),
      phase: rand(0, Math.PI * 2),
    };
  }

  function makeDeep() {
    return {
      x:     rand(0, W),
      y:     rand(0, H),
      r:     rand(0.15, 0.55),
      baseA: rand(0.05, 0.22),
      speed: rand(0.002, 0.008),
      phase: rand(0, Math.PI * 2),
    };
  }

  /* ── Shooting star — from any edge, long trail ── */
  function makeShoot() {
    var edge = randInt(0, 4);
    var sx, sy, angle;

    if (edge === 0) {        /* top → down-right */
      sx    = rand(W * 0.05, W * 0.85);
      sy    = -8;
      angle = rand(28, 62) * (Math.PI / 180);
    } else if (edge === 1) { /* right → down-left */
      sx    = W + 8;
      sy    = rand(0, H * 0.55);
      angle = rand(145, 205) * (Math.PI / 180);
    } else if (edge === 2) { /* bottom → up-right */
      sx    = rand(W * 0.05, W * 0.95);
      sy    = H + 8;
      angle = rand(235, 305) * (Math.PI / 180);
    } else {                  /* left → right */
      sx    = -8;
      sy    = rand(0, H * 0.65);
      angle = rand(-28, 28) * (Math.PI / 180);
    }

    var speed  = rand(10, 20);     /* fast */
    var trailLen = rand(160, 340); /* long */
    var maxT   = Math.floor(trailLen / speed);
    var tint   = Math.random() < 0.4 ? "34,211,238" : "220,235,255";

    return {
      x:     sx,
      y:     sy,
      dx:    Math.cos(angle) * speed,
      dy:    Math.sin(angle) * speed,
      alpha: rand(0.7, 1.0),
      decay: rand(0.016, 0.030),
      tint:  tint,
      trail: [],
      maxT:  maxT,
    };
  }

  /* ── Nebula — drawn once ── */
  function buildNebula() {
    nebCanvas.width  = Math.round(W * dpr);
    nebCanvas.height = Math.round(H * dpr);
    nebCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebCtx.clearRect(0, 0, W, H);

    var patches = [
      { x: W * 0.14, y: H * 0.18, r: W * 0.40, c: "34,211,238",  a: 0.028 },
      { x: W * 0.82, y: H * 0.74, r: W * 0.36, c: "168,85,247",  a: 0.032 },
      { x: W * 0.50, y: H * 0.50, r: W * 0.26, c: "100,120,255", a: 0.016 },
      { x: W * 0.06, y: H * 0.84, r: W * 0.24, c: "34,211,238",  a: 0.014 },
      { x: W * 0.88, y: H * 0.10, r: W * 0.20, c: "168,85,247",  a: 0.018 },
    ];

    patches.forEach(function (p) {
      var g = nebCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0,   "rgba(" + p.c + "," + p.a + ")");
      g.addColorStop(0.5, "rgba(" + p.c + "," + (p.a * 0.35) + ")");
      g.addColorStop(1,   "rgba(" + p.c + ",0)");
      nebCtx.beginPath();
      nebCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      nebCtx.fillStyle = g;
      nebCtx.fill();
    });
  }

  /* ── Resize / init ── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W   = window.innerWidth;
    H   = window.innerHeight;
    canvas.width        = Math.round(W * dpr);
    canvas.height       = Math.round(H * dpr);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = [], deepStars = [];
    for (var i = 0; i < STAR_COUNT; i++) stars.push(makeStar());
    for (var j = 0; j < DEEP_COUNT;  j++) deepStars.push(makeDeep());
  }

  /* ── Draw deep layer ── */
  function drawDeep() {
    for (var i = 0; i < deepStars.length; i++) {
      var s = deepStars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.55 + 0.45 * Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,218,255," + a.toFixed(3) + ")";
      ctx.fill();
    }
  }

  /* ── Draw main stars — shadowBlur only on the brightest ── */
  function drawStars() {
    /* Batch: normal stars first, no shadow */
    ctx.shadowBlur = 0;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.48 + 0.52 * Math.sin(s.phase));
      s._a = a; /* cache for glow pass */

      if (s.r <= 1.2 || a <= 0.65) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + s.color + "," + a.toFixed(3) + ")";
        ctx.fill();
      }
    }

    /* Glow pass: only bright large stars — batched shadowBlur */
    ctx.shadowBlur  = 8;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.r > 1.2 && s._a > 0.65) {
        ctx.shadowColor = "rgba(" + s.color + ",0.7)";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + s.color + "," + s._a.toFixed(3) + ")";
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  /* ── Draw shooting stars ── */
  function drawShoots(ts) {
    /* Spawn */
    if (shoots.length < MAX_SHOOTS && ts - lastShoot > nextShootDelay) {
      shoots.push(makeShoot());
      lastShoot      = ts;
      nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);
    }

    ctx.lineCap = "round";

    for (var j = shoots.length - 1; j >= 0; j--) {
      var ss = shoots[j];

      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.maxT) ss.trail.shift();

      ss.x     += ss.dx;
      ss.y     += ss.dy;
      ss.alpha -= ss.decay;

      var oob = ss.x < -60 || ss.x > W + 60 || ss.y < -60 || ss.y > H + 60;
      if (ss.alpha <= 0 || oob) { shoots.splice(j, 1); continue; }

      /* Single-pass trail — one polyline with varying width + opacity */
      var tLen = ss.trail.length;
      for (var k = 1; k < tLen; k++) {
        var p = k / tLen;
        var a = ss.alpha * p * 0.9;
        if (a < 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(ss.trail[k - 1].x, ss.trail[k - 1].y);
        ctx.lineTo(ss.trail[k].x,     ss.trail[k].y);
        ctx.strokeStyle = "rgba(" + ss.tint + "," + a.toFixed(2) + ")";
        ctx.lineWidth   = p * 2.0;
        ctx.stroke();
      }

      /* Bright head dot */
      ctx.shadowBlur  = 10;
      ctx.shadowColor = "rgba(" + ss.tint + ",0.8)";
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + ss.tint + "," + ss.alpha.toFixed(2) + ")";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /* ── Main loop ── */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(nebCanvas, 0, 0, W, H);
    drawDeep();
    drawStars();
    drawShoots(ts);
    animId = requestAnimationFrame(draw);
  }

  /* ── Boot ── */
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
