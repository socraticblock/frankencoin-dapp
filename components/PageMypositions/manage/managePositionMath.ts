import { formatUnits } from "viem";
import { ManageAction, ManagePositionTarget, RiskEstimate } from "./managePositionTypes";

export function buildManageTarget(params: {
	action: ManageAction;
	currentMinted: bigint;
	currentCollateral: bigint;
	currentPrice: bigint;
	actionAmount: bigint;
	selectedPrice: bigint;
}): ManagePositionTarget {
	const { action, currentMinted, currentCollateral, currentPrice, actionAmount, selectedPrice } = params;

	switch (action) {
		case "addCollateral":
			return {
				targetMinted: currentMinted,
				targetCollateral: currentCollateral + actionAmount,
				targetPrice: currentPrice,
			};
		case "removeCollateral":
			return {
				targetMinted: currentMinted,
				targetCollateral: currentCollateral > actionAmount ? currentCollateral - actionAmount : 0n,
				targetPrice: currentPrice,
			};
		case "borrowMore":
			return {
				targetMinted: currentMinted + actionAmount,
				targetCollateral: currentCollateral,
				targetPrice: currentPrice,
			};
		case "repay":
			return {
				targetMinted: currentMinted > actionAmount ? currentMinted - actionAmount : 0n,
				targetCollateral: currentCollateral,
				targetPrice: currentPrice,
			};
		case "adjustSafety":
			return {
				targetMinted: currentMinted,
				targetCollateral: currentCollateral,
				targetPrice: selectedPrice,
			};
		case "close":
			return {
				targetMinted: 0n,
				targetCollateral: 0n,
				targetPrice: currentPrice,
			};
	}
}

export function getReserve(minted: bigint, reserveContribution: number | string | bigint) {
	return (minted * BigInt(reserveContribution)) / 1_000_000n;
}

export function getRepayFromWallet(minted: bigint, reserveContribution: number | string | bigint) {
	return minted - getReserve(minted, reserveContribution);
}

export function estimateRisk(params: {
	minted: bigint;
	collateral: bigint;
	collateralDecimals: number;
	marketPriceChf?: number | null;
}): RiskEstimate {
	const { minted, collateral, collateralDecimals, marketPriceChf } = params;
	if (!marketPriceChf || marketPriceChf <= 0) return { ltv: null, safetyBuffer: null, collateralValue: null };

	const collateralAmount = Number(formatUnits(collateral, collateralDecimals));
	const collateralValue = collateralAmount * marketPriceChf;
	if (!Number.isFinite(collateralValue) || collateralValue <= 0) return { ltv: null, safetyBuffer: null, collateralValue: null };

	const mintedAmount = Number(formatUnits(minted, 18));
	const ltv = (mintedAmount / collateralValue) * 100;
	if (!Number.isFinite(ltv)) return { ltv: null, safetyBuffer: null, collateralValue };

	return {
		ltv,
		safetyBuffer: 100 - ltv,
		collateralValue,
	};
}
