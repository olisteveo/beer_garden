export function ShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <planeGeometry args={[80000, 80000]} />
      <shadowMaterial transparent opacity={0.3} />
    </mesh>
  );
}
