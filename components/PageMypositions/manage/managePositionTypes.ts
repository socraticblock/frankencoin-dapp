export type ManageAction =
	| "addCollateral"
	| "removeCollateral"
	| "borrowMore"
	| "repay"
	| "adjustSafety"
	| "close";

export type ManagePositionTarget = {
	targetMinted: bigint;
	targetCollateral: bigint;
	targetPrice: bigint;
};

export type RiskEstimate = {
	ltv: number | null;
	safetyBuffer: number | null;
	collateralValue: number | null;
};
