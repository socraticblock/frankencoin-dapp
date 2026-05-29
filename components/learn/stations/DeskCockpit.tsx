import { LabelPlate, StationPlatform } from "./shared";
import { BRASS, IVORY, SLATE } from "../journeyPalette";

const DESK_MODULES = [
	{ label: "Borrow", x: -0.42, z: -0.22 },
	{ label: "Earn", x: 0, z: -0.22 },
	{ label: "Exchange", x: 0.42, z: -0.22 },
	{ label: "Bridge", x: -0.42, z: 0.08 },
	{ label: "Transfer", x: 0, z: 0.08 },
	{ label: "Invest", x: 0.42, z: 0.08 },
	{ label: "Portfolio", x: -0.21, z: 0.38 },
	{ label: "Monitoring", x: 0.21, z: 0.38 },
];

/** Command center overview — Frankencoin Desk product modules */
export default function DeskCockpit({ active, simplified }: { active: number; simplified: boolean }) {
	return (
		<group>
			<StationPlatform active={active} wide />

			{/* Cockpit console base */}
			<mesh castShadow position={[0, 0.12, 0.08]}>
				<boxGeometry args={[1.15, 0.08, 0.88]} />
				<meshStandardMaterial color={SLATE} roughness={0.74} metalness={0.2} />
			</mesh>

			{/* Overview ring — zoomed-out system view */}
			<mesh position={[0, 0.22, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.62 + active * 0.05, 0.012, 12, 80]} />
				<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.72} />
			</mesh>

			{/* Module tiles */}
			{DESK_MODULES.map((mod) => (
				<group key={mod.label} position={[mod.x, 0.22, mod.z]}>
					<mesh castShadow>
						<boxGeometry args={[0.28, 0.06, 0.2]} />
						<meshStandardMaterial
							color={IVORY}
							roughness={0.86}
							emissive={BRASS}
							emissiveIntensity={active > 0.3 ? 0.04 : 0}
						/>
					</mesh>
					{!simplified && (
						<LabelPlate position={[0, 0.14, 0]} label={mod.label} width={0.3} subdued />
					)}
				</group>
			))}

			{/* Central ZCHF hub */}
			<mesh position={[0, 0.28, 0.08]}>
				<cylinderGeometry args={[0.12, 0.12, 0.04, 32]} />
				<meshStandardMaterial color={BRASS} roughness={0.36} metalness={0.78} />
			</mesh>

			{!simplified && <LabelPlate position={[0, 0.62, 0.08]} label="Frankencoin Desk" width={0.85} />}
		</group>
	);
}
