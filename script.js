const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let mouse = { x: -1000, y: -1000 };
let isMouseMoving = false;
let mouseTimeout;

// The center of gravity for the swarm
let swarmCenter = { x: 0, y: 0 };

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    if (swarmCenter.x === 0 && swarmCenter.y === 0) {
        swarmCenter.x = width / 2;
        swarmCenter.y = height / 2;
    }
    initParticles();
}

function pickColor(angle) {
    // 8 distinct color sectors mimicking the Google Antigravity gradient
    const sectors = [
        { angle: 0, colors: ['#ea4335', '#eb6256'] }, // Right: Red
        { angle: Math.PI*0.25, colors: ['#ff9800', '#fbbc04', '#ea4335'] }, // Bottom Right: Orange/Red
        { angle: Math.PI*0.5, colors: ['#fbbc04', '#ffc107', '#fadd4d'] }, // Bottom: Yellow
        { angle: Math.PI*0.75, colors: ['#4285f4', '#8ab4f8'] }, // Bottom Left: Blue
        { angle: Math.PI, colors: ['#4285f4', '#1f5abf'] }, // Left: Darker Blue
        { angle: Math.PI*1.25, colors: ['#8ab4f8', '#a142f4'] }, // Top Left: Light Blue/Purple
        { angle: Math.PI*1.5, colors: ['#a142f4', '#c58af9', '#9c27b0'] }, // Top: Purple
        { angle: Math.PI*1.75, colors: ['#e91e63', '#f538a0', '#a142f4'] } // Top Right: Pink/Purple
    ];

    let a = (angle + Math.PI * 2) % (Math.PI * 2);
    let minDist = Infinity;
    let closestIndex = 0;
    
    for(let i=0; i<sectors.length; i++) {
        // Calculate shortest angular distance
        let dist = Math.min(
            Math.abs(a - sectors[i].angle),
            Math.abs(a - (sectors[i].angle + Math.PI * 2)),
            Math.abs(a - (sectors[i].angle - Math.PI * 2))
        );
        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }
    
    // Blend with adjacent sectors slightly for a natural organic gradient
    if (Math.random() < 0.35) {
        let dir = Math.random() > 0.5 ? 1 : -1;
        closestIndex = (closestIndex + dir + sectors.length) % sectors.length;
    }
    
    let colors = sectors[closestIndex].colors;
    return colors[Math.floor(Math.random() * colors.length)];
}

class Particle {
    constructor(baseAngle, radius) {
        this.baseAngle = baseAngle;
        this.radius = radius; // Fixed distance from center
        
        // Calculate original target offset based on the fixed radius map
        this.offsetX = Math.cos(baseAngle) * radius;
        this.offsetY = Math.sin(baseAngle) * radius;
        
        // Initial drawing position
        this.x = width / 2 + this.offsetX;
        this.y = height / 2 + this.offsetY;
        
        this.vx = 0;
        this.vy = 0;
        
        this.color = pickColor(baseAngle);
        
        // Shape of the dash
        this.length = Math.random() * 2 + 3; // Dash length
        this.thickness = Math.random() * 1.5 + 2; // Dash thickness
        
        // Elastic physics variables
        this.friction = 0.82 + Math.random() * 0.08;
        this.spring = 0.04 + Math.random() * 0.06;
    }

    update() {
        // The particle wants to maintain its orbital spot relative to swarmCenter
        let targetX = swarmCenter.x + this.offsetX;
        let targetY = swarmCenter.y + this.offsetY;

        // Spring force towards target
        let sDx = targetX - this.x;
        let sDy = targetY - this.y;
        
        this.vx += sDx * this.spring;
        this.vy += sDy * this.spring;

        // Friction ensures calm settling
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Always orient exactly radially towards the swarm center, matching the screenshot
        let angleToCenter = Math.atan2(this.y - swarmCenter.y, this.x - swarmCenter.x);
        ctx.rotate(angleToCenter);
        
        ctx.beginPath();
        ctx.moveTo(-this.length, 0);
        ctx.lineTo(this.length, 0);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    const emptyRadius = 140; // The defined empty hole in the middle around cursor
    const maxRadius = Math.max(width, height) * 0.8;
    
    // Large number of particles for a dense universe feel
    for (let i = 0; i < 1500; i++) {
        let angle = Math.random() * Math.PI * 2;
        // Square root function distributes nicely outwards avoiding clamping at center
        let dist = Math.sqrt(Math.random()); 
        let radius = emptyRadius + dist * (maxRadius - emptyRadius); // Starts forming outside emptyRadius
        
        particles.push(new Particle(angle, radius));
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Smoothly track the mouse (or center of screen if inactive)
    let followTargetX = mouse.x !== -1000 ? mouse.x : width / 2;
    let followTargetY = mouse.y !== -1000 ? mouse.y : height / 2;

    swarmCenter.x += (followTargetX - swarmCenter.x) * 0.06;
    swarmCenter.y += (followTargetY - swarmCenter.y) * 0.06;

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
        // Gently return to center when idle
        mouse.x = width / 2;
        mouse.y = height / 2;
    }, 2500);
});

window.addEventListener('mouseout', () => {
    mouse.x = width / 2;
    mouse.y = height / 2;
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
    mouse.x = width / 2;
    mouse.y = height / 2;
});

// Init and start
resize();
animate();
