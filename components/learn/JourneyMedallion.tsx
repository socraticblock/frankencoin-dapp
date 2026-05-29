import { useRef } from "react";
import { Group, Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { BRASS, IVORY, SLATE } from "./journeyPalette";

type MedallionVariant = "seed" | "forming" | "full";

type JourneyMedallionProps = {
	progress: number;
	variant?: MedallionVariant;
};

export default function JourneyMedallion({ progress, variant = "full" }: JourneyMedallionProps) {
	const groupRef = useRef<Group>(null);
	const ringRef = useRef<Mesh>(null);

	useFrame(() => {
		if (!groupRef.current) return;
		groupRef.current.rotation.y += (progress * Math.PI * 2 - groupRef.current.rotation.y) * 0.04;

		if (variant === "full") {
			groupRef.current.position.y = Math.sin(progress * Math.PI * 2) * 0.08;
		}

		if (ringRef.current) {
			ringRef.current.rotation.x = Math.PI / 2;
			ringRef.current.rotation.z += 0.002;
		}
	});

	if (variant === "seed") {
		return (
			<group ref={groupRef}>
				<mesh castShadow>
					<icosahedronGeometry args={[0.55, 0]} />
					<meshStandardMaterial color="#c4a574" roughness={0.72} metalness={0.45} transparent opacity={0.65} />
				</mesh>
			</group>
		);
	}

	if (variant === "forming") {
		return (
			<group ref={groupRef}>
				<mesh castShadow>
					<cylinderGeometry args={[0.65, 0.65, 0.08, 48]} />
					<meshStandardMaterial color={BRASS} roughness={0.42} metalness={0.65} transparent opacity={0.55} />
				</mesh>
				<mesh position={[0, 0.045, 0]}>
					<cylinderGeometry args={[0.5, 0.5, 0.02, 48]} />
					<meshStandardMaterial color={IVORY} roughness={0.86} transparent opacity={0.7} />
				</mesh>
			</group>
		);
	}

	return (
		<group ref={groupRef}>
			<mesh castShadow receiveShadow>
				<cylinderGeometry args={[0.85, 0.85, 0.12, 64]} />
				<meshStandardMaterial color="#c4a574" metalness={0.75} roughness={0.35} />
			</mesh>
			<mesh position={[0, 0.061, 0]}>
				<cylinderGeometry args={[0.72, 0.72, 0.02, 64]} />
				<meshStandardMaterial color={IVORY} metalness={0.1} roughness={0.85} />
			</mesh>
			<mesh ref={ringRef} position={[0, 0.072, 0]}>
				<torusGeometry args={[0.55, 0.018, 16, 64]} />
				<meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.25} />
			</mesh>
			<mesh position={[0, 0.075, 0]}>
				<cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
				<meshStandardMaterial color={SLATE} metalness={0.3} roughness={0.6} />
			</mesh>
		</group>
	);
}
