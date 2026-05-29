import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { journeyStations } from "./journeyData";
import type { JourneyStationId } from "./journeyData";
import { smoothstep } from "./journeyMath";
import { BRASS, DARK_BRASS, SOFT_IVORY } from "./journeyPalette";

type StationPositionMap = Record<JourneyStationId, [number, number, number]>;

export const STATION_POSITIONS: StationPositionMap = {
	thesis: [-6.4, 0, -2.4],
	zchf: [-4.35, 0, 0.75],
	collateral: [-1.75, 0, -1.0],
	oracleFree: [0.85, 0, 1.15],
	challenge: [3.15, 0, -1.15],
	earn: [5.25, 0, 1.15],
	fps: [7.2, 0, -0.85],
	responsibility: [9.4, 0, 0.65],
};

const ROUTE_POINTS = journeyStations.map((station) => new Vector3(...STATION_POSITIONS[station.id]));

export function useRouteCurve() {
	return useMemo(() => new CatmullRomCurve3(ROUTE_POINTS, false, "catmullrom", 0.28), []);
}

type JourneyCameraRigProps = {
	progress: number;
	simplified: boolean;
};

export default function JourneyCameraRig({ progress, simplified }: JourneyCameraRigProps) {
	const { camera } = useThree();
	const lookAt = useRef(new Vector3(0, 0, 0));
	const routeCurve = useRouteCurve();

	useFrame((_, delta) => {
		const t = smoothstep(progress);
		const focalPoint = routeCurve.getPoint(t);
		const cameraOffset = simplified ? new Vector3(0.15, 4.0, 6.4) : new Vector3(0.3, 4.6, 7.2);
		const desiredPosition = focalPoint.clone().add(cameraOffset);
		const desiredLookAt = focalPoint.clone().add(new Vector3(0, 0.28, 0));

		const damp = 1 - Math.pow(0.0008, delta);
		camera.position.lerp(desiredPosition, damp);
		lookAt.current.lerp(desiredLookAt, damp);
		camera.lookAt(lookAt.current);
		camera.updateProjectionMatrix();
	});

	return null;
}

export function RouteRail({ simplified }: { simplified: boolean }) {
	const routeCurve = useRouteCurve();
	const geometry = useMemo(() => new TubeGeometry(routeCurve, simplified ? 90 : 180, 0.026, 8, false), [routeCurve, simplified]);
	const shadowGeometry = useMemo(() => new TubeGeometry(routeCurve, simplified ? 90 : 180, 0.055, 8, false), [routeCurve, simplified]);

	return (
		<group position={[0, 0.035, 0]}>
			<mesh geometry={shadowGeometry}>
				<meshStandardMaterial color="#d8d0c3" roughness={0.92} metalness={0.02} transparent opacity={0.55} />
			</mesh>
			<mesh geometry={geometry}>
				<meshStandardMaterial color={BRASS} roughness={0.38} metalness={0.72} />
			</mesh>
		</group>
	);
}

export function WorldShell({ simplified }: { simplified: boolean }) {
	if (simplified) {
		return (
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.08, -0.05]} receiveShadow>
				<planeGeometry args={[22, 9]} />
				<meshStandardMaterial color={SOFT_IVORY} roughness={0.96} metalness={0.02} />
			</mesh>
		);
	}

	return (
		<>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.08, -0.05]} receiveShadow>
				<planeGeometry args={[22, 9]} />
				<meshStandardMaterial color={SOFT_IVORY} roughness={0.96} metalness={0.02} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.075, -0.05]}>
				<planeGeometry args={[18, 5.8]} />
				<meshStandardMaterial color="#f8f4ec" roughness={0.9} metalness={0.02} transparent opacity={0.78} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.8, -0.065, 0.4]}>
				<circleGeometry args={[3.4, 96]} />
				<meshStandardMaterial color={DARK_BRASS} roughness={0.82} transparent opacity={0.12} />
			</mesh>
		</>
	);
}
