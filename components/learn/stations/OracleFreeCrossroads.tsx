import { FlowChannel, LabelPlate, StationPlatform } from "./shared";
import { AMBER, BRASS, FADED, MUTED_BLUE } from "../journeyPalette";

/** Faded oracle path vs illuminated market-challenge path */
export default function OracleFreeCrossroads({ active, simplified }: { active: number; simplified: boolean }) {
	const oracleOpacity = 0.22 + (1 - active) * 0.28;
	const challengeGlow = 0.45 + active * 0.55;

	return (
		<group>
			<StationPlatform active={active} wide />

			{/* Crossroads base */}
			<mesh position={[0, 0.04, 0]}>
				<boxGeometry args={[1.4, 0.04, 0.9]} />
				<meshStandardMaterial color="#e8e0d3" roughness={0.92} />
			</mesh>

			{/* Left path — oracle tower (faded, rejected design) */}
			<group position={[-0.48, 0, -0.12]}>
				<mesh castShadow position={[0, 0.32, 0]}>
					<cylinderGeometry args={[0.12, 0.2, 0.64, 24]} />
					<meshStandardMaterial color={FADED} roughness={0.88} transparent opacity={oracleOpacity} />
				</mesh>
				<mesh position={[0, 0.68, 0]} rotation={[0, 0, Math.PI / 4]}>
					<boxGeometry args={[0.06, 0.48, 0.02]} />
					<meshStandardMaterial color={AMBER} transparent opacity={oracleOpacity * 0.7} />
				</mesh>
				<mesh position={[0, 0.68, 0]} rotation={[0, 0, -Math.PI / 4]}>
					<boxGeometry args={[0.06, 0.48, 0.02]} />
					<meshStandardMaterial color={AMBER} transparent opacity={oracleOpacity * 0.7} />
				</mesh>
				<FlowChannel from={[0.48, 0.06, 0.12]} to={[0, 0.06, 0.12]} color={FADED} opacity={oracleOpacity * 0.6} width={0.03} />
			</group>

			{/* Right path — market challenge rail (illuminated) */}
			<group position={[0.48, 0, 0.12]}>
				<mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<torusGeometry args={[0.28, 0.016, 12, 64]} />
					<meshStandardMaterial color={BRASS} roughness={0.32} metalness={0.78} emissive={BRASS} emissiveIntensity={challengeGlow * 0.15} />
				</mesh>
				<mesh position={[0, 0.12, 0]}>
					<boxGeometry args={[0.52, 0.04, 0.04]} />
					<meshStandardMaterial color={MUTED_BLUE} roughness={0.4} metalness={0.45} emissive={MUTED_BLUE} emissiveIntensity={challengeGlow * 0.08} />
				</mesh>
				<FlowChannel from={[-0.48, 0.06, -0.12]} to={[0, 0.06, -0.12]} color={BRASS} opacity={challengeGlow} />
			</group>

			{/* Center fork marker */}
			<mesh position={[0, 0.14, 0]}>
				<cylinderGeometry args={[0.04, 0.04, 0.18, 16]} />
				<meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.7} />
			</mesh>

			{!simplified && (
				<>
					<LabelPlate position={[-0.48, 0.52, -0.12]} label="oracle price feed" width={0.72} subdued />
					<LabelPlate position={[0.48, 0.42, 0.12]} label="market challenge" width={0.72} />
					<LabelPlate position={[0, 0.58, 0.35]} label="Frankencoin design choice" width={0.95} />
				</>
			)}
		</group>
	);
}
