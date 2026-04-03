const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let mouse = { x: -1000, y: -1000 };
let isMouseMoving = false;
let mouseTimeout;

// Colors matching the original Google Antigravity design
const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#ff9800', '#f44336'];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initParticles();
}

class Particle {
    constructor(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 2 + 1; // Slight size variation
        this.angle = Math.random() * Math.PI * 2;
        // Elasticity properties
        this.friction = 0.85 + Math.random() * 0.05; // Different damping
        this.spring = 0.05 + Math.random() * 0.05; // Different tension
    }

    update() {
        let dx = this.baseX - mouse.x;
        let dy = this.baseY - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        
        // Repulsion radius
        let maxDistance = 200;
        let force = (maxDistance - distance) / maxDistance;

        if (distance < maxDistance) {
            // Apply repulsive force
            this.vx += forceDirectionX * force * 5;
            this.vy += forceDirectionY * force * 5;
        }

        // Apply spring force towards base position
        let sDx = this.baseX - this.x;
        let sDy = this.baseY - this.y;
        
        this.vx += sDx * this.spring;
        this.vy += sDy * this.spring;

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotate points slightly based on movement direction to make them look like "streaks"
        if(Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
             let rotAngle = Math.atan2(this.vy, this.vx);
             ctx.rotate(rotAngle);
        } else {
            ctx.rotate(this.angle);
        }
        
        ctx.fillStyle = this.color;
        // Drawing an elongated dash
        ctx.beginPath();
        // The original design uses small, pill-like shapes or slanted lines
        ctx.roundRect(-this.size, -this.size/2, this.size * 3, this.size, this.size/2);
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    // Create a grid-like or spiral arrangement depending on the original,
    // let's use a radial arrangement to match the "expanding from center/logo" feel
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.6;
    
    // Instead of random, create a structured pattern that gets disturbed
    for (let i = 0; i < 500; i++) {
        // Spiral placement
        let r = Math.random() * radius;
        let theta = Math.random() * Math.PI * 2;
        
        // Push slightly outwards from the center text area to keep it readable,
        // although in the real site they interact *behind* the text
        
        let x = centerX + r * Math.cos(theta);
        let y = centerY + r * Math.sin(theta);
        
        particles.push(new Particle(x, y));
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('resize', resize);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
    isMouseMoving = true;
    
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(() => {
        isMouseMoving = false;
        // Send mouse far away when idle so particles settle
        mouse.x = -1000;
        mouse.y = -1000;
    }, 2000); // 2 seconds idle timeout
});

window.addEventListener('mouseout', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});

window.addEventListener('touchstart', (e) => {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
     mouse.x = e.touches[0].clientX;
     mouse.y = e.touches[0].clientY;
});

window.addEventListener('touchend', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});


// Initialization
resize();
animate();
