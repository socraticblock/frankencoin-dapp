import { formatUnits } from "viem";

export type EquityAction = "Mint FPS" | "Redeem FPS" | "Wrap FPS" | "Unwrap WFPS";

export const ACTIONS: EquityAction[] = ["Mint FPS", "Redeem FPS", "Wrap FPS", "Unwrap WFPS"];

export const SECONDS_PER_DAY = 86_400n;
export const REDEMPTION_DURATION = SECONDS_PER_DAY * 90n;

export function formatTokenAmount(amount: bigint) {
	return Math.round(parseFloat(formatUnits(amount, 18)) * 10000) / 10000;
}

export function formatDaysLeft(seconds: bigint) {
	if (seconds <= 0n) return "Ready";
	const days = (seconds + SECONDS_PER_DAY - 1n) / SECONDS_PER_DAY;
	return `${days.toString()} day${days === 1n ? "" : "s"}`;
}
