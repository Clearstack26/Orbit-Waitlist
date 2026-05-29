/**
 * Stars canvas animation for Orbit Waitlist.
 * Auto-initialises on #stars-canvas when loaded.
 */
(function () {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var stars = [];
  var shootingStars = [];
  var animId;
  var W = 0;
  var H = 0;

  var STAR_COUNT = 220;
  var SHOOTING_INTERVAL_MIN = 4000;
  var SHOOTING_INTERVAL_MAX = 9000;
  var lastShootingTime = 0;
  var nextShootingDelay = randomBetween(SHOOTING_INTERVAL_MIN, SHOOTING_INTERVAL_MAX);

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeStar() {
    var kind = Math.random();
    var color;
    if (kind < 0.12) {
      color = "rgba(34,211,238,";
    } else if (kind < 0.22) {
      color = "rgba(168,85,247,";
    } else if (kind < 0.3) {
      color = "rgba(186,200,255,";
    } else {
      color = "rgba(240,244,255,";
    }
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: randomBetween(0.3, 1.6),
      baseAlpha: randomBetween(0.25, 0.85),
      alpha: 0,
      twinkleSpeed: randomBetween(0.004, 0.018),
      twinklePhase: Math.random() * Math.PI * 2,
      color: color,
    };
  }

  function makeShootingStar() {
    var startX = randomBetween(W * 0.1, W * 0.8);
    var startY = randomBetween(0, H * 0.45);
    var angle = randomBetween(25, 50) * (Math.PI / 180);
    var length = randomBetween(100, 220);
    var speed = randomBetween(3.5, 6.5);
    return {
      x: startX,
      y: startY,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      length: length,
      alpha: 1,
      trail: [],
      maxTrail: Math.floor(length / speed),
    };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push(makeStar());
    }
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.twinklePhase += s.twinkleSpeed;
      s.alpha = s.baseAlpha * (0.55 + 0.45 * Math.sin(s.twinklePhase));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color + s.alpha.toFixed(3) + ")";
      ctx.fill();

      if (s.r > 0.9 && s.alpha > 0.6) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color + (s.alpha * 0.12).toFixed(3) + ")";
        ctx.fill();
      }
    }

    if (ts - lastShootingTime > nextShootingDelay) {
      shootingStars.push(makeShootingStar());
      lastShootingTime = ts;
      nextShootingDelay = randomBetween(SHOOTING_INTERVAL_MIN, SHOOTING_INTERVAL_MAX);
    }

    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var ss = shootingStars[j];
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.maxTrail) {
        ss.trail.shift();
      }

      ss.x += ss.dx;
      ss.y += ss.dy;
      ss.alpha -= 0.022;

      if (ss.trail.length > 1) {
        for (var k = 1; k < ss.trail.length; k++) {
          var progress = k / ss.trail.length;
          var a = ss.alpha * progress * 0.9;
          if (a <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(ss.trail[k - 1].x, ss.trail[k - 1].y);
          ctx.lineTo(ss.trail[k].x, ss.trail[k].y);
          ctx.strokeStyle = "rgba(210,240,255," + a.toFixed(3) + ")";
          ctx.lineWidth = progress * 1.5;
          ctx.stroke();
        }
      }

      if (ss.alpha <= 0 || ss.x > W + 50 || ss.y > H + 50) {
        shootingStars.splice(j, 1);
      }
    }

    animId = requestAnimationFrame(draw);
  }

  resize();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(animId);
      resize();
      animId = requestAnimationFrame(draw);
    }, 150);
  });

  animId = requestAnimationFrame(draw);
})();
