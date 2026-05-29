import { useRef } from "react";
import { Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { LabelPlate, PositionBlock, StationPlatform } from "./shared";
import { AMBER, BRASS, SLATE } from "../journeyPalette";

/** Position at center, challenger approaches, auction ring, countdown, defense options */
export default function ChallengeAmphitheater({ active, simplified }: { active: number; simplified: boolean }) {
	const countdownRef = useRef<Mesh>(null);
	const challengerAngle = 0.8 - active * 0.5;

	useFrame((_, delta) => {
		if (!countdownRef.current) return;
		countdownRef.current.rotation.z -= delta * (0.15 + active * 0.35);
	});

	return (
		<group>
			<StationPlatform active={active} wide />

			{/* Amphitheater floor ring */}
			<mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.72, 0.025, 12, 96]} />
				<meshStandardMaterial color="#e8e0d3" roughness={0.9} />
			</mesh>

			{/* Position under test — amber when active */}
			<PositionBlock position={[0, 0.24, 0]} highlighted={active > 0.3} />

			{/* Auction ring */}
			<mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.58, 0.014 + active * 0.01, 12, 96]} />
				<meshStandardMaterial color={active > 0.35 ? AMBER : BRASS} roughness={0.36} metalness={0.66} />
			</mesh>

			{/* Countdown ring — calm partial arc */}
			<mesh ref={countdownRef} position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, active * Math.PI * 0.5]}>
				<torusGeometry args={[0.42, 0.01, 8, 48, Math.PI * 1.35]} />
				<meshStandardMaterial color={SLATE} roughness={0.55} metalness={0.25} />
			</mesh>

			{/* Challenger marker approaching */}
			<group position={[Math.cos(challengerAngle) * 0.62, 0.16, Math.sin(challengerAngle) * 0.62]}>
				<mesh castShadow>
					<coneGeometry args={[0.08, 0.16, 4]} />
					<meshStandardMaterial color={SLATE} roughness={0.6} metalness={0.3} />
				</mesh>
			</group>

			{/* Defense option markers */}
			{!simplified && (
				<>
					<LabelPlate position={[Math.cos(challengerAngle) * 0.62, 0.32, Math.sin(challengerAngle) * 0.62]} label="challenger" width={0.52} subdued />
					<LabelPlate position={[-0.55, 0.22, 0.35]} label="add collateral" width={0.62} subdued />
					<LabelPlate position={[0.55, 0.22, 0.35]} label="repay ZCHF" width={0.55} subdued />
					<LabelPlate position={[0, 0.22, -0.55]} label="review auction" width={0.62} subdued />
					<LabelPlate position={[0, 0.58, 0]} label="Market test — not an FPS vote" width={1.05} subdued />
				</>
			)}
		</group>
	);
}
