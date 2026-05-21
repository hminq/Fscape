import { Component, Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center } from "@react-three/drei";
import { Cube, ArrowsOutCardinal as ArrowsMove, CircleNotch } from "@phosphor-icons/react";

/* ── Internal: loads GLB/GLTF via useGLTF ── */
function Model({ url }) {
    const { scene } = useGLTF(url);
    return (
        <Center>
            <primitive object={scene} />
        </Center>
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

/**
 * Reusable 3D model viewer component.
 *
 * Props:
 *  - url (string, required) - URL to .glb / .gltf file
 *  - height (string) - Tailwind height class, default "h-80"
 *  - className (string) - extra classes on the wrapper
 */
export default function ModelViewer({ url, height = "h-80", className = "" }) {
    const [failedUrl, setFailedUrl] = useState(null);
    const [viewerState, setViewerState] = useState({ url: null, status: "idle" });
    const loadError = failedUrl === url || (viewerState.url === url && viewerState.status === "error");

    useEffect(() => {
        if (!url) {
            return undefined;
        }

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

    if (!url) return null;

    if (loadError) {
        return (
            <div className={`w-full ${height} rounded-xl border border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}>
                <Cube className="size-8" />
                <p className="text-sm">Không thể tải mô hình 3D</p>
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Tải file về</a>
            </div>
        );
    }

    if (viewerState.url !== url || viewerState.status === "checking") {
        return (
            <div className={`w-full ${height} rounded-xl border border-border bg-muted/50 flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}>
                <CircleNotch className="size-6 animate-spin" />
                <p className="text-sm">Đang tải mô hình 3D</p>
            </div>
        );
    }

    return (
        <div className={`w-full ${height} rounded-xl border border-border bg-muted/50 overflow-hidden relative ${className}`}>
            <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }} onError={() => setFailedUrl(url)}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Suspense fallback={null}>
                    <ModelErrorBoundary resetKey={url} onError={() => setFailedUrl(url)}>
                        <Model url={url} />
                        <Environment preset="city" />
                    </ModelErrorBoundary>
                </Suspense>
                <OrbitControls
                    enablePan
                    enableZoom
                />
            </Canvas>
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 border border-border">
                <ArrowsMove className="size-3" /> Kéo để xoay · Cuộn để zoom
            </div>
        </div>
    );
}
