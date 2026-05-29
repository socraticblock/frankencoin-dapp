import { useRef } from "react";
import { Group, Mesh } from "three";
import { useFrame } from "@react-three/fiber";

type JourneyMedallionProps = {
	progress: number;
};

export default function JourneyMedallion({ progress }: JourneyMedallionProps) {
	const groupRef = useRef<Group>(null);
	const ringRef = useRef<Mesh>(null);

	useFrame(() => {
		if (!groupRef.current) return;
		groupRef.current.rotation.y += (progress * Math.PI * 2 - groupRef.current.rotation.y) * 0.04;
		groupRef.current.position.y = Math.sin(progress * Math.PI * 2) * 0.08;

		if (ringRef.current) {
			ringRef.current.rotation.x = Math.PI / 2;
			ringRef.current.rotation.z += 0.002;
		}
	});

	return (
		<group ref={groupRef}>
			{/* Brass disc */}
			<mesh castShadow receiveShadow>
				<cylinderGeometry args={[0.85, 0.85, 0.12, 64]} />
				<meshStandardMaterial color="#c4a574" metalness={0.75} roughness={0.35} />
			</mesh>

			{/* Ivory face */}
			<mesh position={[0, 0.061, 0]}>
				<cylinderGeometry args={[0.72, 0.72, 0.02, 64]} />
				<meshStandardMaterial color="#f4efe6" metalness={0.1} roughness={0.85} />
			</mesh>

			{/* Inner ring accent */}
			<mesh ref={ringRef} position={[0, 0.072, 0]}>
				<torusGeometry args={[0.55, 0.018, 16, 64]} />
				<meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.25} />
			</mesh>

			{/* Center emblem */}
			<mesh position={[0, 0.075, 0]}>
				<cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
				<meshStandardMaterial color="#17212f" metalness={0.3} roughness={0.6} />
			</mesh>
		</group>
	);
}
