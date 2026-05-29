import { journeyStations } from "./journeyData";
import styles from "../../styles/learn.module.css";

type JourneyProgressProps = {
	progress: number;
	activeStationId: string;
};

export default function JourneyProgress({ progress, activeStationId }: JourneyProgressProps) {
	return (
		<div className={styles.progressRail} aria-hidden>
			<div className={styles.progressTrack}>
				<div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
			</div>
			<ol className={styles.progressSteps}>
				{journeyStations.map((station) => (
					<li key={station.id} className={station.id === activeStationId ? styles.progressStepActive : styles.progressStep}>
						<span>{station.step}</span>
					</li>
				))}
			</ol>
		</div>
	);
}
