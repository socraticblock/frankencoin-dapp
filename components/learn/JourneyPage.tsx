import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import JourneyProgress from "./JourneyProgress";
import JourneyScrollContent from "./JourneyScrollContent";
import useJourneyProgress from "./useJourneyProgress";
import usePrefersReducedMotion from "./usePrefersReducedMotion";
import styles from "../../styles/learn.module.css";

const JourneyCanvas = dynamic(() => import("./JourneyCanvas"), { ssr: false });

function useViewportMode(): "mobile" | "tablet" | "desktop" {
	const [mode, setMode] = useState<"mobile" | "tablet" | "desktop">("desktop");

	useEffect(() => {
		const update = () => {
			const width = window.innerWidth;
			if (width < 768) setMode("mobile");
			else if (width < 1024) setMode("tablet");
			else setMode("desktop");
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return mode;
}

export default function JourneyPage() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = usePrefersReducedMotion();
	const viewportMode = useViewportMode();
	const scrollEnabled = !prefersReducedMotion;
	const { progress, activeStation } = useJourneyProgress(scrollRef, scrollEnabled);

	const showCanvas = !prefersReducedMotion;
	const simplifiedCanvas = viewportMode !== "desktop";

	return (
		<div className={styles.page}>
			{showCanvas && (
				<div className={styles.canvasLayer} aria-hidden>
					<JourneyCanvas progress={progress} simplified={simplifiedCanvas} />
				</div>
			)}

			{prefersReducedMotion && (
				<div className={styles.staticBackdrop} aria-hidden>
					<div className={styles.staticMedallion} />
				</div>
			)}

			{scrollEnabled && (
				<JourneyProgress progress={progress} activeStationId={activeStation.id} />
			)}

			<div
				ref={scrollRef}
				className={prefersReducedMotion ? styles.scrollTrackStatic : styles.scrollTrack}
			>
				<JourneyScrollContent progress={progress} reducedMotion={prefersReducedMotion} />
			</div>
		</div>
	);
}
