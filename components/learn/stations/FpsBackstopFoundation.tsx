import { FlowChannel, LabelPlate, StationPlatform } from "./shared";
import { AMBER, BRASS, IVORY, SLATE } from "../journeyPalette";

/** FPS foundation under system; profit/loss flow; veto on new proposal gate only */
export default function FpsBackstopFoundation({ active, simplified }: { active: number; simplified: boolean }) {
	return (
		<group>
			<StationPlatform active={active} wide />

			{/* FPS equity foundation layer */}
			<mesh castShadow position={[0, 0.1, 0]}>
				<boxGeometry args={[1.1, 0.2, 0.82]} />
				<meshStandardMaterial color={SLATE} roughness={0.7} metalness={0.22} />
			</mesh>
			<mesh position={[0, 0.1, 0]}>
				<boxGeometry args={[0.95, 0.04, 0.68]} />
				<meshStandardMaterial color={BRASS} roughness={0.38} metalness={0.76} transparent opacity={0.85} />
			</mesh>

			{/* System layer resting on FPS */}
			<mesh castShadow position={[0, 0.34, 0]}>
				<boxGeometry args={[0.82, 0.18, 0.58]} />
				<meshStandardMaterial color={IVORY} roughness={0.86} metalness={0.04} />
			</mesh>

			{/* FPS token on foundation */}
			<mesh castShadow position={[0, 0.22, 0]}>
				<cylinderGeometry args={[0.22, 0.22, 0.08, 48]} />
				<meshStandardMaterial color={BRASS} roughness={0.36} metalness={0.78} />
			</mesh>

			{/* Profit arrow — fees & liquidation gains */}
			<group position={[-0.42, 0.48, 0]}>
				<mesh>
					<boxGeometry args={[0.04, 0.22 + active * 0.08, 0.04]} />
					<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.65} />
				</mesh>
				<mesh position={[0, 0.14 + active * 0.04, 0]}>
					<coneGeometry args={[0.06, 0.1, 4]} />
					<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.65} />
				</mesh>
			</group>

			{/* Loss arrow — system absorbs losses */}
			<group position={[0.42, 0.38, 0]}>
				<mesh>
					<boxGeometry args={[0.04, 0.18, 0.04]} />
					<meshStandardMaterial color={AMBER} roughness={0.5} metalness={0.3} transparent opacity={0.75} />
				</mesh>
				<mesh position={[0, -0.12, 0]} rotation={[Math.PI, 0, 0]}>
					<coneGeometry args={[0.06, 0.1, 4]} />
					<meshStandardMaterial color={AMBER} roughness={0.5} metalness={0.3} transparent opacity={0.75} />
				</mesh>
			</group>

			{/* New proposal gate — veto applies here, NOT at active positions */}
			<group position={[0.38, 0.34, -0.38]}>
				<mesh>
					<boxGeometry args={[0.28, 0.32, 0.06]} />
					<meshStandardMaterial color={IVORY} roughness={0.88} />
				</mesh>
				<mesh position={[0, 0.18, 0]}>
					<boxGeometry args={[0.18, 0.04, 0.08]} />
					<meshStandardMaterial color={SLATE} roughness={0.7} transparent opacity={0.4} />
				</mesh>
				{/* Veto seal */}
				<mesh position={[0, 0.22, 0.05]} rotation={[0, 0, 0]}>
					<torusGeometry args={[0.1, 0.012, 12, 48]} />
					<meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.75} emissive={BRASS} emissiveIntensity={active * 0.12} />
				</mesh>
			</group>

			{!simplified && (
				<>
					<LabelPlate position={[0, 0.58, 0]} label="FPS backstop capital" width={0.82} />
					<LabelPlate position={[-0.42, 0.62, 0.15]} label="profit" width={0.38} subdued />
					<LabelPlate position={[0.42, 0.52, 0.15]} label="loss" width={0.38} subdued />
					<LabelPlate position={[0.38, 0.58, -0.38]} label="veto → new proposals" width={0.78} />
				</>
			)}
		</group>
	);
}
