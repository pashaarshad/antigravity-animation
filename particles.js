/**
 * Antigravity Particle Animation
 * ================================
 * A mesmerizing anti-gravity confetti particle system using HTML5 Canvas.
 * Features: spring physics, Poisson-disk distribution, mouse interaction,
 * curved trail patterns, and elastic/bouncy movement.
 */

(function () {
  'use strict';

  // ───────── Configuration ─────────
  const CONFIG = {
    // Particle counts
    PARTICLE_COUNT: 280,
    TRAIL_COUNT: 12,
    TRAIL_POINTS: 18,

    // Particle appearance
    MIN_SIZE: 2.5,
    MAX_SIZE: 6,
    MIN_LENGTH: 6,
    MAX_LENGTH: 16,

    // Physics
    GRAVITY: -0.008,           // Negative = anti-gravity (upward)
    DRIFT_SPEED: 0.15,         // Base horizontal drift
    FLOAT_SPEED: 0.12,         // Base upward float speed
    DAMPING: 0.985,            // Velocity damping
    ROTATION_SPEED: 0.008,     // Base rotation speed
    SPRING_STIFFNESS: 0.015,   // Spring return force
    SPRING_DAMPING: 0.92,      // Spring velocity damping

    // Mouse interaction
    MOUSE_RADIUS: 180,         // Mouse influence radius
    MOUSE_FORCE: 2.5,          // Mouse push force
    MOUSE_SPRING: 0.008,       // Mouse spring-back force

    // Colors – inspired by Google brand palette
    COLORS: [
      // Blues
      { r: 66, g: 133, b: 244 },   // Google Blue
      { r: 25, g: 103, b: 210 },   // Darker Blue
      { r: 100, g: 149, b: 237 },  // Cornflower Blue
      // Reds / Pinks
      { r: 234, g: 67, b: 53 },    // Google Red
      { r: 219, g: 68, b: 85 },    // Soft Red
      { r: 255, g: 82, b: 115 },   // Hot Pink
      // Purples
      { r: 137, g: 87, b: 229 },   // Rich Purple
      { r: 103, g: 58, b: 183 },   // Deep Purple
      { r: 156, g: 109, b: 255 },  // Light Purple
      // Yellows / Oranges
      { r: 251, g: 188, b: 4 },    // Google Yellow
      { r: 255, g: 152, b: 0 },    // Orange
      { r: 255, g: 179, b: 71 },   // Light Orange
      // Greens
      { r: 52, g: 168, b: 83 },    // Google Green
      { r: 0, g: 200, b: 83 },     // Bright Green
    ],

    // Trail appearance
    TRAIL_DOT_SIZE: 2.5,
    TRAIL_OPACITY_BASE: 0.45,
    TRAIL_SPACING: 14,

    // Fade-in
    FADE_IN_DURATION: 2000,
  };

  // ───────── State ─────────
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let particles = [];
  let trails = [];
  let mouseX = -1000, mouseY = -1000;
  let mouseActive = false;
  let mouseVX = 0, mouseVY = 0;
  let prevMouseX = 0, prevMouseY = 0;
  let startTime = Date.now();
  let interactMode = false;
  let animationId;

  // ───────── Utility Functions ─────────
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ───────── Poisson Disk Sampling (approximate) ─────────
  function poissonDiskSample(w, h, minDist, count) {
    const points = [];
    const cellSize = minDist / Math.SQRT2;
    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);
    const grid = new Array(cols * rows).fill(null);
    const active = [];

    function gridIndex(x, y) {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      return row * cols + col;
    }

    function addPoint(x, y) {
      const p = { x, y };
      points.push(p);
      active.push(p);
      grid[gridIndex(x, y)] = p;
    }

    // Seed point
    addPoint(rand(0, w), rand(0, h));

    while (active.length > 0 && points.length < count) {
      const idx = randInt(0, active.length - 1);
      const point = active[idx];
      let found = false;

      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = rand(0, Math.PI * 2);
        const r = rand(minDist, minDist * 2);
        const nx = point.x + Math.cos(angle) * r;
        const ny = point.y + Math.sin(angle) * r;

        if (nx < -50 || nx > w + 50 || ny < -50 || ny > h + 50) continue;

        const col = Math.floor(nx / cellSize);
        const row = Math.floor(ny / cellSize);
        let ok = true;

        for (let dy = -2; dy <= 2 && ok; dy++) {
          for (let dx = -2; dx <= 2 && ok; dx++) {
            const c = col + dx;
            const rr = row + dy;
            if (c < 0 || c >= cols || rr < 0 || rr >= rows) continue;
            const neighbor = grid[rr * cols + c];
            if (neighbor && dist(nx, ny, neighbor.x, neighbor.y) < minDist) {
              ok = false;
            }
          }
        }

        if (ok) {
          addPoint(nx, ny);
          found = true;
          break;
        }
      }

      if (!found) {
        active.splice(idx, 1);
      }
    }

    return points;
  }

  // ───────── Particle Class ─────────
  class Particle {
    constructor(x, y) {
      this.homeX = x;
      this.homeY = y;
      this.x = x;
      this.y = y;
      this.vx = rand(-0.3, 0.3);
      this.vy = rand(-0.5, -0.1);

      // Appearance
      const color = CONFIG.COLORS[randInt(0, CONFIG.COLORS.length - 1)];
      this.r = color.r;
      this.g = color.g;
      this.b = color.b;
      this.opacity = rand(0.5, 0.9);
      this.width = rand(CONFIG.MIN_SIZE, CONFIG.MAX_SIZE);
      this.length = rand(CONFIG.MIN_LENGTH, CONFIG.MAX_LENGTH);
      this.rotation = rand(0, Math.PI * 2);
      this.rotationSpeed = rand(-CONFIG.ROTATION_SPEED, CONFIG.ROTATION_SPEED);

      // Per-particle physics variation
      this.driftX = rand(-CONFIG.DRIFT_SPEED, CONFIG.DRIFT_SPEED);
      this.driftY = rand(-CONFIG.FLOAT_SPEED, -CONFIG.FLOAT_SPEED * 0.3);
      this.floatOffset = rand(0, Math.PI * 2);
      this.floatAmplitude = rand(0.2, 0.6);
      this.floatFrequency = rand(0.003, 0.012);

      // Spring state
      this.springVX = 0;
      this.springVY = 0;
      this.displaced = false;

      // Delay for staggered appearance
      this.delay = rand(0, 1500);
      this.alive = false;
    }

    update(time, dt) {
      // Check if particle should be alive yet (staggered intro)
      if (!this.alive) {
        if (time - startTime > this.delay) {
          this.alive = true;
        } else {
          return;
        }
      }

      const t = time * 0.001;

      // Floating sine-wave drift
      const floatX = Math.sin(t * this.floatFrequency * 1000 + this.floatOffset) * this.floatAmplitude;
      const floatY = Math.cos(t * this.floatFrequency * 700 + this.floatOffset * 1.3) * this.floatAmplitude * 0.5;

      // Anti-gravity drift
      this.vx += this.driftX * 0.01 + floatX * 0.005;
      this.vy += CONFIG.GRAVITY + this.driftY * 0.01 + floatY * 0.005;

      // Mouse interaction
      if (mouseActive || interactMode) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const radius = interactMode ? CONFIG.MOUSE_RADIUS * 1.5 : CONFIG.MOUSE_RADIUS;

        if (d < radius && d > 0) {
          const force = (1 - d / radius) * CONFIG.MOUSE_FORCE;
          const angle = Math.atan2(dy, dx);
          this.vx += Math.cos(angle) * force * 0.15;
          this.vy += Math.sin(angle) * force * 0.15;
          this.displaced = true;

          // Add some spin from mouse interaction
          this.rotationSpeed += (mouseVX * 0.0003 + mouseVY * 0.0003) * (1 - d / radius);
        }
      }

      // Spring force to return home (gentle)
      if (this.displaced) {
        const dx = this.homeX - this.x;
        const dy = this.homeY - this.y;
        this.springVX += dx * CONFIG.SPRING_STIFFNESS * 0.1;
        this.springVY += dy * CONFIG.SPRING_STIFFNESS * 0.1;
        this.springVX *= CONFIG.SPRING_DAMPING;
        this.springVY *= CONFIG.SPRING_DAMPING;
        this.vx += this.springVX;
        this.vy += this.springVY;

        // Check if close enough to home
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && 
            Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05) {
          this.displaced = false;
        }
      }

      // Apply damping
      this.vx *= CONFIG.DAMPING;
      this.vy *= CONFIG.DAMPING;

      // Update position
      this.x += this.vx;
      this.y += this.vy;

      // Rotation with damping
      this.rotation += this.rotationSpeed;
      this.rotationSpeed *= 0.998;

      // Wrap around screen edges (with padding)
      const pad = 60;
      if (this.x < -pad) {
        this.x = width + pad;
        this.homeX = this.x;
      }
      if (this.x > width + pad) {
        this.x = -pad;
        this.homeX = this.x;
      }
      if (this.y < -pad) {
        this.y = height + pad;
        this.homeY = this.y;
      }
      if (this.y > height + pad) {
        this.y = -pad;
        this.homeY = this.y;
      }
    }

    draw(ctx, globalAlpha) {
      if (!this.alive) return;

      const fadeProgress = Math.min(1, (Date.now() - startTime - this.delay) / CONFIG.FADE_IN_DURATION);
      const alpha = this.opacity * easeOutCubic(fadeProgress) * globalAlpha;

      if (alpha <= 0) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = alpha;

      // Draw as a rounded dash/rectangle
      const halfW = this.width * 0.5;
      const halfL = this.length * 0.5;
      const radius = Math.min(halfW, 2);

      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, this.length, this.width, radius);
      ctx.fillStyle = `rgb(${this.r}, ${this.g}, ${this.b})`;
      ctx.fill();

      ctx.restore();
    }
  }

  // ───────── Trail Class (curved dotted arcs) ─────────
  class Trail {
    constructor() {
      this.reset();
    }

    reset() {
      const color = CONFIG.COLORS[randInt(0, CONFIG.COLORS.length - 1)];
      this.r = color.r;
      this.g = color.g;
      this.b = color.b;

      // Start position
      this.startX = rand(width * 0.1, width * 0.9);
      this.startY = rand(height * 0.1, height * 0.9);

      // Arc parameters
      this.arcRadius = rand(60, 200);
      this.arcAngleStart = rand(0, Math.PI * 2);
      this.arcAngleSpan = rand(Math.PI * 0.3, Math.PI * 1.2) * (Math.random() > 0.5 ? 1 : -1);
      this.numDots = randInt(6, CONFIG.TRAIL_POINTS);

      // Animation
      this.progress = 0;
      this.speed = rand(0.0003, 0.001);
      this.opacity = rand(0.2, 0.5);
      this.dotSize = rand(1.5, CONFIG.TRAIL_DOT_SIZE);

      // Float offset
      this.floatOffsetX = 0;
      this.floatOffsetY = 0;
      this.floatPhase = rand(0, Math.PI * 2);

      // Delay
      this.delay = rand(0, 3000);
      this.alive = false;
      this.lifespan = rand(8000, 15000);
      this.birthTime = Date.now();
    }

    update(time) {
      if (!this.alive) {
        if (time - startTime > this.delay) {
          this.alive = true;
          this.birthTime = time;
        } else {
          return;
        }
      }

      const age = time - this.birthTime;
      if (age > this.lifespan) {
        this.reset();
        return;
      }

      this.progress += this.speed;

      // Gentle floating motion
      const t = time * 0.001;
      this.floatOffsetX = Math.sin(t * 0.5 + this.floatPhase) * 8;
      this.floatOffsetY = Math.cos(t * 0.3 + this.floatPhase) * 5 - age * 0.003;
    }

    draw(ctx, globalAlpha) {
      if (!this.alive) return;

      const age = Date.now() - this.birthTime;
      const fadeIn = Math.min(1, age / 1500);
      const fadeOut = Math.max(0, 1 - (age - this.lifespan + 2000) / 2000);
      const alpha = this.opacity * fadeIn * fadeOut * globalAlpha;

      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${this.r}, ${this.g}, ${this.b})`;

      for (let i = 0; i < this.numDots; i++) {
        const t = i / (this.numDots - 1);
        const revealProgress = Math.min(1, this.progress * 3 - t * 0.5);
        if (revealProgress <= 0) continue;

        const angle = this.arcAngleStart + this.arcAngleSpan * t;
        const x = this.startX + Math.cos(angle) * this.arcRadius + this.floatOffsetX;
        const y = this.startY + Math.sin(angle) * this.arcRadius + this.floatOffsetY;

        const dotAlpha = revealProgress * (0.3 + 0.7 * (1 - t * 0.5));
        ctx.globalAlpha = alpha * dotAlpha;

        ctx.beginPath();
        ctx.arc(x, y, this.dotSize * revealProgress, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ───────── Initialize ─────────
  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initParticles() {
    particles = [];
    trails = [];
    startTime = Date.now();

    // Use Poisson disk sampling for even distribution
    const minDist = Math.sqrt((width * height) / CONFIG.PARTICLE_COUNT) * 0.8;
    const points = poissonDiskSample(width, height, minDist, CONFIG.PARTICLE_COUNT);

    // Create particles from sampled points
    for (const p of points) {
      particles.push(new Particle(p.x, p.y));
    }

    // Fill remaining with random positions if Poisson didn't generate enough
    while (particles.length < CONFIG.PARTICLE_COUNT) {
      particles.push(new Particle(rand(0, width), rand(0, height)));
    }

    // Create trail arcs
    for (let i = 0; i < CONFIG.TRAIL_COUNT; i++) {
      trails.push(new Trail());
    }
  }

  // ───────── Mouse Events ─────────
  function onMouseMove(e) {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseVX = mouseX - prevMouseX;
    mouseVY = mouseY - prevMouseY;
    mouseActive = true;
  }

  function onMouseLeave() {
    mouseActive = false;
    mouseX = -1000;
    mouseY = -1000;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      mouseVX = mouseX - prevMouseX;
      mouseVY = mouseY - prevMouseY;
      mouseActive = true;
    }
  }

  function onTouchEnd() {
    mouseActive = false;
    mouseX = -1000;
    mouseY = -1000;
  }

  // ───────── Animation Loop ─────────
  let lastTime = 0;

  function animate(timestamp) {
    animationId = requestAnimationFrame(animate);

    const dt = Math.min(timestamp - lastTime, 50); // Cap delta time
    lastTime = timestamp;
    const now = Date.now();

    // Global fade in
    const globalFade = Math.min(1, (now - startTime) / 1000);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw subtle background gradient
    const gradient = ctx.createRadialGradient(
      width * 0.5, height * 0.4, 0,
      width * 0.5, height * 0.4, width * 0.8
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(248, 249, 250, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Update and draw trails (behind particles)
    for (const trail of trails) {
      trail.update(now);
      trail.draw(ctx, globalFade);
    }

    // Update and draw particles
    for (const particle of particles) {
      particle.update(now, dt);
      particle.draw(ctx, globalFade);
    }

    // Decay mouse velocity
    mouseVX *= 0.9;
    mouseVY *= 0.9;
  }

  // ───────── Button Handlers ─────────
  const interactBtn = document.getElementById('interactBtn');
  const resetBtn = document.getElementById('resetBtn');

  interactBtn.addEventListener('click', () => {
    interactMode = !interactMode;
    if (interactMode) {
      interactBtn.innerHTML = '<span class="btn-icon">✧</span> Normal mode';
      document.body.style.cursor = 'crosshair';
    } else {
      interactBtn.innerHTML = '<span class="btn-icon">✦</span> Interact with particles';
      document.body.style.cursor = 'default';
    }
  });

  resetBtn.addEventListener('click', () => {
    initParticles();
    interactMode = false;
    interactBtn.innerHTML = '<span class="btn-icon">✦</span> Interact with particles';
    document.body.style.cursor = 'default';
  });

  // ───────── Setup ─────────
  function init() {
    resize();
    initParticles();

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    // Also handle overlay mouse events (since overlay has pointer-events: none for most)
    document.addEventListener('mousemove', onMouseMove);

    animate(0);
  }

  // Polyfill roundRect if needed
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      const r = typeof radii === 'number' ? radii : (radii && radii[0]) || 0;
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }

  init();
})();
