import { useRef } from "react";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import JourneyMedallion from "./JourneyMedallion";
import { getMedallionVariant } from "./journeyMath";
import { useRouteCurve } from "./JourneyCameraRig";

export function TravelingZCHF({ progress }: { progress: number }) {
	const groupRef = useRef<Group>(null);
	const routeCurve = useRouteCurve();
	const variant = getMedallionVariant(progress);
	const scale = variant === "seed" ? 0.22 : variant === "forming" ? 0.36 : 0.48;

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		const t = Math.min(Math.max(progress, 0), 1);
		const point = routeCurve.getPoint(t).add(new Vector3(0, 0.48, 0));
		const damp = 1 - Math.pow(0.001, delta);
		groupRef.current.position.lerp(point, damp);
	});

	return (
		<group ref={groupRef} scale={[scale, scale, scale]}>
			<JourneyMedallion progress={progress} variant={variant} />
		</group>
	);
}
