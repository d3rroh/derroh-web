/**
 * DERRICK-OPS  |  hero-background.js
 * Enterprise-grade constellation animation for hero section
 * Visualizes intelligent cloud infrastructure with living network nodes
 */
 
const HeroBackground = (function() {
  // Configuration
  const config = {
    // Canvas setup
    dpr: Math.min(window.devicePixelRatio, 2),
    container: '#hero',
    
    // Network nodes
    nodeCount: 35,
    nodeBaseRadius: { min: 2, max: 8 },
    nodeGlowIntensity: { min: 0.3, max: 0.8 },
    
    // Animation timings
    cameraDuration: 60000, // 60 seconds
    nodeBreathCycle: { min: 3000, max: 7000 },
    dataPacketInterval: 50,
    syncInterval: { min: 15000, max: 25000 },
    particleRefresh: 2000,
    starTwinkleInterval: { min: 2000, max: 8000 },
    
    // Colors
    colors: {
      primary: '#00ffd4',      // Cyan
      secondary: '#64c4ff',    // Blue
      accent: '#ff2e27',       // Red
      magenta: '#ff00ff',      // Magenta
      white: '#ffffff',        // White
      dark: '#05070d',         // Navy
      dark2: '#0a0d14',        // Dark indigo
      dark3: '#12151a',        // Charcoal
      violet: '#6b46c1',       // Violet
    },
    
    // Parallax speeds (background to foreground)
    parallax: {
      bg: 0.05,
      lines: 0.1,
      nodes: 0.15,
      particles: 0.25,
      glow: 0.4
    },
    
    // Performance
    fps: 60,
    maxParticles: 50,
    maxStars: 80,
  };
  
  // State management
  const state = {
    width: 0,
    height: 0,
    mouseX: 0.5,
    mouseY: 0.5,
    isPaused: false,
    lastSyncTime: Date.now(),
    lastPacketTime: 0,
    lastParticleTime: 0,
    lastStarTime: 0,
    animationId: null,
    nodes: [],
    connections: [],
    particles: [],
    stars: [],
    nebulaLayers: [],
    filmGrain: null,
  };
  
  // Core classes
  class Node {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.originalX = x;
      this.originalY = y;
      this.baseRadius = Math.random() * (config.nodeBaseRadius.max - config.nodeBaseRadius.min) + config.nodeBaseRadius.min;
      this.radius = this.baseRadius;
      this.glowIntensity = Math.random() * (config.nodeGlowIntensity.max - config.nodeGlowIntensity.min) + config.nodeGlowIntensity.min;
      this.baseHue = Math.random() * 60 + 180; // Cyan to magenta range
      this.hue = this.baseHue;
      this.alpha = 1;
      this.breathPhase = Math.random() * Math.PI * 2;
      this.breathSpeed = 0.001 + Math.random() * 0.002;
      this.interactionRadius = this.baseRadius * 3;
      this.isActive = false;
      this.animationId = null;
    }
    
    update(timestamp, mouseInRange) {
      const time = timestamp * 0.001;
      
      // Breathing animation
      this.breathPhase += this.breathSpeed;
      const breathFactor = Math.sin(this.breathPhase);
      this.radius = this.baseRadius * (1 + breathFactor * 0.15);
      this.glowIntensity = 0.3 + Math.abs(breathFactor) * 0.7;
      
      // Interaction response
      if (mouseInRange) {
        const dx = (this.x - state.mouseX * state.width) / state.width;
        const dy = (this.y - state.mouseY * state.height) / state.height;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionStrength = Math.max(0, 1 - dist / this.interactionRadius);
        
        this.hue = 240 + interactionStrength * 120; // Shift toward blue
        this.alpha = 0.8 + interactionStrength * 0.4;
        this.radius = this.baseRadius * (1.5 + interactionStrength * 0.5);
        this.isActive = interactionStrength > 0.3;
      } else {
        this.hue = this.baseHue;
        this.alpha = 1;
        this.isActive = false;
      }
    }
    
    draw(ctx, isInteractive) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 2
      );
      
      const color = isInteractive ? config.colors.primary : this.hue;
      gradient.addColorStop(0, `rgba(${this.getRGB(color)}, ${this.alpha})`);
      gradient.addColorStop(0.6, `rgba(${this.getRGB(color)}, ${this.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(${this.getRGB(color)}, 0)`);
      
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.shadowBlur = this.radius * 4;
      ctx.shadowColor = color;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    getRGB(hue) {
      if (typeof hue === 'string') hue = parseInt(hue);
      const saturation = 85;
      const lightness = 65;
      const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
      const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
      const m = lightness / 100 - c / 2;
      
      let r, g, b;
      if (0 <= hue && hue < 60) [r, g, b] = [c, x, 0];
      else if (60 <= hue && hue < 120) [r, g, b] = [x, c, 0];
      else if (120 <= hue && hue < 180) [r, g, b] = [0, c, x];
      else if (180 <= hue && hue < 240) [r, g, b] = [0, x, c];
      else if (240 <= hue && hue < 300) [r, g, b] = [x, 0, c];
      else if (300 <= hue && hue < 360) [r, g, b] = [c, 0, x];
      
      return `${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)}`;
    }
  }
  
  class Connection {
    constructor(nodeA, nodeB, transparency) {
      this.nodeA = nodeA;
      this.nodeB = nodeB;
      this.distance = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
      this.maxDistance = 250 + Math.random() * 150;
      this.transparency = transparency;
      this.dashedOffset = 0;
      this.glowIntensity = 0.3 + Math.random() * 0.4;
      this.particles = [];
      this.polygonPoints = this.createPolygonPoints(nodeA, nodeB);
    }
    
    createPolygonPoints(nodeA, nodeB) {
      const angle = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x);
      const perpAngle = angle + Math.PI / 2;
      const offsetX = Math.cos(perpAngle) * 30;
      const offsetY = Math.sin(perpAngle) * 30;
      
      return [
        { x: nodeA.x + offsetX, y: nodeA.y + offsetY },
        { x: nodeA.x - offsetX, y: nodeA.y - offsetY },
        nodeB,
        nodeA
      ];
    }
    
    update(timestamp) {
      this.dashedOffset = (this.dashedOffset + 1) % 15;
      this.glowIntensity = 0.3 + Math.sin(timestamp * 0.001 * 2) * 0.3;
      
      // Update particles
      if (Date.now() - state.lastPacketTime > config.dataPacketInterval) {
        this.spawnParticle();
        state.lastPacketTime = Date.now();
      }
      
      this.particles.forEach((particle, index) => {
        particle.update();
        if (particle.age > 2000) {
          this.particles.splice(index, 1);
        }
      });
    }
    
    spawnParticle() {
      if (Math.random() > 0.3) return;
      
      const angle = Math.atan2(
        this.nodeB.y - this.nodeA.y,
        this.nodeB.x - this.nodeA.x
      );
      const speed = 0.5 + Math.random() * 1.5;
      const particle = {
        x: this.nodeA.x + Math.cos(angle) * (Math.random() * 20),
        y: this.nodeA.y + Math.sin(angle) * (Math.random() * 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 800 + Math.random() * 600,
        hue: this.nodeA.baseHue,
        glow: 0.5 + Math.random() * 0.5
      };
      
      this.particles.push(particle);
    }
    
    draw(ctx, mouseInNodeA, mouseInNodeB) {
      ctx.save();
      ctx.globalAlpha = this.glowIntensity * (mouseInNodeA || mouseInNodeB ? 1.5 : 1);
      ctx.strokeStyle = `rgba(${this.getRGB(config.colors.primary)}, ${this.transparency})`;
      ctx.lineWidth = 1 + (mouseInNodeA || mouseInNodeB ? 2 : 0);
      ctx.shadowBlur = 10;
      ctx.shadowColor = config.colors.primary;
      
      // Draw main line
      ctx.beginPath();
      ctx.moveTo(this.nodeA.x, this.nodeA.y);
      ctx.lineTo(this.nodeB.x, this.nodeB.y);
      ctx.stroke();
      
      // Draw polygon fill if transparency is high
      if (this.transparency < 0.15) {
        ctx.globalAlpha = this.transparency * 0.5;
        ctx.fillStyle = `rgba(${this.getRGB(config.colors.primary)}, ${this.transparency * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        for (let i = 1; i < this.polygonPoints.length; i++) {
          ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw particles
      this.particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.glow * (particle.age / particle.life);
        ctx.shadowBlur = particle.glow * 15;
        ctx.shadowColor = `hsl(${particle.hue}, 100%, 60%)`;
        ctx.fillStyle = `hsl(${particle.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      
      ctx.restore();
    }
    
    getRGB(color) {
      const tempDiv = document.createElement('div');
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      const rgb = getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      return rgb.match(/\d+/g).slice(0, 3).join(',');
    }
  }

  class Particle {
    constructor() {
      this.x = Math.random() * state.width;
      this.y = Math.random() * state.height;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.size = Math.random() * 3 + 1;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 0.5;
      this.hue = Math.random() > 0.7 ? 
        [config.colors.primary, config.colors.secondary, 'white', config.colors.magenta, config.colors.accent][
          Math.floor(Math.random() * 5)
        ] : config.colors.primary;
      this.depth = Math.random();
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;
      this.opacity += (Math.random() - 0.5) * 0.02;
      this.opacity = Math.max(0.1, Math.min(1, this.opacity));
      
      if (this.x < -10) this.x = state.width + 10;
      if (this.x > state.width + 10) this.x = -10;
      if (this.y < -10) this.y = state.height + 10;
      if (this.y > state.height + 10) this.y = -10;
    }
    
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.shadowBlur = this.size * 2;
      ctx.shadowColor = this.hue;
      ctx.fillStyle = this.hue;
      
      if (this.size > 2.5) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 2, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size * 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      
      ctx.restore();
    }
  }

  class Star {
    constructor() {
      this.x = Math.random() * state.width;
      this.y = Math.random() * state.height;
      this.baseSize = Math.random() * 2 + 0.5;
      this.size = this.baseSize;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.twinkleSpeed = 0.001 + Math.random() * 0.003;
      this.hue = Math.random() > 0.5 ? 
        [config.colors.primary, config.colors.secondary, 'white'][Math.floor(Math.random() * 3)] : 
        config.colors.primary;
    }
    
    update(timestamp) {
      const time = timestamp * 0.001;
      const twinkle = Math.sin(time * this.twinkleSpeed + this.twinklePhase);
      this.size = this.baseSize * (0.5 + 0.5 * (twinkle * twinkle + 0.5));
      this.opacity = 0.3 + Math.abs(twinkle) * 0.7;
    }
    
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.hue;
      ctx.fillStyle = this.hue;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class NebulaLayer {
    constructor(x, y, radius, colors, speed, direction) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.colors = colors;
      this.speed = speed;
      this.direction = direction;
      this.angle = 0;
    }
    
    update(timestamp) {
      this.angle = timestamp * 0.0005 * this.speed;
    }
    
    draw(ctx) {
      const gradient = ctx.createRadialGradient(
        this.x + Math.cos(this.angle) * this.radius * 0.3,
        this.y + Math.sin(this.angle) * this.radius * 0.3,
        0,
        this.x,
        this.y,
        this.radius
      );
      
      this.colors.forEach((color, index) => {
        gradient.addColorStop(index * 0.33, color);
      });
      
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.ellipse(
        this.x,
        this.y,
        this.radius,
        this.radius * 0.6,
        this.angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  // Initialize
  function init() {
    createNodes();
    createConnections();
    createParticles();
    createStars();
    createNebulaLayers();
    createFilmGrain();
    
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    
    // Setup resize handler
    window.addEventListener('resize', handleResize);
  }

  function createNodes() {
    // Central hub in upper-right
    const hubX = state.width * 0.85;
    const hubY = state.height * 0.25;
    state.nodes.push(new Node(hubX, hubY));
    
    // Dense cluster in lower-left
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 150 + Math.random() * 200;
      const x = state.width * 0.15 + Math.cos(angle) * radius;
      const y = state.height * 0.85 + Math.sin(angle) * radius;
      state.nodes.push(new Node(x, y));
    }
    
    // Scattered medium clusters
    for (let i = 0; i < 15; i++) {
      const clusterX = Math.random() * state.width * 0.8 + state.width * 0.1;
      const clusterY = Math.random() * state.height * 0.8 + state.height * 0.1;
      state.nodes.push(new Node(clusterX, clusterY));
    }
    
    // Scattered small nodes
    for (let i = 0; i < 7; i++) {
      state.nodes.push(new Node(
        Math.random() * state.width,
        Math.random() * state.height
      ));
    }
  }

  function createConnections() {
    // Create triangular connections for lower-left cluster
    const lowerLeftNodes = state.nodes.filter((node, index) => index < 12);
    
    for (let i = 0; i < lowerLeftNodes.length; i++) {
      for (let j = i + 1; j < lowerLeftNodes.length; j++) {
        const nodeA = lowerLeftNodes[i];
        const nodeB = lowerLeftNodes[j];
        const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
        
        if (dist < 300) {
          const transparency = Math.random() * 0.2;
          state.connections.push(new Connection(nodeA, nodeB, transparency));
        }
      }
    }
    
    // Create radiating connections from hub
    const hub = state.nodes[0];
    const otherNodes = state.nodes.slice(1);
    
    for (const node of otherNodes) {
      if (Math.hypot(hub.x - node.x, hub.y - node.y) < 400) {
        const transparency = 0.05 + Math.random() * 0.1;
        state.connections.push(new Connection(hub, node, transparency));
      }
    }
    
    // Create additional random connections
    for (let i = 0; i < state.nodes.length; i++) {
      for (let j = i + 1; j < state.nodes.length; j++) {
        const nodeA = state.nodes[i];
        const nodeB = state.nodes[j];
        const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
        
        if (dist < 200 && i >= 12) {
          const transparency = Math.random() * 0.1;
          state.connections.push(new Connection(nodeA, nodeB, transparency));
        }
      }
    }
  }

  function createParticles() {
    for (let i = 0; i < config.maxParticles; i++) {
      state.particles.push(new Particle());
    }
  }

  function createStars() {
    for (let i = 0; i < config.maxStars; i++) {
      state.stars.push(new Star());
    }
  }

  function createNebulaLayers() {
    const nebulaColors = [
      [`rgba(0, 255, 212, 0.3)`, `rgba(100, 196, 255, 0.2)`, `rgba(255, 46, 39, 0.1)`],
      [`rgba(100, 196, 255, 0.25)`, `rgba(255, 255, 255, 0.15)`, `rgba(255, 255, 255, 0.05)`],
      [`rgba(255, 255, 255, 0.2)`, `rgba(0, 255, 212, 0.15)`, `rgba(255, 46, 39, 0.08)`],
    ];
    
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * state.width;
      const y = Math.random() * state.height;
      const radius = 400 + Math.random() * 600;
      const speed = (Math.random() - 0.5) * 0.5;
      const direction = Math.random() * Math.PI * 2;
      state.nebulaLayers.push(new NebulaLayer(
        x, y, radius,
        nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        speed, direction
      ));
    }
  }

  function createFilmGrain() {
    state.filmGrain = {
      width: state.width,
      height: state.height,
      density: 0.02,
      speed: 0.001,
      lastUpdate: Date.now(),
      pattern: null
    };
    
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillRect(1, 1, 1, 1);
    
    state.filmGrain.pattern = ctx.createPattern(canvas, 'repeat');
  }

  function createShootingStars() {
    if (Math.random() > 0.985) {
      const angle = (Math.PI / 4) * (Math.random() - 0.5);
      const speed = 5 + Math.random() * 10;
      const length = 80 + Math.random() * 120;
      const x = Math.random() * state.width;
      const y = Math.random() * (state.height / 2);
      
      state.shootingStars = state.shootingStars || [];
      state.shootingStars.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1000 + Math.random() * 800,
        hue: Math.random() > 0.7 ? 
          [config.colors.primary, config.colors.secondary, 'white'][Math.floor(Math.random() * 3)] : 
          config.colors.primary,
        opacity: 0,
        fadeIn: true,
        fadeOut: false
      });
    }
  }

  function handleResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    
    state.nodes.forEach(node => {
      node.x = Math.max(20, Math.min(state.width - 20, node.x));
      node.y = Math.max(20, Math.min(state.height - 20, node.y));
    });
    
    if (state.filmGrain) {
      state.filmGrain.width = state.width;
      state.filmGrain.height = state.height;
    }
  }

  function updateNodes(timestamp) {
    const mouseInAnyNode = state.nodes.some(node => {
      const dx = (node.x - state.mouseX * state.width) / state.width;
      const dy = (node.y - state.mouseY * state.height) / state.height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < node.interactionRadius;
    });
    
    state.nodes.forEach(node => {
      const dx = (node.x - state.mouseX * state.width) / state.width;
      const dy = (node.y - state.mouseY * state.height) / state.height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      node.update(timestamp, dist < node.interactionRadius / 2);
    });
  }

  function updateConnections(timestamp) {
    state.connections.forEach(connection => {
      const mouseInNodeA = isMouseInNode(connection.nodeA);
      const mouseInNodeB = isMouseInNode(connection.nodeB);
      connection.update(timestamp, mouseInNodeA, mouseInNodeB);
    });
  }

  function updateNebula(timestamp) {
    state.nebulaLayers.forEach(layer => {
      layer.update(timestamp);
    });
  }

  function updateParticles(timestamp) {
    state.particles.forEach(particle => {
      particle.update();
    });
    
    if (Date.now() - state.lastParticleTime > config.particleRefresh) {
      state.particles.push(new Particle());
      if (state.particles.length > config.maxParticles) {
        state.particles.shift();
      }
      state.lastParticleTime = Date.now();
    }
  }

  function updateStars(timestamp) {
    state.stars.forEach(star => {
      star.update(timestamp);
    });
    
    if (Date.now() - state.lastStarTime > Math.random() * 2000 + 2000) {
      state.stars.push(new Star());
      if (state.stars.length > config.maxStars) {
        state.stars.shift();
      }
      state.lastStarTime = Date.now();
    }
  }

  function createGlobalSync(timestamp) {
    const now = Date.now();
    if (now - state.lastSyncTime > Math.random() * 10000 + 5000) {
      state.lastSyncTime = now;
      
      // Find the largest node to trigger sync
      const largestNode = [...state.nodes].sort((a, b) => b.baseRadius - a.baseRadius)[0];
      
      // Create sync ripple effect
      state.syncRipple = {
        x: largestNode.x,
        y: largestNode.y,
        radius: 0,
        maxRadius: Math.max(state.width, state.height) * 0.6,
        startTime: timestamp,
        duration: 3000
      };
    }
  }

  function updateSyncRipple(timestamp) {
    if (state.syncRipple) {
      const elapsed = timestamp - state.syncRipple.startTime;
      state.syncRipple.radius = (elapsed / state.syncRipple.duration) * state.syncRipple.maxRadius;
      
      if (elapsed > state.syncRipple.duration) {
        delete state.syncRipple;
      }
    }
  }

  function drawNebula(ctx) {
    state.nebulaLayers.forEach(layer => {
      layer.draw(ctx);
    });
  }

  function drawConnections(ctx) {
    state.connections.forEach(connection => {
      const mouseInNodeA = isMouseInNode(connection.nodeA);
      const mouseInNodeB = isMouseInNode(connection.nodeB);
      connection.draw(ctx, mouseInNodeA, mouseInNodeB);
    });
  }

  function drawNodes(ctx) {
    const mouseInAnyNode = isMouseInNode(null);
    
    state.nodes.forEach(node => {
      const isInteractive = mouseInAnyNode && (
        isMouseInNode(node) || 
        state.connections.some(conn => 
          (conn.nodeA === node && isMouseInNode(conn.nodeB)) ||
          (conn.nodeB === node && isMouseInNode(conn.nodeA))
        )
      );
      
      node.draw(ctx, isInteractive);
    });
    
    // Draw sync ripple
    if (state.syncRipple) {
      const gradient = ctx.createRadialGradient(
        state.syncRipple.x,
        state.syncRipple.y,
        0,
        state.syncRipple.x,
        state.syncRipple.y,
        state.syncRipple.radius
      );
      
      gradient.addColorStop(0, `rgba(0, 255, 212, 0.15)`);
      gradient.addColorStop(0.5, `rgba(0, 255, 212, 0.05)`);
      gradient.addColorStop(1, `rgba(0, 255, 212, 0)`);
      
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        state.syncRipple.x,
        state.syncRipple.y,
        state.syncRipple.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(ctx) {
    state.particles.forEach(particle => {
      particle.draw(ctx);
    });
  }

  function drawStars(ctx) {
    state.stars.forEach(star => {
      star.draw(ctx);
    });
  }

  function drawShootingStars(ctx) {
    if (!state.shootingStars) return;
    
    state.shootingStars.forEach((shootingStar, index) => {
      const progress = shootingStar.life / shootingStar.maxLife;
      
      ctx.save();
      ctx.globalAlpha = shootingStar.opacity;
      ctx.strokeStyle = shootingStar.hue;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = shootingStar.hue;
      
      ctx.beginPath();
      ctx.moveTo(
        shootingStar.x - Math.cos(shootingStar.vx / 5) * shootingStar.maxLife * progress,
        shootingStar.y - Math.sin(shootingStar.vy / 5) * shootingStar.maxLife * progress
      );
      ctx.lineTo(
        shootingStar.x,
        shootingStar.y
      );
      
      ctx.stroke();
      
      shootingStar.life += 16;
      if (shootingStar.life > shootingStar.maxLife) {
        if (shootingStar.fadeIn) {
          shootingStar.fadeIn = false;
          shootingStar.fadeOut = true;
          shootingStar.opacity = 1;
        } else {
          state.shootingStars.splice(index, 1);
        }
      } else {
        if (shootingStar.fadeIn) {
          shootingStar.opacity = Math.min(1, shootingStar.opacity + 0.02);
        } else {
          shootingStar.opacity = Math.max(0, shootingStar.opacity - 0.03);
        }
      }
      
      ctx.restore();
    });
  }

  function drawFilmGrain(ctx) {
    if (!state.filmGrain || Date.now() - state.filmGrain.lastUpdate > 33) {
      return;
    }
    
    ctx.save();
    ctx.globalAlpha = Math.random() * 0.04 + 0.02;
    ctx.fillStyle = state.filmGrain.pattern;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function isMouseInNode(node) {
    if (!node) {
      return state.nodes.some(n => {
        const dx = (n.x - state.mouseX * state.width) / state.width;
        const dy = (n.y - state.mouseY * state.height) / state.height;
        return Math.sqrt(dx * dx + dy * dy) < n.interactionRadius / 2;
      });
    }
    
    const dx = (node.x - state.mouseX * state.width) / state.width;
    const dy = (node.y - state.mouseY * state.height) / state.height;
    return Math.sqrt(dx * dx + dy * dy) < node.interactionRadius / 2;
  }

  // Camera movement animation
  function animateCamera(ctx) {
    const time = Date.now();
    const cycleTime = config.cameraDuration;
    const cyclePhase = (time % cycleTime) / cycleTime;
    
    let scale = 1;
    let x = 0;
    let y = 0;
    
    if (cyclePhase < 0.25) {
      const phase = cyclePhase / 0.25;
      scale = 1 + (0.05 - 1) * easeInOut(phase);
      x = (0.1 - 0) * easeInOut(phase);
      y = (0.1 - 0) * easeInOut(phase);
    } else if (cyclePhase < 0.5) {
      const phase = (cyclePhase - 0.25) / 0.25;
      scale = 1 + (1.05 - 1) * easeInOut(phase);
      x = (0.1 - 0.5) * easeInOut(phase);
      y = (0.1 - 0.2) * easeInOut(phase);
    } else if (cyclePhase < 0.75) {
      const phase = (cyclePhase - 0.5) / 0.25;
      scale = 1 + (1.05 - 1) * easeInOut(phase);
      x = (0.5 - 0.5) * easeInOut(phase);
      y = (0.2 - (-0.1)) * easeInOut(phase);
    } else {
      const phase = (cyclePhase - 0.75) / 0.25;
      scale = 1 + (-0.05 - 1) * easeInOut(phase);
      x = (0.5 - 0.1) * easeInOut(phase);
      y = (-0.1 - 0.1) * easeInOut(phase);
    }
    
    ctx.save();
    ctx.translate(state.width / 2, state.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-state.width / 2 + x * state.width, -state.height / 2 + y * state.height);
    return ctx;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // Main animation loop
  function animate(timestamp) {
    if (state.isPaused) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, state.width, state.height);
    
    // Apply camera animation
    const cameraCtx = animateCamera(ctx);
    
    // Draw nebula layers (behind everything)
    drawNebula(cameraCtx || ctx);
    
    // Draw connections
    drawConnections(cameraCtx || ctx);
    
    // Draw particles
    drawParticles(cameraCtx || ctx);
    
    // Draw stars
    drawStars(cameraCtx || ctx);
    
    // Draw shooting stars
    drawShootingStars(cameraCtx || ctx);
    
    // Draw nodes (on top of lines)
    drawNodes(cameraCtx || ctx);
    
    // Draw film grain
    drawFilmGrain(cameraCtx || ctx);
    
    // Update animations
    updateNodes(timestamp);
    updateConnections(timestamp);
    updateNebula(timestamp);
    updateParticles(timestamp);
    updateStars(timestamp);
    createGlobalSync(timestamp);
    updateSyncRipple(timestamp);
    createShootingStars();
    
    state.animationId = requestAnimationFrame(animate);
  }

  // Public API
  return {
    init,
    pause: () => { state.isPaused = true; },
    resume: () => { state.isPaused = false; animate(performance.now()); },
    setMousePosition: (x, y) => {
      state.mouseX = x;
      state.mouseY = y;
    }
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'hero-canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  
  const heroSection = document.querySelector('#home');
  if (heroSection) {
    heroSection.style.position = 'relative';
    heroSection.appendChild(canvas);
  }
  
  HeroBackground.canvas = canvas;
  HeroBackground.init();
  HeroBackground.animate(performance.now());
});

// Handle mouse movement
let mouseMoveTimeout;
document.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  
  HeroBackground.setMousePosition(x, y);
});

// Handle resize
window.addEventListener('resize', () => {
  HeroBackground.init();
});

/* ── BOOT SEQUENCE ──────────────────────────────────────────── */
(function() {
  const overlay = document.getElementById('boot-overlay');
  const logEl   = document.getElementById('boot-log');
  const bar     = document.getElementById('boot-bar');
  const pctEl   = document.getElementById('boot-pct');
  if (!overlay || !logEl || !bar || !pctEl) return;

  const lines = [
    { text: 'BIOS POST check....................', cls: 'bl-ok', delay: 120 },
    { text: 'CPU: ARM64 @ 2.4GHz (4 cores)', cls: '', delay: 80 },
    { text: 'RAM: 8192 MiB OK', cls: '', delay: 80 },
    { text: 'Loading kernel image...............', cls: 'bl-ok', delay: 200 },
    { text: 'Mounting root filesystem...........', cls: 'bl-ok', delay: 180 },
    { text: 'Starting containerd runtime........', cls: 'bl-ok', delay: 220 },
    { text: 'k3s agent started', cls: 'bl-ok', delay: 150 },
    { text: 'Pulling images.....................', cls: 'bl-dim', delay: 300 },
    { text: '  └─ api-gateway:2.4.1', cls: 'bl-ok', delay: 120 },
    { text: '  └─ frontend:1.8.0', cls: 'bl-ok', delay: 100 },
    { text: '  └─ redis:7.2-alpine', cls: 'bl-ok', delay: 90 },
    { text: '  └─ nginx:1.27-alpine', cls: 'bl-ok', delay: 90 },
    { text: 'All pods running...................', cls: 'bl-ok', delay: 180 },
    { text: 'Ingress controller ready...........', cls: 'bl-ok', delay: 140 },
    { text: 'TLS certificates valid.............', cls: 'bl-ok', delay: 120 },
    { text: 'Health checks passing..............', cls: 'bl-ok', delay: 150 },
    { text: 'System ready.', cls: 'bl-ok', delay: 200 },
  ];

  const totalSteps = lines.length;
  let step = 0;

  function addLine(line) {
    const el = document.createElement('div');
    el.className = 'bl-line';
    el.innerHTML = '<span class="' + (line.cls || '') + '">' + line.text + '</span>';
    logEl.appendChild(el);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function updateBar() {
    step++;
    const pct = Math.round((step / totalSteps) * 100);
    bar.style.width = pct + '%';
    pctEl.textContent = pct + '%';
  }

  function runStep() {
    if (step >= totalSteps) {
      setTimeout(function() {
        overlay.classList.add('done');
      }, 300);
      return;
    }
    addLine(lines[step]);
    updateBar();
    setTimeout(runStep, lines[step].delay);
  }

  runStep();
})();