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
  shouldHover: boolean;
  shouldOscillate: boolean;
  isStatic: boolean;
  opacity: number;
  oscillationRate: number;
  oscillationDirection: number;
  hoverOpacity: number;
  hoverTarget: number;
  color: 'red' | 'green' | null;
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

    // Create all hexagons - 0.2% oscillate, 0.2% static, rest invisible
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * hexWidth + (row % 2) * (hexWidth / 2);
        const y = row * verticalSpacing;

        const shouldHover = Math.random() < staticHexChance;
        const shouldOscillate = Math.random() < 0.002; // 0.2% oscillate
        const isStatic = !shouldOscillate && Math.random() < 0.002; // 0.2% static

        let opacity = 0; // Default invisible
        if (shouldOscillate) {
          // Oscillating: start with random opacity between 0.05 and 0.4
          opacity = 0.05 + Math.random() * 0.35;
        } else if (isStatic) {
          // Static: fixed random opacity between 0.05 and 0.4
          opacity = 0.05 + Math.random() * 0.35;
        }

        hexagons.push({
          x,
          y,
          shouldHover,
          shouldOscillate,
          isStatic,
          opacity,
          // Random oscillation rate (0.001 to 0.0022 per frame) - slow rate
          oscillationRate: 0.001 + Math.random() * 0.0012,
          // Random initial direction
          oscillationDirection: Math.random() > 0.5 ? 1 : -1,
          hoverOpacity: 0,
          hoverTarget: 0,
          color: null,
        });
      }
    }

    // Add colored hexagons (1%) in pairs or threes
    const totalHexagons = hexagons.length;
    const coloredCount = Math.floor(totalHexagons * 0.01);
    const colored = new Set<number>();

    for (let i = 0; i < coloredCount; i++) {
      const idx = Math.floor(Math.random() * totalHexagons);
      if (colored.has(idx)) continue;

      // Random color (red or green)
      const color = Math.random() > 0.5 ? 'red' : 'green';
      hexagons[idx].color = color;
      // Make colored hexagons oscillate
      hexagons[idx].shouldOscillate = true;
      hexagons[idx].opacity = 0.05 + Math.random() * 0.35;
      colored.add(idx);

      // Add 1 or 2 neighbors (making pairs or threes)
      const neighborsToAdd = Math.random() > 0.5 ? 1 : 2;

      for (let j = 0; j < neighborsToAdd; j++) {
        // Try to find a nearby hexagon
        const offset = (j + 1) * (Math.random() > 0.5 ? 1 : -1);
        const neighborIdx = idx + offset;

        if (neighborIdx >= 0 && neighborIdx < totalHexagons && !colored.has(neighborIdx)) {
          hexagons[neighborIdx].color = color;
          hexagons[neighborIdx].shouldOscillate = true;
          hexagons[neighborIdx].opacity = 0.05 + Math.random() * 0.35;
          colored.add(neighborIdx);
        }
      }
    }

    hexagonsRef.current = hexagons;
  }, [hexSize, staticHexChance]);

  // Draw a hexagon with wave distortion
  const drawHexagon = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    opacity: number,
    waveTime: number,
    color: 'red' | 'green' | null = null,
  ) => {
    if (opacity <= 0.01) return;

    ctx.beginPath();
    const vertices = getHexagonVertices(cx, cy, size);

    // Apply wave offset to each vertex independently for distortion
    const waveVertices = vertices.map((vertex) => {
      const rawWave =
        (Math.sin(waveTime + vertex.x * 0.01 + vertex.y * 0.01) + 1) / 2;
      const wave = Math.pow(rawWave, 4);
      const yOffset = -(wave - 0.5) * 12;
      return { x: vertex.x, y: vertex.y + yOffset };
    });

    ctx.moveTo(waveVertices[0].x, waveVertices[0].y);
    for (let i = 1; i < waveVertices.length; i++) {
      ctx.lineTo(waveVertices[i].x, waveVertices[i].y);
    }
    ctx.closePath();

    // Use custom color if provided, otherwise use default hexagonColor
    let baseColor = hexagonColor;
    if (color === 'red') {
      baseColor = '#ef4444'; // Tailwind red-500
    } else if (color === 'green') {
      baseColor = '#22c55e'; // Tailwind green-500
    }

    ctx.fillStyle = baseColor.includes('rgb')
      ? baseColor.replace(')', `, ${opacity})`)
      : `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  }, [hexagonColor, getHexagonVertices]);

  // Draw star at vertex
  const drawStar = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    wave: number,
  ) => {
    // More noticeable brightness oscillation with wave
    const brightness = 0.06 + wave * 0.2;

    ctx.save();
    ctx.translate(x, y);

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

      // Update wave time - slower wave animation
      waveTimeRef.current += deltaTime * 0.5;

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
          hex.shouldOscillate = Math.random() < 0.002;
          hex.isStatic = !hex.shouldOscillate && Math.random() < 0.002;
          if (hex.shouldOscillate) {
            hex.opacity = 0.05 + Math.random() * 0.35;
          } else if (hex.isStatic) {
            hex.opacity = 0.05 + Math.random() * 0.35;
          } else {
            hex.opacity = 0;
          }
          hex.oscillationRate = 0.001 + Math.random() * 0.0012;
          hex.oscillationDirection = Math.random() > 0.5 ? 1 : -1;
          hex.shouldHover = Math.random() < staticHexChance;
          hex.hoverOpacity = 0;
          hex.hoverTarget = 0;
          hex.color = null; // Most hexagons don't have color when wrapping
        }
        if (screenY < -hexHeight * 3) {
          hex.y += verticalSpacing * (Math.ceil(canvasSize.height / verticalSpacing) + 4);
          // Regenerate random properties for wrapped hexagons
          hex.shouldOscillate = Math.random() < 0.002;
          hex.isStatic = !hex.shouldOscillate && Math.random() < 0.002;
          if (hex.shouldOscillate) {
            hex.opacity = 0.05 + Math.random() * 0.35;
          } else if (hex.isStatic) {
            hex.opacity = 0.05 + Math.random() * 0.35;
          } else {
            hex.opacity = 0;
          }
          hex.oscillationRate = 0.001 + Math.random() * 0.0012;
          hex.oscillationDirection = Math.random() > 0.5 ? 1 : -1;
          hex.shouldHover = Math.random() < staticHexChance;
          hex.hoverOpacity = 0;
          hex.hoverTarget = 0;
          hex.color = null;
        }
      });

      // Draw hexagons and stars with wave distortion
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

        // Draw stars at vertices with wave calculated per vertex
        const vertices = getHexagonVertices(screenX, screenY, hexSize);
        vertices.forEach((vertex, i) => {
          const rawWave =
            (Math.sin(waveTimeRef.current + vertex.x * 0.01 + vertex.y * 0.01) + 1) / 2;
          const wave = Math.pow(rawWave, 4);
          const yOffset = -(wave - 0.5) * 12;
          drawStar(ctx, vertex.x, vertex.y + yOffset, 1.5, wave);
        });

        // Update oscillating opacity (only if shouldOscillate is true)
        if (hex.shouldOscillate) {
          hex.opacity += hex.oscillationRate * hex.oscillationDirection * deltaTime * 60;

          // Reverse direction when hitting boundaries (0.05 to 0.4)
          if (hex.opacity >= 0.4) {
            hex.opacity = 0.4;
            hex.oscillationDirection = -1;
          } else if (hex.opacity <= 0.05) {
            hex.opacity = 0.05;
            hex.oscillationDirection = 1;
          }
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

        // Draw hexagon with distortion and optional color
        const finalOpacity = Math.max(hex.opacity, hex.hoverOpacity);
        drawHexagon(ctx, screenX, screenY, hexSize, finalOpacity, waveTimeRef.current, hex.color);
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
