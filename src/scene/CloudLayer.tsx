interface CloudLayerProps {
  cloudCover: number; // 0-100
}

export function CloudLayer({ cloudCover }: CloudLayerProps) {
  if (cloudCover < 5) return null;

  const opacity = (cloudCover / 100) * 0.5;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 300, 0]}>
      <planeGeometry args={[4000, 4000]} />
      <meshBasicMaterial
        color="#b0b8c0"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
