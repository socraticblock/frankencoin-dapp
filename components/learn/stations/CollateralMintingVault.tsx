import { useRef } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { BlockCollateral, FlowChannel, LabelPlate, MiniZCHF, StationPlatform } from "./shared";
import { BRASS, IVORY, SLATE } from "../journeyPalette";

/** Collateral enters vault; ZCHF exits via wallet, reserve, and upfront cost channels */
export default function CollateralMintingVault({ active, simplified }: { active: number; simplified: boolean }) {
	const collateralRef = useRef<Group>(null);

	useFrame((_, delta) => {
		if (!collateralRef.current) return;
		const targetY = 0.38 - active * 0.18;
		collateralRef.current.position.y += (targetY - collateralRef.current.position.y) * delta * 2.5;
	});

	return (
		<group>
			<StationPlatform active={active} wide />

			{/* Position chamber / vault */}
			<mesh castShadow position={[0, 0.28, 0]}>
				<boxGeometry args={[0.72, 0.56, 0.72]} />
				<meshStandardMaterial color={SLATE} roughness={0.74} metalness={0.2} />
			</mesh>
			{/* Open front face */}
			<mesh position={[0, 0.28, 0.37]}>
				<boxGeometry args={[0.58, 0.48, 0.02]} />
				<meshStandardMaterial color={IVORY} roughness={0.9} transparent opacity={0.15} />
			</mesh>

			{/* Collateral lowering into chamber */}
			<group ref={collateralRef} position={[0, 0.38, 0]}>
				<BlockCollateral position={[0, 0, 0]} size={0.34} />
			</group>

			{/* Minting manifold — three output channels */}
			<mesh position={[0.42, 0.18, 0]}>
				<boxGeometry args={[0.28, 0.08, 0.08]} />
				<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.65} />
			</mesh>

			<FlowChannel from={[0.36, 0.18, 0]} to={[0.72, 0.14, 0.22]} opacity={0.5 + active * 0.45} />
			<FlowChannel from={[0.36, 0.18, 0]} to={[0.72, 0.22, 0]} opacity={0.4 + active * 0.35} width={0.03} />
			<FlowChannel from={[0.36, 0.18, 0]} to={[0.72, 0.14, -0.22]} opacity={0.35 + active * 0.3} width={0.025} />

			{active > 0.25 && <MiniZCHF position={[0.82, 0.14, 0.22]} scale={0.12} />}
			{active > 0.35 && <MiniZCHF position={[0.82, 0.22, 0]} scale={0.08} />}
			{active > 0.45 && <MiniZCHF position={[0.82, 0.14, -0.22]} scale={0.07} />}

			{!simplified && (
				<>
					<LabelPlate position={[0, 0.62, 0]} label="Collateral locked → position opens" width={1.05} />
					<LabelPlate position={[0.95, 0.28, 0.22]} label="wallet" width={0.42} />
					<LabelPlate position={[0.95, 0.36, 0]} label="reserve" width={0.42} subdued />
					<LabelPlate position={[0.95, 0.28, -0.22]} label="upfront cost" width={0.55} subdued />
				</>
			)}
		</group>
	);
}
