import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
	CatmullRomCurve3,
	Color,
	Group,
	MathUtils,
	MeshStandardMaterial,
	TubeGeometry,
	Vector3,
} from "three";
import JourneyMedallion from "./JourneyMedallion";
import { journeyStations } from "./journeyData";
import type { JourneyStationId } from "./journeyData";

type JourneySceneProps = {
	progress: number;
	onReady?: () => void;
	simplified?: boolean;
};

type StationPositionMap = Record<JourneyStationId, [number, number, number]>;

const STATION_POSITIONS: StationPositionMap = {
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

const BRASS = "#b08a4a";
const DARK_BRASS = "#5e4524";
const SLATE = "#17212f";
const IVORY = "#fbf7ef";
const SOFT_IVORY = "#f4efe6";
const MUTED_BLUE = "#9bb7c7";
const AMBER = "#c98a2e";

function clamp01(value: number) {
	return MathUtils.clamp(value, 0, 1);
}

function smoothstep(value: number) {
	const t = clamp01(value);
	return t * t * (3 - 2 * t);
}

function getActiveStrength(progress: number, stationId: JourneyStationId) {
	const index = journeyStations.findIndex((station) => station.id === stationId);
	if (index === -1) return 0;

	const exact = clamp01(progress) * (journeyStations.length - 1);
	const distance = Math.abs(exact - index);
	return clamp01(1 - distance);
}

function useRouteCurve() {
	return useMemo(() => new CatmullRomCurve3(ROUTE_POINTS, false, "catmullrom", 0.28), []);
}

function JourneyCameraRig({ progress, simplified }: { progress: number; simplified: boolean }) {
	const { camera } = useThree();
	const lookAt = useRef(new Vector3(0, 0, 0));
	const routeCurve = useRouteCurve();

	useFrame((_, delta) => {
		const t = smoothstep(progress);
		const focalPoint = routeCurve.getPoint(t);
		const cameraOffset = simplified ? new Vector3(0.2, 4.2, 6.8) : new Vector3(0.35, 4.8, 7.6);
		const desiredPosition = focalPoint.clone().add(cameraOffset);
		const desiredLookAt = focalPoint.clone().add(new Vector3(0, 0.2, 0));

		const damp = 1 - Math.pow(0.0008, delta);
		camera.position.lerp(desiredPosition, damp);
		lookAt.current.lerp(desiredLookAt, damp);
		camera.lookAt(lookAt.current);
		camera.updateProjectionMatrix();
	});

	return null;
}

function RouteRail({ simplified }: { simplified: boolean }) {
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

function TravelingZCHF({ progress }: { progress: number }) {
	const groupRef = useRef<Group>(null);
	const routeCurve = useRouteCurve();

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		const point = routeCurve.getPoint(clamp01(progress)).add(new Vector3(0, 0.42, 0));
		const damp = 1 - Math.pow(0.001, delta);
		groupRef.current.position.lerp(point, damp);
		groupRef.current.rotation.y += delta * 0.35;
	});

	return (
		<group ref={groupRef} scale={[0.48, 0.48, 0.48]}>
			<JourneyMedallion progress={progress} />
		</group>
	);
}

function Platform({ active, wide = false }: { active: number; wide?: boolean }) {
	return (
		<group>
			<mesh receiveShadow position={[0, -0.035, 0]}>
				<cylinderGeometry args={[wide ? 0.95 : 0.74, wide ? 0.95 : 0.74, 0.055, 72]} />
				<meshStandardMaterial color="#efe8dc" roughness={0.94} metalness={0.02} />
			</mesh>
			<mesh position={[0, 0.005, 0]}>
				<torusGeometry args={[wide ? 0.78 : 0.6, 0.012 + active * 0.012, 12, 72]} />
				<meshStandardMaterial color={active > 0.35 ? BRASS : "#d5c7b2"} roughness={0.42} metalness={0.65} />
			</mesh>
		</group>
	);
}

function ThesisStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} />
			<mesh castShadow position={[-0.12, 0.1, 0]} rotation={[0, -0.22, 0]}>
				<boxGeometry args={[0.95, 0.07, 1.16]} />
				<meshStandardMaterial color={IVORY} roughness={0.9} metalness={0.03} />
			</mesh>
			{[-0.3, -0.12, 0.06, 0.24].map((z) => (
				<mesh key={z} position={[-0.12, 0.15, z]} rotation={[0, -0.22, 0]}>
					<boxGeometry args={[0.68, 0.012, 0.018]} />
					<meshStandardMaterial color={z === -0.3 ? BRASS : "#cfc7ba"} roughness={0.78} />
				</mesh>
			))}
		</group>
	);
}

function ZCHFStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} />
			<mesh castShadow position={[0, 0.2, 0]}>
				<cylinderGeometry args={[0.38, 0.38, 0.12, 72]} />
				<meshStandardMaterial color={BRASS} roughness={0.36} metalness={0.78} />
			</mesh>
			<mesh position={[0, 0.27, 0]}>
				<cylinderGeometry args={[0.26, 0.26, 0.025, 72]} />
				<meshStandardMaterial color={IVORY} roughness={0.86} metalness={0.05} />
			</mesh>
			<mesh position={[0, 0.31, 0]}>
				<torusGeometry args={[0.2 + active * 0.05, 0.012, 12, 64]} />
				<meshStandardMaterial color={SLATE} roughness={0.62} metalness={0.22} />
			</mesh>
		</group>
	);
}

function CollateralStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} wide />
			<mesh castShadow position={[-0.28, 0.18, 0.06]}>
				<boxGeometry args={[0.42, 0.36, 0.42]} />
				<meshStandardMaterial color="#d9d2c5" roughness={0.82} metalness={0.08} />
			</mesh>
			<mesh castShadow position={[0.26, 0.3, -0.08]}>
				<boxGeometry args={[0.52, 0.6, 0.52]} />
				<meshStandardMaterial color={SLATE} roughness={0.74} metalness={0.2} />
			</mesh>
			<mesh position={[0.26, 0.62, -0.08]}>
				<torusGeometry args={[0.3, 0.018, 12, 64]} />
				<meshStandardMaterial color={BRASS} roughness={0.38} metalness={0.7} />
			</mesh>
		</group>
	);
}

function OracleStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} wide />
			<mesh castShadow position={[-0.36, 0.34, 0]}>
				<cylinderGeometry args={[0.16, 0.24, 0.68, 32]} />
				<meshStandardMaterial color="#dbe6eb" roughness={0.82} metalness={0.05} transparent opacity={0.52} />
			</mesh>
			<mesh position={[-0.36, 0.73, 0]} rotation={[0, 0, Math.PI / 4]}>
				<boxGeometry args={[0.08, 0.58, 0.025]} />
				<meshStandardMaterial color={AMBER} roughness={0.55} transparent opacity={0.55} />
			</mesh>
			<mesh position={[-0.36, 0.73, 0]} rotation={[0, 0, -Math.PI / 4]}>
				<boxGeometry args={[0.08, 0.58, 0.025]} />
				<meshStandardMaterial color={AMBER} roughness={0.55} transparent opacity={0.55} />
			</mesh>
			<mesh position={[0.34, 0.18, 0]}>
				<torusGeometry args={[0.32 + active * 0.04, 0.022, 12, 64]} />
				<meshStandardMaterial color={MUTED_BLUE} roughness={0.35} metalness={0.45} />
			</mesh>
			<mesh position={[0.34, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
				<torusGeometry args={[0.22, 0.012, 12, 48]} />
				<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.7} />
			</mesh>
		</group>
	);
}

function ChallengeStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} wide />
			<mesh castShadow position={[-0.3, 0.22, 0]}>
				<boxGeometry args={[0.44, 0.44, 0.44]} />
				<meshStandardMaterial color={SLATE} roughness={0.68} metalness={0.18} />
			</mesh>
			<mesh castShadow position={[0.34, 0.14, 0.16]}>
				<boxGeometry args={[0.34, 0.28, 0.34]} />
				<meshStandardMaterial color="#e1d7c6" roughness={0.82} />
			</mesh>
			<mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.62, 0.018 + active * 0.012, 12, 96]} />
				<meshStandardMaterial color={active > 0.35 ? AMBER : BRASS} roughness={0.36} metalness={0.66} />
			</mesh>
		</group>
	);
}

function EarnStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} />
			{[0, 0.12, 0.24].map((y, index) => (
				<mesh key={y} castShadow position={[0, 0.12 + y, 0]}>
					<cylinderGeometry args={[0.42 - index * 0.04, 0.42 - index * 0.04, 0.07, 60]} />
					<meshStandardMaterial color={index === 2 ? BRASS : IVORY} roughness={0.72} metalness={index === 2 ? 0.55 : 0.04} />
				</mesh>
			))}
			<mesh position={[0, 0.58, 0]}>
				<torusGeometry args={[0.48 + active * 0.05, 0.012, 12, 72]} />
				<meshStandardMaterial color={MUTED_BLUE} roughness={0.48} metalness={0.4} transparent opacity={0.72} />
			</mesh>
		</group>
	);
}

function FPSStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} wide />
			<mesh castShadow position={[0, 0.13, 0]}>
				<boxGeometry args={[0.98, 0.26, 0.7]} />
				<meshStandardMaterial color={SLATE} roughness={0.7} metalness={0.22} />
			</mesh>
			<mesh castShadow position={[0, 0.34, 0]}>
				<cylinderGeometry args={[0.34, 0.34, 0.12, 64]} />
				<meshStandardMaterial color={BRASS} roughness={0.38} metalness={0.76} />
			</mesh>
			<mesh position={[0, 0.43, 0]}>
				<torusGeometry args={[0.42 + active * 0.04, 0.016, 12, 72]} />
				<meshStandardMaterial color={IVORY} roughness={0.82} metalness={0.04} />
			</mesh>
		</group>
	);
}

function ResponsibilityStation({ active }: { active: number }) {
	return (
		<group>
			<Platform active={active} wide />
			{[
				[-0.42, 0.18, -0.28],
				[0.02, 0.24, -0.12],
				[0.46, 0.2, 0.08],
				[-0.12, 0.3, 0.32],
			].map(([x, y, z], index) => (
				<mesh key={`${x}-${z}`} castShadow position={[x, y, z]}>
					<boxGeometry args={[0.34, y * 1.5, 0.24]} />
					<meshStandardMaterial color={index % 2 === 0 ? IVORY : "#d9d2c5"} roughness={0.82} metalness={0.04} />
				</mesh>
			))}
			<mesh position={[0, 0.64, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.62 + active * 0.05, 0.014, 12, 80]} />
				<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.72} />
			</mesh>
		</group>
	);
}

function StationModel({
	stationId,
	progress,
	simplified,
}: {
	stationId: JourneyStationId;
	progress: number;
	simplified: boolean;
}) {
	const groupRef = useRef<Group>(null);
	const active = getActiveStrength(progress, stationId);
	const position = STATION_POSITIONS[stationId];

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		const targetScale = simplified ? 0.82 + active * 0.08 : 1 + active * 0.13;
		const damp = 1 - Math.pow(0.002, delta);
		groupRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), damp);
		groupRef.current.position.y += (active * 0.05 - groupRef.current.position.y) * 0.08;
	});

	return (
		<group ref={groupRef} position={position}>
			{stationId === "thesis" && <ThesisStation active={active} />}
			{stationId === "zchf" && <ZCHFStation active={active} />}
			{stationId === "collateral" && <CollateralStation active={active} />}
			{stationId === "oracleFree" && <OracleStation active={active} />}
			{stationId === "challenge" && <ChallengeStation active={active} />}
			{stationId === "earn" && <EarnStation active={active} />}
			{stationId === "fps" && <FPSStation active={active} />}
			{stationId === "responsibility" && <ResponsibilityStation active={active} />}
		</group>
	);
}

function SoftWorldGrid({ simplified }: { simplified: boolean }) {
	if (simplified) return null;

	const cells = [-1, 0, 1, 2, 3];

	return (
		<group position={[2.2, -0.018, 2.55]}>
			{cells.map((x) =>
				cells.map((z) => (
					<mesh key={`${x}-${z}`} position={[x * 0.28, 0, z * 0.28]}>
						<boxGeometry args={[0.18, 0.012, 0.18]} />
						<meshStandardMaterial color="#e8e0d3" roughness={0.92} metalness={0.01} transparent opacity={0.7} />
					</mesh>
				))
			)}
		</group>
	);
}

function WorldShell({ simplified }: { simplified: boolean }) {
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

			<SoftWorldGrid simplified={simplified} />
		</>
	);
}

export default function JourneyScene({ progress, onReady, simplified = false }: JourneySceneProps) {
	useEffect(() => {
		onReady?.();
	}, [onReady]);

	const shadowMaterial = useMemo(
		() =>
			new MeshStandardMaterial({
				color: DARK_BRASS,
				roughness: 0.82,
				metalness: 0.08,
				transparent: true,
				opacity: simplified ? 0.08 : 0.12,
			}),
		[simplified]
	);

	return (
		<>
			<color attach="background" args={[new Color("#f7f2e9")]} />
			<fog attach="fog" args={["#f7f2e9", simplified ? 9 : 11, simplified ? 18 : 23]} />

			<JourneyCameraRig progress={progress} simplified={simplified} />

			<ambientLight intensity={0.72} />
			<hemisphereLight args={["#fffaf1", "#cfc7ba", 0.85]} />
			<directionalLight
				position={[-5, 7, 5]}
				intensity={1.55}
				castShadow={!simplified}
				shadow-mapSize={[1024, 1024]}
			/>
			<directionalLight position={[4, 3, -5]} intensity={0.34} color="#dbeaf3" />

			<WorldShell simplified={simplified} />
			<RouteRail simplified={simplified} />

			{journeyStations.map((station) => (
				<StationModel key={station.id} stationId={station.id} progress={progress} simplified={simplified} />
			))}

			<TravelingZCHF progress={progress} />

			{!simplified && (
				<mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.8, -0.065, 0.4]} material={shadowMaterial}>
					<circleGeometry args={[3.4, 96]} />
				</mesh>
			)}
		</>
	);
}
