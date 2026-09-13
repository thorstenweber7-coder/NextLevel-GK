import React, { useEffect, useRef } from 'react';

// ============================================================================
// ANIMATION CONFIGURATION
// Easily adjust these parameters to customize the visual feel, speed, and look!
// ============================================================================
const CONFIG = {
  duration: 1000,             // Animation duration in milliseconds (max 2 seconds)
  ballRadius: 24,             // Radius of the flying ball
  ballGlow: 20,               // Outer glow radius of the ball
  ballColor: '#ffffff',       // Core ball base color
  ballAccentColor: '#0f172a', // Classic deep black/slate panels
  spinSpeed: 7,               // Spin rate (full rotations over the duration)
  
  // Campfire Spark Particle System
  sparkDensity: 12,           // Richer trail with more glowing sparks
  sparkColors: [
    '#ffffff',                // White-hot flame core
    '#ffea00',                // Intense yellow
    '#ff9500',                // Vivid fire orange
    '#ff4500',                // Fiery red-orange
    '#d62828'                 // Glowing deep embers
  ],
  sparkMinSize: 0.8,          // Small ember specks
  sparkMaxSize: 3.8,          // Larger glowing ash pieces
  sparkMinLife: 0.4,          // Duration particles stay alive
  sparkMaxLife: 1.3,          // Up to 1.3 seconds of flight/draft
  sparkGravity: -0.08,        // NEGATIVE gravity: hot air drafts embers UPWARDS!
  sparkFriction: 0.98,        // High air resistance: embers slow down and float
  sparkVelocityFactor: 0.22,  // Velocity transfer from the moving ball
  sparkSpread: 3.8,           // Dispersal of the crackling embers
};

interface BallTransitionProps {
  trigger: boolean;
  onMidpoint: () => void;
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;     // Remaining life normalized (1.0 down to 0.0)
  decay: number;    // Subtracted from life each frame
}

const BallTransition: React.FC<BallTransitionProps> = ({ trigger, onMidpoint, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef({
    startTime: 0,
    hasTriggeredMidpoint: false,
    particles: [] as Particle[],
  });

  // Sync callbacks to mutable refs to prevent re-triggering the useEffect loop
  const onMidpointRef = useRef(onMidpoint);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onMidpointRef.current = onMidpoint;
  }, [onMidpoint]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) {
      // Clear canvas if any animation is still running
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI retina displays
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize animation state
    stateRef.current.startTime = performance.now();
    stateRef.current.hasTriggeredMidpoint = false;
    stateRef.current.particles = [];

    const animate = (timestamp: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const elapsed = timestamp - stateRef.current.startTime;
      const progress = Math.min(elapsed / CONFIG.duration, 1);

      // Define Arc Trajectory (smooth parabolic curve)
      const x0 = -100;
      const y0 = height * 0.85;
      const x1 = width + 100;
      const y1 = height * 0.85;
      const h = height * 0.65; // Peak height of the parabolic arc

      // Parabolic flight formula
      const ballX = x0 + (x1 - x0) * progress;
      const ballY = y0 + (y1 - y0) * progress - 4 * h * progress * (1 - progress);

      // Instantaneous ball velocity components
      const dt = 1 / CONFIG.duration;
      const nextProgress = Math.min(progress + dt, 1);
      const nextBallX = x0 + (x1 - x0) * nextProgress;
      const nextBallY = y0 + (y1 - y0) * nextProgress - 4 * h * nextProgress * (1 - nextProgress);
      
      // Velocity vectors
      const ballVx = nextBallX - ballX;
      const ballVy = nextBallY - ballY;

      // Clear the canvas with high performance clearRect
      ctx.clearRect(0, 0, width, height);

      // Trigger mid-point tab change callback exactly when the ball reaches the peak (50% progress)
      if (progress >= 0.5 && !stateRef.current.hasTriggeredMidpoint) {
        stateRef.current.hasTriggeredMidpoint = true;
        onMidpointRef.current();
      }

      // Generate spark trail while ball is flying
      if (progress < 1) {
        for (let i = 0; i < CONFIG.sparkDensity; i++) {
          const randAngle = Math.random() * Math.PI * 2;
          const randSpeed = Math.random() * CONFIG.sparkSpread;
          
          // Sparks fly backwards relative to the ball velocity, with some explosive dispersion
          const initVx = -ballVx * CONFIG.sparkVelocityFactor + Math.cos(randAngle) * randSpeed;
          const initVy = -ballVy * CONFIG.sparkVelocityFactor + Math.sin(randAngle) * randSpeed;

          const lifeSeconds = CONFIG.sparkMinLife + Math.random() * (CONFIG.sparkMaxLife - CONFIG.sparkMinLife);
          const decayPerFrame = 1 / (lifeSeconds * 60); // approx 60 FPS

          stateRef.current.particles.push({
            x: ballX + (Math.random() - 0.5) * 10,
            y: ballY + (Math.random() - 0.5) * 10,
            vx: initVx,
            vy: initVy,
            size: CONFIG.sparkMinSize + Math.random() * (CONFIG.sparkMaxSize - CONFIG.sparkMinSize),
            color: CONFIG.sparkColors[Math.floor(Math.random() * CONFIG.sparkColors.length)],
            life: 1.0,
            decay: decayPerFrame
          });
        }
      }

      // Update and Draw Particles
      stateRef.current.particles = stateRef.current.particles.filter(p => {
        p.life -= p.decay;
        if (p.life <= 0) return false;

        // Apply physics
        p.vx *= CONFIG.sparkFriction;
        p.vy *= CONFIG.sparkFriction;
        p.vy += CONFIG.sparkGravity; // Negative gravity pulls embers upward
        
        // Add subtle horizontal drafts/flicker wobble
        p.vx += (Math.random() - 0.5) * 0.18;
        
        p.x += p.vx;
        p.y += p.vy;

        // Shrink the embers as they burn out and cool down
        const currentSize = Math.max(0.2, p.size * p.life);

        // Determine ember color phase dynamically based on lifetime (hot core cooling down)
        let displayColor = p.color;
        let glowColor = p.color;
        
        if (p.life > 0.75) {
          displayColor = '#ffffff'; // White-hot core
          glowColor = '#ffea00';    // Intense yellow halo
        } else if (p.life > 0.4) {
          displayColor = '#ff9500'; // Rich orange
          glowColor = '#ff4500';    // Red-orange aura
        } else {
          displayColor = '#ff4500'; // Cooling deep red
          glowColor = '#d62828';    // Dim amber glow
        }

        // Render individual spark
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        
        // Glimmering glow of campfire embers
        ctx.shadowBlur = currentSize * 3;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = displayColor;
        
        // Add random slight flicker to mimic natural flames
        const flicker = 0.85 + Math.random() * 0.15;
        ctx.globalAlpha = p.life * flicker;
        
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Draw flying traditional soccer ball
      if (progress < 1) {
        ctx.save();
        ctx.translate(ballX, ballY);
        
        // Spin rotation over flight progress
        const rotationAngle = progress * CONFIG.spinSpeed * Math.PI * 2;
        ctx.rotate(rotationAngle);

        // Draw shadow/bloom glow of the spinning soccer ball
        ctx.shadowBlur = CONFIG.ballGlow;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';

        // Create elegant 3D radial gradient shading for the sphere
        const gradient = ctx.createRadialGradient(
          -CONFIG.ballRadius * 0.3, -CONFIG.ballRadius * 0.3, CONFIG.ballRadius * 0.1,
          0, 0, CONFIG.ballRadius
        );
        gradient.addColorStop(0, '#ffffff');       // shiny reflection
        gradient.addColorStop(0.75, '#f1f5f9');    // light slate grey body
        gradient.addColorStop(1, '#94a3b8');       // sphere deep shadow edge

        // Draw outer ball shape (glowing core)
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Clear shadow to draw clean internal seams
        ctx.shadowBlur = 0;

        // Draw outer edge pentagonal shapes (black/slate panels on the edge of the ball)
        ctx.fillStyle = CONFIG.ballAccentColor;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;

        for (let j = 0; j < 5; j++) {
          const angle = (j * Math.PI * 2) / 5 - Math.PI / 2;
          
          ctx.beginPath();
          const peakX = Math.cos(angle) * (CONFIG.ballRadius * 0.7);
          const peakY = Math.sin(angle) * (CONFIG.ballRadius * 0.7);
          const r1X = Math.cos(angle - 0.28) * CONFIG.ballRadius;
          const r1Y = Math.sin(angle - 0.28) * CONFIG.ballRadius;
          const r2X = Math.cos(angle + 0.28) * CONFIG.ballRadius;
          const r2Y = Math.sin(angle + 0.28) * CONFIG.ballRadius;
          
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(r1X, r1Y);
          ctx.arc(0, 0, CONFIG.ballRadius, angle - 0.28, angle + 0.28);
          ctx.lineTo(peakX, peakY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Draw center classic pentagonal black panel
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const angle = (j * Math.PI * 2) / 5 - Math.PI / 2;
          const px = Math.cos(angle) * (CONFIG.ballRadius * 0.35);
          const py = Math.sin(angle) * (CONFIG.ballRadius * 0.35);
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = CONFIG.ballAccentColor;
        ctx.fill();
        ctx.stroke();

        // Draw hexagonal seam lines extending from the center panel to the outer edge panels
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.8;
        for (let j = 0; j < 5; j++) {
          const angle = (j * Math.PI * 2) / 5 - Math.PI / 2;
          const innerX = Math.cos(angle) * (CONFIG.ballRadius * 0.35);
          const innerY = Math.sin(angle) * (CONFIG.ballRadius * 0.35);
          const outerX = Math.cos(angle) * (CONFIG.ballRadius * 0.7);
          const outerY = Math.sin(angle) * (CONFIG.ballRadius * 0.7);

          ctx.beginPath();
          ctx.moveTo(innerX, innerY);
          ctx.lineTo(outerX, outerY);
          ctx.stroke();
        }

        // External circular rim line for polished outline
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.ballRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Keep animating if ball has not completed flight or if sparks are still alive
      if (progress < 1 || stateRef.current.particles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Entire effect is finished!
        onCompleteRef.current();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trigger]); // Only run/start when trigger becomes active

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      id="tab-transition-canvas"
    />
  );
};

export default BallTransition;
