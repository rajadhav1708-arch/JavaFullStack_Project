import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  size: number;
  baseSize: number;
  opacity: number;
  color: string;
}

interface AntigravityParticlesProps {
  className?: string;
  count?: number;
  radius?: number; // magnet attraction radius
  strength?: number; // magnet strength (0 - 1)
  repel?: boolean; // repel instead of attract
  returnSpeed?: number; // how fast particles return to origin (0 - 0.2)
  friction?: number; // velocity damping (0 - 1)
  size?: number;
  sizeVariation?: number;
  color?: string;
  connectLines?: boolean;
  lineOpacity?: number;
  lineDistance?: number;
  mouseInfluence?: boolean;
  autoAnimate?: boolean;
  autoSpeed?: number;
}

export const AntigravityParticles: React.FC<AntigravityParticlesProps> = ({
  className = '',
  count = 220,
  radius = 160,
  strength = 0.12,
  repel = false,
  returnSpeed = 0.02,
  friction = 0.92,
  size = 1.2,
  sizeVariation = 0.4,
  color = '#34d399',
  connectLines = false,
  lineOpacity = 0.08,
  lineDistance = 120,
  mouseInfluence = true,
  autoAnimate = false,
  autoSpeed = 0.0002,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      // Reinitialize particles in a grid-like ring spread
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const cols = Math.floor(Math.sqrt(count));
      const rows = Math.ceil(count / cols);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const gridX = (col / cols - 0.5) * width * 0.8;
        const gridY = (row / rows - 0.5) * height * 0.8;

        // Add some organic offset for natural spread
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(width, height) * 0.15;
        const jitterX = Math.cos(angle) * dist;
        const jitterY = Math.sin(angle) * dist;

        const baseSize = size + Math.random() * sizeVariation;
        particles.push({
          x: width / 2 + gridX + jitterX,
          y: height / 2 + gridY + jitterY,
          vx: 0,
          vy: 0,
          originX: width / 2 + gridX + jitterX,
          originY: height / 2 + gridY + jitterY,
          size: baseSize,
          baseSize,
          opacity: 0.08 + Math.random() * 0.25,
          color,
        });
      }
      particlesRef.current = particles;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInfluence) return;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mouseInfluence || e.touches.length === 0) return;
      const touch = e.touches[0];
      mouseRef.current.x = touch.clientX;
      mouseRef.current.y = touch.clientY;
      mouseRef.current.active = true;
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    const animate = (t: number) => {
      timeRef.current = t * 0.001;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const dir = repel ? -1 : 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let dx = 0;
        let dy = 0;
        let dist = 0;
        let force = 0;

        // Mouse influence
        if (mouse.active && mouseInfluence) {
          dx = mouse.x - p.x;
          dy = mouse.y - p.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && dist > 0.0001) {
            force = (1 - dist / radius) * strength * dir;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            p.vx += fx;
            p.vy += fy;

            // Subtly grow particles near cursor
            p.size += (p.baseSize * 0.4 - p.size) * 0.08;
          }
        }

        // Auto animate - gentle orbital motion
        if (autoAnimate && !mouse.active) {
          const tAuto = timeRef.current;
          const ax = Math.sin(tAuto * autoSpeed + i * 0.01) * 0.0001;
          const ay = Math.cos(tAuto * autoSpeed + i * 0.01) * 0.0001;
          p.vx += ax;
          p.vy += ay;
        }

        // Return to origin
        dx = p.originX - p.x;
        dy = p.originY - p.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.01) {
          p.vx += dx * returnSpeed;
          p.vy += dy * returnSpeed;
        }

        // Apply friction
        p.vx *= friction;
        p.vy *= friction;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Shrink back to base size
        p.size += (p.baseSize - p.size) * 0.05;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Connect lines
      if (connectLines) {
        ctx.save();
        ctx.globalAlpha = lineOpacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < lineDistance) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    count,
    radius,
    strength,
    repel,
    returnSpeed,
    friction,
    size,
    sizeVariation,
    color,
    connectLines,
    lineOpacity,
    lineDistance,
    mouseInfluence,
    autoAnimate,
    autoSpeed,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
};
