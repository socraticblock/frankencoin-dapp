import type { Address } from "viem";

/** URL / page-driven intent for which Earn tab to open */
export type EarnFormIntent = "collect" | "deposit" | "withdraw" | null;

export type EarnAction = "collect" | "deposit" | "withdraw";

export type CollectAction = "collect_wallet" | "compound";

export type WithdrawMode = "partial" | "all";

/** Rows-only preview flows for the Earn transaction panel */
export type EarnPreviewFlow =
	| "collect_wallet"
	| "compound"
	| "deposit"
	| "withdraw_partial"
	| "withdraw_all";

/**
 * Outcome / preview intent across Earn locked flow and legacy full savings UI.
 * Mirrors prior `SavingsOutcomeFlowIntent` exports.
 */
export type SavingsOutcomeFlowIntent =
	| "collect"
	| EarnPreviewFlow
	| "withdraw";

export type SavingsAccountSnapshot = {
	walletBalance: bigint;
	savingsBalance: bigint;
	readyInterest: bigint;
	referralFees: bigint;
	locktime: bigint;
	referrer: Address;
	referralFeePPM: bigint;
};

export type EarnActionInput = {
	action: EarnAction;
	collectAction: CollectAction;
	withdrawMode: WithdrawMode;
	depositAmount: bigint;
	withdrawAmount: bigint;
};

/** Planned Earn adjustment — usable for preview + CTA wiring in later passes */
export type EarnActionPlan = {
	flow: EarnPreviewFlow;
	targetSavingsAmount: bigint;
	actionAmount: bigint;
	resultingBalance: bigint;
	ctaLabel: string;
	disabledReason?: string;
};
