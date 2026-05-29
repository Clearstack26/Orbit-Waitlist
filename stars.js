/**
 * Orbit — immersive starfield.
 * Dense twinkling stars · shooting stars from ALL edges · sporadic fiery meteors.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, dpr = 1;
  var animId;

  /* ── Config ─── */
  var STAR_COUNT      = 450;
  var DEEP_COUNT      = 200;
  var SHOOT_MIN_MS    = 600;
  var SHOOT_MAX_MS    = 1800;
  var MAX_SHOOTS      = 7;
  var METEOR_MIN_MS   = 18000;
  var METEOR_MAX_MS   = 35000;
  /* ──────────────── */

  var stars      = [];
  var deepStars  = [];
  var shoots     = [];
  var meteors    = [];

  var lastShoot      = 0;
  var nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);
  var lastMeteor     = 0;
  var nextMeteorDelay = rand(METEOR_MIN_MS, METEOR_MAX_MS);

  /* Off-screen nebula cache */
  var nebCanvas  = document.createElement("canvas");
  var nebCtx     = nebCanvas.getContext("2d");

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  var PALETTE = [
    "255,255,255","255,255,255","255,255,255",
    "210,235,255","210,235,255",
    "34,211,238","34,211,238",
    "168,85,247",
    "180,200,255",
    "255,220,160",
  ];

  /* ── Stars ── */
  function makeStar(W, H) {
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(0.35, 2.1),
      color: pick(PALETTE),
      baseA: rand(0.25, 1.0),
      speed: rand(0.004, 0.024),
      phase: rand(0, Math.PI * 2),
    };
  }
  function makeDeep(W, H) {
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(0.18, 0.65),
      baseA: rand(0.06, 0.3),
      speed: rand(0.002, 0.008),
      phase: rand(0, Math.PI * 2),
    };
  }

  /* ── Shooting star — from any of 4 edges ── */
  function makeShoot() {
    var edge = randInt(0, 3); // 0=top 1=right 2=bottom 3=left
    var sx, sy, angle;

    if (edge === 0) {          /* top → diagonal down */
      sx = rand(W * 0.05, W * 0.9);
      sy = -20;
      angle = rand(25, 65) * (Math.PI / 180);
    } else if (edge === 1) {   /* right → diagonal left-down */
      sx = W + 20;
      sy = rand(H * 0.0, H * 0.6);
      angle = rand(140, 200) * (Math.PI / 180);
    } else if (edge === 2) {   /* bottom → diagonal up */
      sx = rand(W * 0.05, W * 0.95);
      sy = H + 20;
      angle = rand(230, 300) * (Math.PI / 180);
    } else {                   /* left → diagonal right */
      sx = -20;
      sy = rand(H * 0.0, H * 0.7);
      angle = rand(-30, 30) * (Math.PI / 180);
    }

    var speed  = rand(7, 15);
    var length = rand(100, 280);
    var tint   = Math.random() < 0.45 ? "34,211,238" : "210,235,255";

    return {
      x: sx, y: sy,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      alpha: rand(0.65, 1.0),
      decay: rand(0.014, 0.028),
      tint: tint,
      trail: [],
      maxT: Math.floor(length / speed),
      glowR: rand(1.2, 3.2),
    };
  }

  /* ── Fiery meteor ── */
  function makeMeteor() {
    /* Always travels left-to-right across the screen, steep-ish */
    var angle = rand(18, 42) * (Math.PI / 180);
    var speed = rand(2.8, 5.0);
    var startX = rand(-W * 0.3, W * 0.1);
    var startY = rand(-H * 0.1, H * 0.35);
    var radius = rand(10, 18);

    return {
      x: startX, y: startY,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      r: radius,
      alpha: 1.0,
      decay: rand(0.003, 0.007),
      trail: [],
      maxT: 220,
      done: false,
    };
  }

  /* ── Nebula ── */
  function buildNebula() {
    nebCanvas.width  = Math.round(W * dpr);
    nebCanvas.height = Math.round(H * dpr);
    nebCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebCtx.clearRect(0, 0, W, H);

    [
      { x: W * 0.15, y: H * 0.20, rx: W * 0.38, ry: H * 0.32, c: "34,211,238",  a: 0.030 },
      { x: W * 0.82, y: H * 0.75, rx: W * 0.34, ry: H * 0.32, c: "168,85,247",  a: 0.034 },
      { x: W * 0.50, y: H * 0.50, rx: W * 0.28, ry: H * 0.25, c: "100,120,255", a: 0.018 },
      { x: W * 0.05, y: H * 0.85, rx: W * 0.25, ry: H * 0.22, c: "34,211,238",  a: 0.016 },
      { x: W * 0.90, y: H * 0.12, rx: W * 0.22, ry: H * 0.20, c: "168,85,247",  a: 0.020 },
    ].forEach(function (p) {
      var maxR = Math.max(p.rx, p.ry);
      var scaleX = p.rx / maxR, scaleY = p.ry / maxR;
      var grd = nebCtx.createRadialGradient(0, 0, 0, 0, 0, maxR);
      grd.addColorStop(0,   "rgba(" + p.c + "," + p.a + ")");
      grd.addColorStop(0.5, "rgba(" + p.c + "," + (p.a * 0.38) + ")");
      grd.addColorStop(1,   "rgba(" + p.c + ",0)");
      nebCtx.save();
      nebCtx.translate(p.x, p.y);
      nebCtx.scale(scaleX, scaleY);
      nebCtx.beginPath();
      nebCtx.arc(0, 0, maxR, 0, Math.PI * 2);
      nebCtx.fillStyle = grd;
      nebCtx.fill();
      nebCtx.restore();
    });
  }

  /* ── Resize ── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = [], deepStars = [];
    for (var i = 0; i < STAR_COUNT; i++) stars.push(makeStar(W, H));
    for (var j = 0; j < DEEP_COUNT;  j++) deepStars.push(makeDeep(W, H));
  }

  /* ── Draw ── */
  function drawDeep() {
    for (var i = 0; i < deepStars.length; i++) {
      var s = deepStars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.55 + 0.45 * Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,220,255," + a.toFixed(3) + ")";
      ctx.fill();
    }
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.speed;
      var a = s.baseA * (0.48 + 0.52 * Math.sin(s.phase));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + s.color + "," + a.toFixed(3) + ")";
      ctx.fill();

      if (s.r > 1.0 && a > 0.52) {
        var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4.5);
        glow.addColorStop(0, "rgba(" + s.color + "," + (a * 0.32).toFixed(3) + ")");
        glow.addColorStop(1, "rgba(" + s.color + ",0)");
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      if (s.r > 1.55 && a > 0.78) {
        var arm = s.r * 5.5;
        ctx.save();
        ctx.globalAlpha = a * 0.38;
        ctx.strokeStyle = "rgba(" + s.color + ",1)";
        ctx.lineWidth = s.r * 0.28;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x - arm, s.y); ctx.lineTo(s.x + arm, s.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x, s.y - arm); ctx.lineTo(s.x, s.y + arm); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawShoots(ts) {
    if (shoots.length < MAX_SHOOTS && ts - lastShoot > nextShootDelay) {
      shoots.push(makeShoot());
      lastShoot = ts;
      nextShootDelay = rand(SHOOT_MIN_MS, SHOOT_MAX_MS);
    }

    for (var j = shoots.length - 1; j >= 0; j--) {
      var ss = shoots[j];
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.maxT) ss.trail.shift();
      ss.x += ss.dx; ss.y += ss.dy;
      ss.alpha -= ss.decay;

      var oob = ss.x < -80 || ss.x > W + 80 || ss.y < -80 || ss.y > H + 80;
      if (ss.alpha <= 0 || oob) { shoots.splice(j, 1); continue; }

      ctx.lineCap = "round";
      for (var k = 1; k < ss.trail.length; k++) {
        var p = k / ss.trail.length;
        var a = ss.alpha * p * 0.85;
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(ss.trail[k-1].x, ss.trail[k-1].y);
        ctx.lineTo(ss.trail[k].x, ss.trail[k].y);
        ctx.strokeStyle = "rgba(" + ss.tint + "," + a.toFixed(3) + ")";
        ctx.lineWidth = p * 2.2;
        ctx.stroke();
      }

      var hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, ss.glowR * 3);
      hg.addColorStop(0,   "rgba(" + ss.tint + "," + (ss.alpha * 0.95).toFixed(3) + ")");
      hg.addColorStop(0.4, "rgba(" + ss.tint + "," + (ss.alpha * 0.25).toFixed(3) + ")");
      hg.addColorStop(1,   "rgba(" + ss.tint + ",0)");
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.glowR * 3, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();
    }
  }

  function drawMeteors(ts) {
    if (meteors.length === 0 && ts - lastMeteor > nextMeteorDelay) {
      meteors.push(makeMeteor());
      lastMeteor = ts;
      nextMeteorDelay = rand(METEOR_MIN_MS, METEOR_MAX_MS);
    }

    for (var m = meteors.length - 1; m >= 0; m--) {
      var mt = meteors[m];
      mt.trail.push({ x: mt.x, y: mt.y });
      if (mt.trail.length > mt.maxT) mt.trail.shift();
      mt.x += mt.dx; mt.y += mt.dy;
      mt.alpha -= mt.decay;

      if (mt.alpha <= 0 || mt.x > W + 100 || mt.y > H + 100) {
        meteors.splice(m, 1); continue;
      }

      /* Fire trail — orange/yellow/red gradient */
      ctx.save();
      ctx.lineCap = "round";
      for (var k = 1; k < mt.trail.length; k++) {
        var p  = k / mt.trail.length;
        var ta = mt.alpha * p;
        if (ta <= 0.01) continue;

        /* Colour shifts from white-hot head → orange → red → transparent */
        var r, g, b;
        if (p > 0.85) { r = 255; g = 240; b = 200; }       // white-yellow
        else if (p > 0.65) { r = 255; g = 160; b = 40; }   // orange
        else if (p > 0.4) { r = 220; g = 80; b = 20; }     // red-orange
        else { r = 150; g = 30; b = 10; }                   // deep red

        ctx.beginPath();
        ctx.moveTo(mt.trail[k-1].x, mt.trail[k-1].y);
        ctx.lineTo(mt.trail[k].x, mt.trail[k].y);
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (ta * 0.9).toFixed(3) + ")";
        ctx.lineWidth = p * mt.r * 1.6;
        ctx.stroke();
      }
      ctx.restore();

      /* Glowing fireball head */
      var layers = [
        { r: mt.r * 3.5, c: "255,120,30",  a: mt.alpha * 0.18 },
        { r: mt.r * 2.2, c: "255,180,60",  a: mt.alpha * 0.45 },
        { r: mt.r * 1.2, c: "255,230,150", a: mt.alpha * 0.85 },
        { r: mt.r * 0.5, c: "255,255,220", a: mt.alpha },
      ];
      layers.forEach(function (l) {
        ctx.beginPath();
        ctx.arc(mt.x, mt.y, l.r, 0, Math.PI * 2);
        var rg = ctx.createRadialGradient(mt.x, mt.y, 0, mt.x, mt.y, l.r);
        rg.addColorStop(0,   "rgba(" + l.c + "," + l.a.toFixed(3) + ")");
        rg.addColorStop(1,   "rgba(" + l.c + ",0)");
        ctx.fillStyle = rg;
        ctx.fill();
      });
    }
  }

  /* ── Loop ── */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(nebCanvas, 0, 0, W, H);
    drawDeep(ts);
    drawStars(ts);
    drawShoots(ts);
    drawMeteors(ts);
    animId = requestAnimationFrame(draw);
  }

  resize();
  buildNebula();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(animId);
      resize(); buildNebula();
      animId = requestAnimationFrame(draw);
    }, 150);
  });

  animId = requestAnimationFrame(draw);
})();
