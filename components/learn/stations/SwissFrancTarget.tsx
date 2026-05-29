import { useRef } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { StationPlatform, LabelPlate } from "./shared";
import { AMBER, BRASS, IVORY, MUTED, SLATE } from "../journeyPalette";

/** ZCHF forming inside a precision balance ring — CHF target vs market price */
export default function SwissFrancTarget({ active, simplified }: { active: number; simplified: boolean }) {
	const medallionRef = useRef<Group>(null);
	const marketOffset = 0.06 + (1 - active) * 0.04;

	useFrame((_, delta) => {
		if (!medallionRef.current) return;
		const targetScale = 0.55 + active * 0.45;
		medallionRef.current.scale.x += (targetScale - medallionRef.current.scale.x) * delta * 3;
		medallionRef.current.scale.y += (targetScale - medallionRef.current.scale.y) * delta * 3;
		medallionRef.current.scale.z += (targetScale - medallionRef.current.scale.z) * delta * 3;
	});

	return (
		<group>
			<StationPlatform active={active} />

			{/* Precision balance ring */}
			<mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.52, 0.018, 16, 96]} />
				<meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.75} />
			</mesh>
			<mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.38, 0.008, 12, 64]} />
				<meshStandardMaterial color={SLATE} roughness={0.55} metalness={0.3} />
			</mesh>

			{/* Crosshair — institutional precision instrument */}
			<mesh position={[0, 0.22, 0]}>
				<boxGeometry args={[0.72, 0.006, 0.006]} />
				<meshStandardMaterial color={MUTED} roughness={0.7} transparent opacity={0.5} />
			</mesh>
			<mesh position={[0, 0.22, 0]}>
				<boxGeometry args={[0.006, 0.006, 0.72]} />
				<meshStandardMaterial color={MUTED} roughness={0.7} transparent opacity={0.5} />
			</mesh>

			{/* CHF target reference line */}
			<mesh position={[0, 0.34, 0]}>
				<boxGeometry args={[0.55, 0.004, 0.004]} />
				<meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.6} />
			</mesh>

			{/* Market price marker — slightly offset, teaches soft peg */}
			<mesh position={[marketOffset, 0.28, 0.08]}>
				<sphereGeometry args={[0.035, 16, 16]} />
				<meshStandardMaterial color={AMBER} roughness={0.5} metalness={0.2} />
			</mesh>

			{/* ZCHF forming inside ring */}
			<group ref={medallionRef} position={[0, 0.22, 0]}>
				<mesh castShadow>
					<cylinderGeometry args={[0.32, 0.32, 0.1, 48]} />
					<meshStandardMaterial color={BRASS} roughness={0.36} metalness={0.78} transparent opacity={0.65 + active * 0.35} />
				</mesh>
				<mesh position={[0, 0.055, 0]}>
					<cylinderGeometry args={[0.24, 0.24, 0.02, 48]} />
					<meshStandardMaterial color={IVORY} roughness={0.86} />
				</mesh>
			</group>

			{!simplified && (
				<>
					<LabelPlate position={[-0.42, 0.42, 0.15]} label="CHF target" width={0.55} />
					<LabelPlate position={[0.42, 0.36, 0.15]} label="market price" width={0.62} subdued />
					<LabelPlate position={[0, 0.58, -0.2]} label="Soft peg — not a guarantee" width={0.9} subdued />
				</>
			)}
		</group>
	);
}
