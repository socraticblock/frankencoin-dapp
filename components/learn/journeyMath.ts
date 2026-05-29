import { MathUtils } from "three";
import { journeyStations } from "./journeyData";
import type { JourneyStationId } from "./journeyData";

export function clamp01(value: number) {
	return MathUtils.clamp(value, 0, 1);
}

export function smoothstep(value: number) {
	const t = clamp01(value);
	return t * t * (3 - 2 * t);
}

export function getActiveStrength(progress: number, stationId: JourneyStationId) {
	const index = journeyStations.findIndex((station) => station.id === stationId);
	if (index === -1) return 0;

	const exact = clamp01(progress) * (journeyStations.length - 1);
	const distance = Math.abs(exact - index);
	return clamp01(1 - distance);
}

export function getMedallionVariant(progress: number): "seed" | "forming" | "full" {
	if (progress < 0.1) return "seed";
	if (progress < 0.22) return "forming";
	return "full";
}
