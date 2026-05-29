import { useRef } from "react";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { getActiveStrength } from "./journeyMath";
import type { JourneyStationId } from "./journeyData";
import { STATION_POSITIONS } from "./JourneyCameraRig";
import ThesisChamber from "./stations/ThesisChamber";
import SwissFrancTarget from "./stations/SwissFrancTarget";
import CollateralMintingVault from "./stations/CollateralMintingVault";
import OracleFreeCrossroads from "./stations/OracleFreeCrossroads";
import ChallengeAmphitheater from "./stations/ChallengeAmphitheater";
import SavingsReservoir from "./stations/SavingsReservoir";
import FpsBackstopFoundation from "./stations/FpsBackstopFoundation";
import DeskCockpit from "./stations/DeskCockpit";

type JourneyStationProps = {
	stationId: JourneyStationId;
	progress: number;
	simplified: boolean;
};

function StationContent({ stationId, active, simplified }: { stationId: JourneyStationId; active: number; simplified: boolean }) {
	switch (stationId) {
		case "thesis":
			return <ThesisChamber active={active} simplified={simplified} />;
		case "zchf":
			return <SwissFrancTarget active={active} simplified={simplified} />;
		case "collateral":
			return <CollateralMintingVault active={active} simplified={simplified} />;
		case "oracleFree":
			return <OracleFreeCrossroads active={active} simplified={simplified} />;
		case "challenge":
			return <ChallengeAmphitheater active={active} simplified={simplified} />;
		case "earn":
			return <SavingsReservoir active={active} simplified={simplified} />;
		case "fps":
			return <FpsBackstopFoundation active={active} simplified={simplified} />;
		case "responsibility":
			return <DeskCockpit active={active} simplified={simplified} />;
		default:
			return null;
	}
}

export default function JourneyStation({ stationId, progress, simplified }: JourneyStationProps) {
	const groupRef = useRef<Group>(null);
	const active = getActiveStrength(progress, stationId);
	const position = STATION_POSITIONS[stationId];
	const visibility = 0.35 + active * 0.65;

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		const targetScale = simplified ? 0.82 + active * 0.08 : 0.88 + active * 0.12;
		const damp = 1 - Math.pow(0.002, delta);
		groupRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), damp);
		groupRef.current.position.y += (active * 0.04 - groupRef.current.position.y) * 0.08;
	});

	return (
		<group ref={groupRef} position={position}>
			<group visible={visibility > 0.4 || active > 0.05}>
				<StationContent stationId={stationId} active={active} simplified={simplified} />
			</group>
		</group>
	);
}
