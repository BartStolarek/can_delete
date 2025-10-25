'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface HexagonGridProps {
  hexSize?: number;
  staticHexChance?: number;
  panSpeed?: number;
  backgroundColor?: string;
  hexagonColor?: string;
  starColor?: string;
  hoverDelay?: number;
  className?: string;
}

interface Hexagon {
  x: number;
  y: number;
  hasStaticOpacity: boolean;
  shouldHover: boolean;
  opacity: number;
  hoverOpacity: number;
  hoverTarget: number;
}

export function HexagonGrid({
  hexSize = 30,
  staticHexChance = 0.01,
  panSpeed = 0.15,
  backgroundColor = '#0f0a1a',
  hexagonColor = '#3b82f6',
  starColor = 'rgba(100, 116, 139, 0.3)',
  hoverDelay = 0.3,
  className = '',
}: HexagonGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const hexagonsRef = useRef<Hexagon[]>([]);
  const offsetRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const waveTimeRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Calculate hexagon vertices
  const getHexagonVertices = useCallback((cx: number, cy: number, size: number) => {
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      vertices.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle),
      });
    }
    return vertices;
  }, []);

  // Initialize hexagon grid
  const initializeGrid = useCallback((width: number, height: number) => {
    const hexagons: Hexagon[] = [];
    const hexWidth = hexSize * Math.sqrt(3);
    const hexHeight = hexSize * 2;
    const verticalSpacing = hexHeight * 0.75;

    const cols = Math.ceil(width / hexWidth) + 2;
    const rows = Math.ceil(height / verticalSpacing) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * hexWidth + (row % 2) * (hexWidth / 2);
        const y = row * verticalSpacing;

        const hasStaticOpacity = Math.random() < staticHexChance;
        const shouldHover = Math.random() < staticHexChance;

        hexagons.push({
          x,
          y,
          hasStaticOpacity,
          shouldHover,
          // Static opacity between 0 and 0.5 for 1% of hexagons
          opacity: hasStaticOpacity ? Math.random() * 0.5 : 0,
          hoverOpacity: 0,
          hoverTarget: 0,
        });
      }
    }

    hexagonsRef.current = hexagons;
  }, [hexSize, staticHexChance]);

  // Draw a hexagon
  const drawHexagon = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    opacity: number,
  ) => {
    if (opacity <= 0.01) return;

    ctx.beginPath();
    const vertices = getHexagonVertices(cx, cy, size);
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = hexagonColor.includes('rgb')
      ? hexagonColor.replace(')', `, ${opacity})`)
      : `${hexagonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  }, [hexagonColor, getHexagonVertices]);

  // Draw star at vertex
  const drawStar = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    wave: number,
    waveOffset: number,
  ) => {
    // Much fainter base brightness with subtle wave glow
    const brightness = 0.08 + wave * 0.08;
    // Oscillating movement: up when wave brightens, down when wave dims
    // Centers around 0 so it moves both up and down
    const yOffset = -(wave - 0.5) * 4;

    ctx.save();
    ctx.translate(x, y + yOffset + waveOffset);

    // Draw simple dot (circle)
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fillStyle = starColor.includes('rgba')
      ? starColor.replace(/[\d.]+\)/, `${brightness})`)
      : `${starColor}${Math.floor(brightness * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();

    ctx.restore();
  }, [starColor]);

  // Check if point is inside hexagon
  const isPointInHexagon = useCallback((
    px: number,
    py: number,
    cx: number,
    cy: number,
    size: number,
  ) => {
    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - cy);

    if (dx > size * Math.sqrt(3) / 2 || dy > size) return false;

    return dy <= size * (1 - dx / (size * Math.sqrt(3)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      ctx.scale(dpr, dpr);

      setCanvasSize({ width: newWidth, height: newHeight });
      initializeGrid(newWidth, newHeight);
    };

    updateCanvasSize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', updateCanvasSize);

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update pan offset - continuous movement northwest (no modulo)
      offsetRef.current.x += panSpeed * deltaTime * 60;
      offsetRef.current.y += panSpeed * deltaTime * 60;

      // Update wave time
      waveTimeRef.current += deltaTime * 2;

      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      const hexWidth = hexSize * Math.sqrt(3);
      const hexHeight = hexSize * 2;
      const verticalSpacing = hexHeight * 0.75;

      // Wrap hexagons that have moved off-screen to the northwest
      hexagonsRef.current.forEach((hex) => {
        const screenX = hex.x - offsetRef.current.x;
        const screenY = hex.y - offsetRef.current.y;

        // If hexagon is too far off the northwest edge, wrap it to the southeast
        if (screenX < -hexWidth * 3) {
          hex.x += hexWidth * (Math.ceil(canvasSize.width / hexWidth) + 4);
          // Regenerate random properties for wrapped hexagons
          const hasStaticOpacity = Math.random() < staticHexChance;
          hex.hasStaticOpacity = hasStaticOpacity;
          hex.opacity = hasStaticOpacity ? Math.random() * 0.5 : 0;
          hex.shouldHover = Math.random() < staticHexChance;
          hex.hoverOpacity = 0;
          hex.hoverTarget = 0;
        }
        if (screenY < -hexHeight * 3) {
          hex.y += verticalSpacing * (Math.ceil(canvasSize.height / verticalSpacing) + 4);
          // Regenerate random properties for wrapped hexagons
          const hasStaticOpacity = Math.random() < staticHexChance;
          hex.hasStaticOpacity = hasStaticOpacity;
          hex.opacity = hasStaticOpacity ? Math.random() * 0.5 : 0;
          hex.shouldHover = Math.random() < staticHexChance;
          hex.hoverOpacity = 0;
          hex.hoverTarget = 0;
        }
      });

      // Draw stars at vertices with wave effect
      hexagonsRef.current.forEach((hex) => {
        const screenX = hex.x - offsetRef.current.x;
        const screenY = hex.y - offsetRef.current.y;

        if (
          screenX > -hexWidth &&
          screenX < canvasSize.width + hexWidth &&
          screenY > -hexHeight &&
          screenY < canvasSize.height + hexHeight
        ) {
          const vertices = getHexagonVertices(screenX, screenY, hexSize);
          vertices.forEach((vertex, i) => {
            // Longer wavelength (smaller frequency), more subtle wave
            const wave =
              (Math.sin(waveTimeRef.current + vertex.x * 0.003 + vertex.y * 0.003) + 1) / 2;
            const waveOffset = Math.sin(waveTimeRef.current * 0.5 + vertex.x * 0.002) * 1;
            drawStar(ctx, vertex.x, vertex.y, 1.5, wave, waveOffset);
          });
        }
      });

      // Update and draw hexagons
      hexagonsRef.current.forEach((hex) => {
        const screenX = hex.x - offsetRef.current.x;
        const screenY = hex.y - offsetRef.current.y;

        // Skip if off-screen
        if (
          screenX < -hexWidth ||
          screenX > canvasSize.width + hexWidth ||
          screenY < -hexHeight ||
          screenY > canvasSize.height + hexHeight
        ) {
          return;
        }

        // Update hover with delay
        if (hex.shouldHover) {
          const isHovered = isPointInHexagon(
            mouseRef.current.x,
            mouseRef.current.y,
            screenX,
            screenY,
            hexSize,
          );

          hex.hoverTarget = isHovered ? 0.8 : 0;
          const hoverSpeed = hoverDelay * (isHovered ? 0.5 : 1);
          hex.hoverOpacity += (hex.hoverTarget - hex.hoverOpacity) * hoverSpeed * deltaTime * 60;
        }

        // Draw hexagon with combined opacity
        const finalOpacity = Math.max(hex.opacity, hex.hoverOpacity);
        drawHexagon(ctx, screenX, screenY, hexSize, finalOpacity);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [
    hexSize,
    panSpeed,
    backgroundColor,
    hoverDelay,
    staticHexChance,
    canvasSize.width,
    canvasSize.height,
    initializeGrid,
    drawHexagon,
    drawStar,
    getHexagonVertices,
    isPointInHexagon,
  ]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-auto block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
