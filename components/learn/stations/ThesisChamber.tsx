import { StationPlatform, BlueprintLine, ConceptNode, LabelPlate } from "./shared";
import { BRASS, IVORY, SLATE, WOOD } from "../journeyPalette";

/** Research desk + thesis paper + blueprint concept nodes + unformed ZCHF seed */
export default function ThesisChamber({ active, simplified }: { active: number; simplified: boolean }) {
	const seedScale = 0.12 + active * 0.06;

	return (
		<group>
			<StationPlatform active={active} wide />

			{/* Research desk */}
			<mesh castShadow position={[0, 0.08, 0]}>
				<boxGeometry args={[1.35, 0.08, 0.82]} />
				<meshStandardMaterial color={WOOD} roughness={0.88} metalness={0.04} />
			</mesh>

			{/* Desk lamp — soft research light */}
			<mesh position={[-0.52, 0.28, -0.22]}>
				<cylinderGeometry args={[0.015, 0.015, 0.38, 12]} />
				<meshStandardMaterial color={SLATE} roughness={0.6} metalness={0.35} />
			</mesh>
			<mesh position={[-0.52, 0.5, -0.22]}>
				<coneGeometry args={[0.12, 0.14, 24, 1, true]} />
				<meshStandardMaterial color={IVORY} roughness={0.9} side={2} emissive="#fff5e6" emissiveIntensity={0.15 + active * 0.2} />
			</mesh>

			{/* Thesis paper stack */}
			<mesh castShadow position={[0.08, 0.14, 0.02]} rotation={[0, -0.18, 0]}>
				<boxGeometry args={[0.72, 0.04, 0.92]} />
				<meshStandardMaterial color={IVORY} roughness={0.92} />
			</mesh>
			{[-0.28, -0.1, 0.08, 0.26].map((z) => (
				<mesh key={z} position={[0.08, 0.17, z]} rotation={[0, -0.18, 0]}>
					<boxGeometry args={[0.52, 0.008, 0.014]} />
					<meshStandardMaterial color={z === -0.28 ? BRASS : "#cfc7ba"} roughness={0.78} />
				</mesh>
			))}

			{/* Unformed ZCHF seed — idea not yet minted */}
			<mesh castShadow position={[0.08, 0.2, 0.02]} scale={seedScale}>
				<icosahedronGeometry args={[1, 0]} />
				<meshStandardMaterial color="#c4a574" roughness={0.72} metalness={0.45} transparent opacity={0.55 + active * 0.35} />
			</mesh>

			{!simplified && (
				<>
					<ConceptNode position={[-0.55, 0.12, 0.48]} label="collateral" active={active} />
					<ConceptNode position={[0.55, 0.12, 0.48]} label="challenge" active={active} />
					<ConceptNode position={[-0.55, 0.12, -0.48]} label="reserve" active={active} />
					<ConceptNode position={[0.55, 0.12, -0.48]} label="veto" active={active} />

					<BlueprintLine from={[0.08, 0, 0.02]} to={[-0.55, 0, 0.48]} active={active} />
					<BlueprintLine from={[0.08, 0, 0.02]} to={[0.55, 0, 0.48]} active={active} />
					<BlueprintLine from={[0.08, 0, 0.02]} to={[-0.55, 0, -0.48]} active={active} />
					<BlueprintLine from={[0.08, 0, 0.02]} to={[0.55, 0, -0.48]} active={active} />

					<LabelPlate position={[0, 0.62, 0]} label="Thesis → protocol blueprint" width={0.95} />
				</>
			)}
		</group>
	);
}
