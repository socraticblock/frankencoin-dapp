import { useEffect, useState } from "react";
import { getActiveStation } from "./journeyData";
import type { JourneyStation } from "./journeyData";

type JourneyProgressState = {
	progress: number;
	activeStation: JourneyStation;
};

export default function useJourneyProgress(scrollRef: React.RefObject<HTMLElement | null>, enabled: boolean): JourneyProgressState {
	const [state, setState] = useState<JourneyProgressState>(() => ({
		progress: 0,
		activeStation: getActiveStation(0),
	}));

	useEffect(() => {
		if (!enabled) return;

		const element = scrollRef.current;
		if (!element) return;

		let frame = 0;

		const update = () => {
			const rect = element.getBoundingClientRect();
			const scrollable = element.offsetHeight - window.innerHeight;
			const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
			const progress = scrollable > 0 ? scrolled / scrollable : 0;
			setState({ progress, activeStation: getActiveStation(progress) });
		};

		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};

		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [scrollRef, enabled]);

	return state;
}
