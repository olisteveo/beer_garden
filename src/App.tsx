import { ErrorBoundary } from "./components/ErrorBoundary";
import { WebGLFallback } from "./components/WebGLFallback";

export default function App() {
  const webglSupported =
    typeof window !== "undefined" &&
    (!!window.WebGLRenderingContext || !!window.WebGL2RenderingContext);

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <ErrorBoundary fallback={<WebGLFallback />}>
      <div className="relative h-full w-full">
        <div className="flex h-full items-center justify-center">
          <p className="text-lg text-slate-400">Beer Garden — Loading...</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}
