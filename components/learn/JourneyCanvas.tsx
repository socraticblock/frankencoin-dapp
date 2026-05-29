import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import JourneyScene from "./JourneyScene";
import styles from "../../styles/learn.module.css";

type JourneyCanvasProps = {
	progress: number;
	simplified?: boolean;
};

export default function JourneyCanvas({ progress, simplified = false }: JourneyCanvasProps) {
	const [ready, setReady] = useState(false);
	const onReady = useCallback(() => setReady(true), []);

	return (
		<div className={styles.canvasWrap}>
			{!ready && (
				<div className={styles.canvasLoading} aria-live="polite">
					Preparing the journey…
				</div>
			)}
			<Canvas
				dpr={simplified ? [1, 1] : [1, 1.5]}
				camera={{ position: [0, 1.2, 8], fov: 42, near: 0.1, far: 40 }}
				gl={{ antialias: true, alpha: false }}
				aria-hidden
			>
				<Suspense fallback={null}>
					<JourneyScene progress={progress} onReady={onReady} simplified={simplified} />
				</Suspense>
			</Canvas>
		</div>
	);
}
