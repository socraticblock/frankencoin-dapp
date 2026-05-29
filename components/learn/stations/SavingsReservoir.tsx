import { FlowChannel, LabelPlate, MiniZCHF, StationPlatform } from "./shared";
import { BRASS, IVORY, MUTED_BLUE, SLATE } from "../journeyPalette";

/** ZCHF enters savings chamber; visible stream from equity pool — no hidden lending pipe */
export default function SavingsReservoir({ active, simplified }: { active: number; simplified: boolean }) {
	const streamOpacity = 0.35 + active * 0.5;

	return (
		<group>
			<StationPlatform active={active} />

			{/* Savings chamber — stacked reservoir */}
			{[0, 0.12, 0.24].map((y, index) => (
				<mesh key={y} castShadow position={[0, 0.12 + y, 0]}>
					<cylinderGeometry args={[0.4 - index * 0.035, 0.4 - index * 0.035, 0.07, 48]} />
					<meshStandardMaterial color={index === 2 ? BRASS : IVORY} roughness={0.72} metalness={index === 2 ? 0.55 : 0.04} />
				</mesh>
			))}

			{/* ZCHF entering savings */}
			{active > 0.2 && <MiniZCHF position={[0, 0.52, 0.18]} scale={0.1} />}

			{/* Equity pool tank — source of savings interest */}
			<mesh castShadow position={[0, 0.72, -0.28]}>
				<boxGeometry args={[0.52, 0.22, 0.36]} />
				<meshStandardMaterial color={SLATE} roughness={0.7} metalness={0.22} />
			</mesh>
			<LabelPlate position={[0, 0.88, -0.28]} label="equity pool" width={0.58} subdued />

			{/* Visible interest stream — equity → savings */}
			<mesh position={[0, 0.58, -0.12]}>
				<cylinderGeometry args={[0.025, 0.025, 0.32, 12]} />
				<meshStandardMaterial color={MUTED_BLUE} roughness={0.45} metalness={0.4} transparent opacity={streamOpacity} />
			</mesh>
			<FlowChannel from={[0, 0.72, -0.28]} to={[0, 0.48, 0]} color={BRASS} opacity={0.4 + active * 0.45} width={0.035} />

			{!simplified && (
				<>
					<LabelPlate position={[0, 0.58, 0.38]} label="savings interest" width={0.65} />
					<LabelPlate position={[0.55, 0.38, 0]} label="no hidden lending" width={0.72} subdued />
				</>
			)}
		</group>
	);
}
