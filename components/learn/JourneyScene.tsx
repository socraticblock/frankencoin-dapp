import { useEffect } from "react";
import { Color } from "three";
import { journeyStations } from "./journeyData";
import JourneyCameraRig, { RouteRail, WorldShell } from "./JourneyCameraRig";
import JourneyStation from "./JourneyStation";
import { TravelingZCHF } from "./TravelingZCHF";

type JourneySceneProps = {
	progress: number;
	onReady?: () => void;
	simplified?: boolean;
};

export default function JourneyScene({ progress, onReady, simplified = false }: JourneySceneProps) {
	useEffect(() => {
		onReady?.();
	}, [onReady]);

	return (
		<>
			<color attach="background" args={[new Color("#f7f2e9")]} />
			<fog attach="fog" args={["#f7f2e9", simplified ? 9 : 11, simplified ? 18 : 23]} />

			<JourneyCameraRig progress={progress} simplified={simplified} />

			<ambientLight intensity={0.72} />
			<hemisphereLight args={["#fffaf1", "#cfc7ba", 0.85]} />
			<directionalLight position={[-5, 7, 5]} intensity={1.55} castShadow={!simplified} shadow-mapSize={[1024, 1024]} />
			<directionalLight position={[4, 3, -5]} intensity={0.34} color="#dbeaf3" />

			<WorldShell simplified={simplified} />
			<RouteRail simplified={simplified} />

			{journeyStations.map((station) => (
				<JourneyStation key={station.id} stationId={station.id} progress={progress} simplified={simplified} />
			))}

			<TravelingZCHF progress={progress} />
		</>
	);
}
