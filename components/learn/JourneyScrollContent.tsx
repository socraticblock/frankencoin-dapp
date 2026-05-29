import Link from "next/link";
import { getStationOpacity, journeyStations } from "./journeyData";
import styles from "../../styles/learn.module.css";

type JourneyScrollContentProps = {
	progress: number;
	reducedMotion: boolean;
};

export default function JourneyScrollContent({ progress, reducedMotion }: JourneyScrollContentProps) {
	return (
		<>
			<header className={styles.hero}>
				<p className={styles.heroEyebrow}>The Journey of ZCHF</p>
				<h1 className={styles.heroTitle}>How ZCHF Works</h1>
				<p className={styles.heroSubtitle}>
					Follow the journey of one ZCHF — from research, to collateral, to savings, to repayment, to system protection.
				</p>
			</header>

			{journeyStations.map((station) => {
				const opacity = reducedMotion ? 1 : getStationOpacity(progress, station);
				const isActive = progress >= station.start && progress < station.end;

				return (
					<section
						key={station.id}
						className={styles.storyPanel}
						data-station={station.id}
						data-active={isActive || reducedMotion ? "true" : "false"}
						style={reducedMotion ? undefined : { opacity }}
						aria-hidden={!reducedMotion && opacity < 0.15}
					>
						<div className={styles.panelCard}>
							<p className={styles.eyebrow}>{station.eyebrow}</p>
							<h2>{station.headline}</h2>
							{station.body.map((paragraph) => (
								<p key={paragraph.slice(0, 32)}>{paragraph}</p>
							))}

							{station.exampleCard && (
								<dl className={styles.exampleCard}>
									{station.exampleCard.map((row) => (
										<div key={row.label} className={styles.exampleRow}>
											<dt>{row.label}</dt>
											<dd>{row.value}</dd>
										</div>
									))}
								</dl>
							)}

							{station.caution && <p className={styles.caution}>{station.caution}</p>}

							{station.learnMore && (
								<a href={station.learnMore.href} target="_blank" rel="noreferrer" className={styles.learnMore}>
									{station.learnMore.label}
								</a>
							)}

							{station.id === "responsibility" && (
								<div className={styles.ctaRow}>
									<Link href="/desk" className={styles.ctaPrimary}>
										Enter Frankencoin Desk
									</Link>
									<a href="https://docs.frankencoin.com" target="_blank" rel="noreferrer" className={styles.ctaSecondary}>
										Read the full mechanics
									</a>
								</div>
							)}
						</div>
					</section>
				);
			})}

			<footer className={styles.disclaimer}>
				<p>This page explains protocol mechanics. It is not financial, legal, tax, or investment advice.</p>
			</footer>
		</>
	);
}
