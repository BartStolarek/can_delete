'use client';

import { HexagonGrid } from './components/HexagonGrid';

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <HexagonGrid
        hexSize={30}
        flickerChance={0.05}
        flickerSpeed={0.02}
        panSpeed={0.15}
        backgroundColor="#0f0a1a"
        hexagonColor="#3b82f6"
        starColor="rgba(100, 116, 139, 0.3)"
        hoverDelay={0.3}
      />

      <div className="absolute top-8 left-8 text-white z-10 bg-black/50 p-6 rounded-lg backdrop-blur-sm max-w-md">
        <h1 className="text-3xl font-bold mb-2">Hexagon Grid Animation</h1>
        <p className="text-sm text-gray-300 mb-4">
          Move your mouse to interact with the hover-responsive hexagons
        </p>
        <div className="text-xs space-y-2 text-gray-400">
          <p>• ~10% of hexagons are active (flickering or hover-responsive)</p>
          <p>• Stars pulse with wave animations at vertices</p>
          <p>• Grid slowly pans diagonally</p>
          <p>• Mouse creates trailing light effect</p>
        </div>
      </div>
    </main>
  );
}
