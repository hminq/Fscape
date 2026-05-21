import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useLoader } from "@react-three/fiber";
import { CircleNotch as Loader2, Cube } from "@phosphor-icons/react";

function GltfModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function ObjModel({ url }) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} />;
}

function ModelScene({ url }) {
  const isObj = useMemo(() => /\.obj(\?|$)/i.test(url), [url]);

  return (
    <Stage adjustCamera intensity={0.5} environment="city">
      {isObj ? <ObjModel url={url} /> : <GltfModel url={url} />}
    </Stage>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function ModelViewer({ url, className = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const [viewerState, setViewerState] = useState({ url: null, status: "idle" });
  const loadError = failedUrl === url || (viewerState.url === url && viewerState.status === "error");

  useEffect(() => {
    if (!url) return undefined;

    let ignore = false;
    const controller = new AbortController();

    const checkModelUrl = async () => {
      setViewerState({ url, status: "checking" });

      const attempt = async (method) => {
        const response = await fetch(url, {
          method,
          mode: "cors",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Không thể tải mô hình 3D (${response.status})`);
        }
      };

      try {
        try {
          await attempt("HEAD");
        } catch {
          await attempt("GET");
        }

        if (!ignore) {
          setViewerState({ url, status: "ready" });
        }
      } catch {
        if (!ignore && !controller.signal.aborted) {
          setFailedUrl(url);
          setViewerState({ url, status: "error" });
        }
      }
    };

    checkModelUrl();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [url]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-primary/5 text-secondary ${className}`}>
        Chưa có mô hình 3D cho phòng này.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-primary/5 px-6 text-secondary ${className}`}>
        <Cube className="h-8 w-8 text-olive" />
        <p className="text-sm font-medium">Không thể tải mô hình 3D</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-primary underline"
        >
          Tải file về
        </a>
      </div>
    );
  }

  if (viewerState.url !== url || viewerState.status === "checking") {
    return (
      <div className={`relative flex items-center justify-center bg-primary/5 ${className}`}>
        <LoadingFallback />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas camera={{ fov: 50 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <ModelErrorBoundary resetKey={url} onError={() => setFailedUrl(url)}>
            <ModelScene url={url} />
          </ModelErrorBoundary>
          <OrbitControls enablePan enableZoom enableRotate />
        </Suspense>
      </Canvas>
    </div>
  );
}
