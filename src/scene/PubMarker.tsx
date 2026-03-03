import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { SearchPub } from "../types";
import { latLonToXZ } from "../utils/projection";

interface PubMarkerProps {
  pub: SearchPub;
  isNight: boolean;
  onSelect: (pub: SearchPub) => void;
}

export function PubMarker({ pub, isNight, onSelect }: PubMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [x, z] = latLonToXZ(pub.lat, pub.lon);

  const isOpen = pub.isOpen === true;
  const isClosed = pub.isOpen === false;

  // Marker appearance based on day/night and open status
  let color = "#f59e0b"; // daytime default amber
  let emissiveIntensity = 0;
  let opacity = 1;

  if (isNight) {
    if (isOpen) {
      color = "#f59e0b";
      emissiveIntensity = 0.5;
    } else if (isClosed) {
      color = "#6b7280";
      opacity = 0.5;
      emissiveIntensity = 0;
    } else {
      // Unknown hours — dim amber
      color = "#d97706";
      emissiveIntensity = 0.2;
      opacity = 0.7;
    }
  }

  // Pulse effect for open pubs at night
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (isNight && isOpen) {
      const pulse = Math.sin(clock.elapsedTime * 2) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  // Label text
  let label = pub.name;
  if (isNight && isClosed) {
    label = `${pub.name} · Closed`;
  } else if (pub.outdoorSeating || pub.beerGarden) {
    label = `${pub.name} · ☀`;
  }

  const labelColor = isNight && isClosed ? "#9ca3af" : "#ffffff";

  return (
    <group position={[x, 0, z]}>
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

      {isNight && isOpen && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[4, 6, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
        </mesh>
      )}

      <Html
        position={[0, 22, 0]}
        center
        distanceFactor={200}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            color: labelColor,
            fontSize: "14px",
            fontWeight: 600,
            textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
