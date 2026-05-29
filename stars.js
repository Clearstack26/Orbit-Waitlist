/**
 * Orbit — dot-grid background with shooting stars on demand.
 * Jittered dot lattice (no rigid grid lines), gentle pulse per dot.
 * orbitShoot() fires a shooting star across the canvas.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var animId;

  /* ── Tuning ─── */
  var SPACING     = 52;    // nominal grid spacing
  var JITTER      = 14;    // max random offset per dot (breaks up grid lines)
  var DOT_R       = 1.1;   // base dot radius
  var PULSE_SPEED = 0.006; // phase increment per frame
  var shoots      = [];    // active shooting stars
  /* ─────────────── */

  var dots = [];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  var SHOOT_PALETTE = ["34,211,238", "220,200,255", "180,140,255"];

  function buildGrid() {
    dots = [];
    var cols = Math.ceil(W / SPACING) + 2;
    var rows = Math.ceil(H / SPACING) + 2;
    var offX = (W % SPACING) / 2;
    var offY = (H % SPACING) / 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        /* Jitter each dot off the strict grid so no visible grid-line frames */
        var x = offX + c * SPACING + rand(-JITTER, JITTER);
        var y = offY + r * SPACING + rand(-JITTER, JITTER);
        var dx = (x - W / 2) / (W / 2);
        var dy = (y - H / 2) / (H / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var centreBoost = Math.max(0, 1 - dist * 0.85);
        dots.push({
          x: x,
          y: y,
          phase: rand(0, Math.PI * 2),
          baseA: 0.09 + centreBoost * 0.09,
          ampA:  0.05 + centreBoost * 0.05,
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

  /* ── Shooting star ── */
  function makeShoot() {
    var angle  = rand(22, 58) * (Math.PI / 180);
    if (Math.random() < 0.2) angle = rand(122, 155) * (Math.PI / 180);
    var speed  = rand(7, 13);
    var length = rand(130, 300);
    var tint   = SHOOT_PALETTE[randInt(0, SHOOT_PALETTE.length - 1)];
    return {
      x: rand(W * 0.05, W * 0.85),
      y: rand(0, H * 0.45),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      alpha: rand(0.75, 1.0),
      decay: rand(0.013, 0.020),
      tint: tint,
      trail: [],
      maxT: Math.floor(length / speed),
      glowR: rand(1.5, 3.0),
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

  /* ── Draw shooting stars ── */
  function drawShoots() {
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

  /* ── Animated render loop ── */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      d.phase += PULSE_SPEED;
      var a = d.baseA + d.ampA * Math.sin(d.phase);
      a = Math.min(a, 0.90);

      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(190,175,255," + a.toFixed(3) + ")";
      ctx.fill();

      /* Soft glow on brighter dots */
      if (a > 0.16) {
        var gr = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, DOT_R * 4.5);
        gr.addColorStop(0, "rgba(180,160,255," + (a * 0.18).toFixed(3) + ")");
        gr.addColorStop(1, "rgba(180,160,255,0)");
        ctx.beginPath();
        ctx.arc(d.x, d.y, DOT_R * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      }
    }

    drawShoots();
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
