import { Text } from "@react-three/drei";
import { BRASS, FADED, IVORY, SLATE, STONE } from "../journeyPalette";

export function StationPlatform({ active, wide = false }: { active: number; wide?: boolean }) {
	const radius = wide ? 0.98 : 0.76;
	return (
		<group>
			<mesh receiveShadow position={[0, -0.035, 0]}>
				<cylinderGeometry args={[radius, radius, 0.055, 72]} />
				<meshStandardMaterial color="#efe8dc" roughness={0.94} metalness={0.02} />
			</mesh>
			<mesh position={[0, 0.005, 0]}>
				<torusGeometry args={[radius * 0.82, 0.012 + active * 0.012, 12, 72]} />
				<meshStandardMaterial color={active > 0.35 ? BRASS : "#d5c7b2"} roughness={0.42} metalness={0.65} />
			</mesh>
		</group>
	);
}

export function LabelPlate({
	position,
	label,
	subdued = false,
	width = 0.72,
}: {
	position: [number, number, number];
	label: string;
	subdued?: boolean;
	width?: number;
}) {
	return (
		<group position={position}>
			<mesh position={[0, 0, 0]}>
				<boxGeometry args={[width, 0.11, 0.22]} />
				<meshStandardMaterial color={IVORY} roughness={0.88} metalness={0.02} transparent opacity={subdued ? 0.55 : 0.92} />
			</mesh>
			<Text position={[0, 0.062, 0.001]} fontSize={0.055} color={subdued ? FADED : SLATE} anchorX="center" anchorY="middle" maxWidth={width - 0.08}>
				{label}
			</Text>
		</group>
	);
}

export function ConceptNode({
	position,
	label,
	active,
}: {
	position: [number, number, number];
	label: string;
	active: number;
}) {
	return (
		<group position={position}>
			<mesh castShadow>
				<cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
				<meshStandardMaterial color={IVORY} roughness={0.86} metalness={0.04} />
			</mesh>
			<mesh position={[0, 0.04, 0]}>
				<sphereGeometry args={[0.045 + active * 0.015, 16, 16]} />
				<meshStandardMaterial color={BRASS} roughness={0.38} metalness={0.72} />
			</mesh>
			<Text position={[0, -0.12, 0]} fontSize={0.048} color={SLATE} anchorX="center" anchorY="top">
				{label}
			</Text>
		</group>
	);
}

export function BlueprintLine({ from, to, active }: { from: [number, number, number]; to: [number, number, number]; active: number }) {
	const mid: [number, number, number] = [(from[0] + to[0]) / 2, 0.08 + active * 0.04, (from[2] + to[2]) / 2];
	const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
	const angle = Math.atan2(to[2] - from[2], to[0] - from[0]);

	return (
		<mesh position={mid} rotation={[0, -angle, 0]}>
			<boxGeometry args={[length, 0.008, 0.008]} />
			<meshStandardMaterial color={BRASS} roughness={0.5} metalness={0.55} transparent opacity={0.35 + active * 0.45} />
		</mesh>
	);
}

export function FlowChannel({
	from,
	to,
	color = BRASS,
	opacity = 0.85,
	width = 0.04,
}: {
	from: [number, number, number];
	to: [number, number, number];
	color?: string;
	opacity?: number;
	width?: number;
}) {
	const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
	const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
	const horizontal = Math.hypot(to[0] - from[0], to[2] - from[2]);
	const angleY = Math.atan2(to[2] - from[2], to[0] - from[0]);
	const angleX = Math.atan2(to[1] - from[1], horizontal);

	return (
		<mesh position={mid} rotation={[angleX, -angleY, 0]}>
			<boxGeometry args={[length, width, width]} />
			<meshStandardMaterial color={color} roughness={0.42} metalness={0.62} transparent opacity={opacity} />
		</mesh>
	);
}

export function MiniZCHF({ position, scale = 0.14 }: { position: [number, number, number]; scale?: number }) {
	return (
		<group position={position} scale={scale}>
			<mesh castShadow>
				<cylinderGeometry args={[0.5, 0.5, 0.12, 32]} />
				<meshStandardMaterial color={BRASS} roughness={0.36} metalness={0.78} />
			</mesh>
			<mesh position={[0, 0.065, 0]}>
				<cylinderGeometry args={[0.38, 0.38, 0.02, 32]} />
				<meshStandardMaterial color={IVORY} roughness={0.86} />
			</mesh>
		</group>
	);
}

export function BlockCollateral({ position, size = 0.36 }: { position: [number, number, number]; size?: number }) {
	return (
		<mesh castShadow position={position}>
			<boxGeometry args={[size, size, size]} />
			<meshStandardMaterial color={STONE} roughness={0.82} metalness={0.08} />
		</mesh>
	);
}

export function PositionBlock({ position, highlighted = false }: { position: [number, number, number]; highlighted?: boolean }) {
	return (
		<mesh castShadow position={position}>
			<boxGeometry args={[0.44, 0.44, 0.44]} />
			<meshStandardMaterial color={highlighted ? SLATE : STONE} emissive={highlighted ? "#c98a2e" : "#000000"} emissiveIntensity={highlighted ? 0.12 : 0} roughness={0.68} metalness={0.18} />
		</mesh>
	);
}
