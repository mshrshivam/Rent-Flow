import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Box, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';

const MovingBox = ({ position, color, delay }: { position: [number, number, number]; color: string; delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime() + delay;
      meshRef.current.position.x = position[0] + Math.sin(t * 0.5) * 0.3;
      meshRef.current.position.y = position[1] + Math.sin(t * 0.3) * 0.2;
      meshRef.current.rotation.x = t * 0.2;
      meshRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
    </mesh>
  );
};

const House = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* House Base */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1, 1.5]} />
        <meshStandardMaterial color="#4F46E5" roughness={0.3} metalness={0.5} />
      </mesh>
      
      {/* Roof */}
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[1.5, 0.8, 4]} />
        <meshStandardMaterial color="#7C3AED" roughness={0.3} metalness={0.5} />
      </mesh>
      
      {/* Door */}
      <mesh position={[0, 0.3, 0.76]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#14B8A6" roughness={0.4} metalness={0.6} />
      </mesh>
      
      {/* Windows */}
      <mesh position={[-0.5, 0.6, 0.76]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.05]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.5, 0.6, 0.76]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.05]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

const Person = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.x = -2 + Math.sin(t * 0.5) * 0.3;
      groupRef.current.position.y = Math.abs(Math.sin(t * 2)) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[-2, -0.3, 0.5]}>
      {/* Head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.5} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
        <meshStandardMaterial color="#3B82F6" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
};

const GlowingSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime()) * 0.1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[0.5, 64, 64]} position={[2, 1, -1]}>
        <MeshDistortMaterial
          color="#4F46E5"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

const Scene = () => {
  const boxPositions = useMemo(() => [
    { pos: [-1.5, 0.2, 0.3] as [number, number, number], color: '#F59E0B', delay: 0 },
    { pos: [-1.8, 0.5, 0.1] as [number, number, number], color: '#10B981', delay: 1 },
    { pos: [-1.2, 0.3, 0.5] as [number, number, number], color: '#EC4899', delay: 2 },
  ], []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#7C3AED" />
      <pointLight position={[3, 2, 3]} intensity={0.5} color="#14B8A6" />
      
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />
      
      <House />
      <Person />
      <GlowingSphere />
      
      {boxPositions.map((box, index) => (
        <MovingBox key={index} position={box.pos} color={box.color} delay={box.delay} />
      ))}
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1E1B4B" roughness={0.8} />
      </mesh>
    </>
  );
};

const LoginScene = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default LoginScene;
