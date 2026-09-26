import { createFileRoute } from '@tanstack/react-router';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function FloatingBurger() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} scale={2}>
      <cylinderGeometry args={[1, 1, 0.4, 32]} />
      <meshStandardMaterial color="#D97736" />
      {/* A basic placeholder geometry for a 3D burger since we don't have a GLTF yet */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.9, 1, 0.2, 32]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D97736" />
      </mesh>
    </mesh>
  );
}

function IndexPage() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
      
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <spotLight position={[-10, 10, -10]} intensity={1} color="#DC2626" />
          <FloatingBurger />
        </Canvas>
      </div>

      {/* Hero Content */}
      <section className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20 mb-32">
        <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 tracking-tighter mb-6 drop-shadow-2xl">
          TASTE THE FUTURE
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 font-medium mb-10 max-w-2xl mx-auto">
          Experience our interactive 3D menu and lightning-fast delivery. Claim your PKR 10,000 welcome bonus today!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/menu" className="bg-red-600 hover:bg-red-500 text-white text-lg font-bold py-4 px-8 rounded-full shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95">
            Order Now
          </a>
          <a href="#wallet" className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-lg font-bold py-4 px-8 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95">
            Claim Bonus
          </a>
        </div>
      </section>

    </div>
  );
}
