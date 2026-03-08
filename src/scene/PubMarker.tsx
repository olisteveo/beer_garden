import { useRef, useState, useMemo } from "react";
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

// ── SVG icons ───────────────────────────────────────────────────────

/** Clean pint glass icon — white silhouette */
function PintGlassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Glass body */}
      <path
        d="M7 3 L6 19 C6 20.1 6.9 21 8 21 L16 21 C17.1 21 18 20.1 18 19 L17 3 Z"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(255,255,255,1)"
        strokeWidth="0.5"
      />
      {/* Beer level */}
      <path
        d="M7.4 7 L6.3 17.5 C6.3 17.5 6.5 19 8 19 L16 19 C17.5 19 17.7 17.5 17.7 17.5 L16.6 7 Z"
        fill="rgba(255,200,50,0.5)"
      />
      {/* Foam top */}
      <ellipse cx="12" cy="7" rx="4.8" ry="1.5" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

/** Parasol / outdoor seating icon — white silhouette */
function ParasolIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Parasol canopy */}
      <path
        d="M3 12 C3 7 7.5 3 12 3 C16.5 3 21 7 21 12 Z"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(255,255,255,1)"
        strokeWidth="0.5"
      />
      {/* Pole */}
      <line
        x1="12" y1="3" x2="12" y2="20"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Table */}
      <line
        x1="7" y1="17" x2="17" y2="17"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Table legs */}
      <line x1="8" y1="17" x2="7" y2="21" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      <line x1="16" y1="17" x2="17" y2="21" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
    </svg>
  );
}

// ── Garden highlight shader ─────────────────────────────────────────

const gardenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gardenFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPulse;
  varying vec2 vUv;
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float alpha = smoothstep(0.5, 0.1, dist) * uOpacity * (0.85 + 0.15 * uPulse);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * Glowing garden zone — a bright teal/green radial disc on the ground
 * around pubs with outdoor seating or beer gardens.
 */
function GardenHighlight({ isNight }: { isNight: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const gardenRadius = 35;

  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(gardenRadius, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(isNight ? "#34d399" : "#2dd4bf") },
      uOpacity: { value: isNight ? 0.4 : 0.35 },
      uPulse: { value: 1.0 },
    }),
    [isNight],
  );

  useFrame(({ clock }) => {
    const pulse = matRef.current?.uniforms?.uPulse;
    if (!pulse) return;
    pulse.value = Math.sin(clock.elapsedTime * 1.2) * 0.5 + 0.5;
  });

  return (
    <group>
      {/* Radial gradient disc */}
      <mesh geometry={geo} position={[0, 0.25, 0]}>
        <shaderMaterial
          ref={matRef}
          vertexShader={gardenVertexShader}
          fragmentShader={gardenFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Crisp edge ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
        <ringGeometry args={[gardenRadius - 2, gardenRadius + 0.5, 48]} />
        <meshBasicMaterial
          color={isNight ? "#6ee7b7" : "#5eead4"}
          transparent
          opacity={isNight ? 0.3 : 0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Inner bright core */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.23, 0]}>
        <circleGeometry args={[gardenRadius * 0.4, 32]} />
        <meshBasicMaterial
          color={isNight ? "#34d399" : "#2dd4bf"}
          transparent
          opacity={isNight ? 0.2 : 0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Waze-inspired pub marker with clean SVG icons.
 * Outdoor pubs get a teal ground highlight and parasol icon.
 */
export function PubMarker({ pub, isNight, onSelect }: PubMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [x, z] = latLonToXZ(pub.lat, pub.lon);

  const isOpen = pub.isOpen === true;
  const isClosed = pub.isOpen === false;
  const hasOutdoor = pub.outdoorSeating || pub.beerGarden;

  // Pin colours
  let pinBg = "#f59e0b";
  let pinBorder = "#d97706";
  let dimmed = false;

  if (isNight) {
    if (isOpen) {
      pinBg = "#f59e0b";
      pinBorder = "#fbbf24";
    } else if (isClosed) {
      pinBg = "#6b7280";
      pinBorder = "#4b5563";
      dimmed = true;
    } else {
      pinBg = "#d97706";
      pinBorder = "#b45309";
    }
  }

  if (hovered) {
    pinBg = "#fbbf24";
    pinBorder = "#f59e0b";
  }

  // Outdoor pubs: teal pin
  if (hasOutdoor && !dimmed) {
    pinBg = "#14b8a6";
    pinBorder = "#0d9488";
    if (hovered) {
      pinBg = "#2dd4bf";
      pinBorder = "#14b8a6";
    }
  }

  // Status / feature badge
  let badge = "";
  let badgeBg = "";
  if (hasOutdoor) {
    badge = pub.beerGarden ? "Beer Garden" : "Outdoor";
    badgeBg = "rgba(20,184,166,0.9)";
  } else if (isNight && isClosed) {
    badge = "Closed";
    badgeBg = "rgba(107,114,128,0.85)";
  } else if (isNight && isOpen) {
    badge = "Open";
    badgeBg = "rgba(34,197,94,0.85)";
  }

  return (
    <group position={[x, 0, z]}>
      {/* Garden ground highlight */}
      {hasOutdoor && <GardenHighlight isNight={isNight} />}

      {/* Billboard pin — fixed screen size, always faces camera */}
      <Html
        position={[0, 0, 0]}
        center
        style={{ pointerEvents: "auto" }}
        zIndexRange={[5, 0]}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(pub);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            opacity: dimmed ? 0.5 : 1,
            transform: hovered ? "scale(1.18)" : "scale(1)",
            transition: "transform 0.15s ease, opacity 0.2s ease",
            filter: hovered
              ? `drop-shadow(0 4px 16px ${hasOutdoor ? "rgba(20,184,166,0.6)" : "rgba(245,158,11,0.6)"})`
              : "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
          }}
        >
          {/* Pin head */}
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px 16px 16px 4px",
              background: pinBg,
              border: `3px solid ${pinBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                isNight && isOpen
                  ? `0 0 14px ${pinBg}, 0 0 28px ${pinBg}40`
                  : "none",
            }}
          >
            {hasOutdoor ? <ParasolIcon /> : <PintGlassIcon />}
          </div>

          {/* Pin tail */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: `12px solid ${pinBorder}`,
              marginTop: "-1px",
            }}
          />

          {/* Name label */}
          <div
            style={{
              marginTop: "3px",
              padding: "3px 8px",
              borderRadius: "6px",
              background: "rgba(0,0,0,0.7)",
              color: dimmed ? "#9ca3af" : "#fff",
              fontSize: "13px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              maxWidth: "160px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              lineHeight: "1.3",
            }}
          >
            {pub.name}
          </div>

          {/* Badge */}
          {badge && (
            <div
              style={{
                marginTop: "2px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: badgeBg,
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {badge}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
