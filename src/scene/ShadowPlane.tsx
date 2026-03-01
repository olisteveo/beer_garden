export function ShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[3000, 3000]} />
      <shadowMaterial transparent opacity={0.3} />
    </mesh>
  );
}
