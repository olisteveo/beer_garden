export function WebGLFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-xl font-semibold text-white">
          3D Not Supported
        </h2>
        <p className="text-sm text-slate-400">
          Your device or browser doesn&apos;t support WebGL, which is required
          for the 3D map. Try using a modern browser like Chrome, Safari, or
          Firefox.
        </p>
      </div>
    </div>
  );
}
