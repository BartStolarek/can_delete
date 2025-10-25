'use client';

import { HexagonGrid } from './components/HexagonGrid';

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <HexagonGrid
        hexSize={30}
        staticHexChance={0.01}
        panSpeed={0.15}
        backgroundColor="#0f0a1a"
        hexagonColor="#3b82f6"
        starColor="rgba(100, 116, 139, 0.3)"
        hoverDelay={0.3}
      />
    </main>
  );
}
