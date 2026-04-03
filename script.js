const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let mouse = { x: -1000, y: -1000 };
let isMouseMoving = false;
let mouseTimeout;

// This tracks the "center of gravity" for the entire formation
let swarmCenter = { x: 0, y: 0 };

const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#ff9800', '#f44336'];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Set initial center explicitly
    if (swarmCenter.x === 0 && swarmCenter.y === 0) {
        swarmCenter.x = width / 2;
        swarmCenter.y = height / 2;
    }
    initParticles();
}

class Particle {
    constructor(offsetX, offsetY) {
        // Offset relative to the swarm center
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        
        // Initial drawing position
        this.x = width / 2 + offsetX;
        this.y = height / 2 + offsetY;
        
        this.vx = 0;
        this.vy = 0;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI * 2;
        
        this.friction = 0.85 + Math.random() * 0.05;
        this.spring = 0.03 + Math.random() * 0.05; // Slightly looser spring for smooth follow
    }

    update() {
        // Where the particle WANTS to be based on the swarm center
        let targetX = swarmCenter.x + this.offsetX;
        let targetY = swarmCenter.y + this.offsetY;

        // --- Mouse Repulsion Logic (The Empty Circle) ---
        // If mouse is active on screen, push particles away from its exact coordinates
        let dx = this.x - mouse.x;
        let dy = this.y - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        // The circle radius where they shouldn't come
        let repulsionRadius = 180; 
        
        if (distance < repulsionRadius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let force = (repulsionRadius - distance) / repulsionRadius;
            
            // Push away vigorously inside the circle
            this.vx += forceDirectionX * force * 4;
            this.vy += forceDirectionY * force * 4;
        }

        // Apply spring force gently pulling them to their target positions around the center
        let sDx = targetX - this.x;
        let sDy = targetY - this.y;
        
        this.vx += sDx * this.spring;
        this.vy += sDy * this.spring;

        // Friction ensures they eventually settle smoothly
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // If moving, align the dash with the direction of movement
        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if(speed > 0.1) {
             let rotAngle = Math.atan2(this.vy, this.vx);
             ctx.rotate(rotAngle);
        } else {
             ctx.rotate(this.angle);
        }
        
        ctx.fillStyle = this.color;
        // The elongated tail look
        ctx.beginPath();
        let lengthMultiplier = Math.min(speed * 0.5, 4); // Stretch slightly based on speed
        ctx.roundRect(-this.size - lengthMultiplier, -this.size/2, (this.size * 3) + lengthMultiplier*2, this.size, this.size/2);
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    const radius = Math.max(width, height) * 0.7;
    
    for (let i = 0; i < 700; i++) {
        // Calculate offset from actual center
        let r = Math.random() * radius;
        let theta = Math.random() * Math.PI * 2;
        
        // Push slightly outwards naturally as well so it's a "cloud"
        let offsetX = r * Math.cos(theta);
        let offsetY = r * Math.sin(theta);
        
        particles.push(new Particle(offsetX, offsetY));
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Smoothly interpolate the Swarm Center towards the exact Mouse Position
    // This gives the "fluidly following the cursor" effect.
    let followTargetX = mouse.x !== -1000 ? mouse.x : width / 2;
    let followTargetY = mouse.y !== -1000 ? mouse.y : height / 2;

    swarmCenter.x += (followTargetX - swarmCenter.x) * 0.05;
    swarmCenter.y += (followTargetY - swarmCenter.y) * 0.05;

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
    // Bring it back to center if idle
    mouseTimeout = setTimeout(() => {
        isMouseMoving = false;
        mouse.x = -1000;
        mouse.y = -1000;
    }, 2500);
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

// Start loop
resize();
animate();
