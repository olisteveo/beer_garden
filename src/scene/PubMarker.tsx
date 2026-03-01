import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { Pub, PubOpenStatus } from "../types";
import { latLonToXZ } from "../utils/projection";

interface PubMarkerProps {
  pub: Pub;
  status: PubOpenStatus;
  isNight: boolean;
  onSelect: (pub: Pub) => void;
}

export function PubMarker({ pub, status, isNight, onSelect }: PubMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [x, z] = latLonToXZ(pub.lat, pub.lon);

  // Marker appearance based on day/night and open status
  let color = "#f59e0b"; // daytime default amber
  let emissiveIntensity = 0;
  let opacity = 1;

  if (isNight) {
    if (status.isOpen) {
      color = "#f59e0b";
      emissiveIntensity = status.closingSoon ? 0.3 : 0.5;
    } else {
      color = "#6b7280";
      opacity = 0.5;
      emissiveIntensity = 0;
    }
  }

  // Pulse effect for open pubs at night
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (isNight && status.isOpen) {
      const pulse = Math.sin(clock.elapsedTime * 2) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  // Label text
  let label = pub.name;
  if (isNight && status.closingSoon && status.closingTime) {
    label = `${pub.name} · Closes ${status.closingTime}`;
  } else if (isNight && !status.isOpen) {
    label = `${pub.name} · Closed`;
  }

  return (
    <group position={[x, 0, z]}>
      {/* Marker cylinder */}
      <mesh
        ref={meshRef}
        position={[0, 8, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pub);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[3, 3, 16, 8]} />
        <meshStandardMaterial
          color={hovered ? "#fbbf24" : color}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
        />
      </mesh>

      {/* Glow ring at base */}
      {isNight && status.isOpen && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[4, 6, 16]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Floating label */}
      <Billboard position={[0, 22, 0]}>
        <Text
          fontSize={4}
          color={isNight && !status.isOpen ? "#9ca3af" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.3}
          outlineColor="#000000"
          maxWidth={80}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
