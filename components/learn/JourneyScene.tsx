import { useEffect } from "react";
import { Color } from "three";
import JourneyMedallion from "./JourneyMedallion";

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
			<color attach="background" args={[new Color("#f4efe6")]} />
			<fog attach="fog" args={["#f4efe6", 8, 18]} />

			<ambientLight intensity={0.55} />
			<directionalLight position={[4, 6, 5]} intensity={1.1} castShadow={!simplified} shadow-mapSize={[1024, 1024]} />
			<directionalLight position={[-3, 2, -2]} intensity={0.35} color="#fff5e6" />

			{/* Ground plane — matte stone surface */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
				<planeGeometry args={[24, 24]} />
				<meshStandardMaterial color="#ece6dc" roughness={0.92} metalness={0.05} />
			</mesh>

			<JourneyMedallion progress={progress} />

			{!simplified && (
				<>
					{/* Thesis slab placeholder */}
					<mesh position={[-2.2, 0.05, -1.2]} rotation={[0, 0.3, 0]} castShadow>
						<boxGeometry args={[1.4, 0.08, 1.8]} />
						<meshStandardMaterial color="#fbf7ef" roughness={0.88} metalness={0.02} />
					</mesh>

					{/* Thin rail line */}
					<mesh position={[0, 0.01, 0]}>
						<boxGeometry args={[6, 0.01, 0.02]} />
						<meshStandardMaterial color="#b08a4a" metalness={0.6} roughness={0.4} />
					</mesh>
				</>
			)}
		</>
	);
}
