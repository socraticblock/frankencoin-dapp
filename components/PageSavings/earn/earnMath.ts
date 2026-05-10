import type { SavingsAccountSnapshot } from "./earnTypes";
import type { CollectAction, EarnAction, WithdrawMode } from "./earnTypes";

/** Gross saved balance immediately after on-chain `refresh` (interest − referral fee compounded into `saved`). */
export function getSavedAfterRefresh(snapshot: SavingsAccountSnapshot): bigint {
	return snapshot.savingsBalance + snapshot.readyInterest - snapshot.referralFees;
}

/**
 * Current behavior preserved from the pre-controller-extraction flow.
 * Do not correct formulas in this refactor; protocol/product changes belong in a separate pass.
 */
export function getCollectWalletTarget(snapshot: SavingsAccountSnapshot): bigint {
	return snapshot.savingsBalance;
}

/**
 * Current behavior preserved from the pre-controller-extraction flow.
 * Do not correct formulas in this refactor; protocol/product changes belong in a separate pass.
 */
export function getCompoundTarget(snapshot: SavingsAccountSnapshot): bigint {
	return snapshot.savingsBalance + snapshot.readyInterest;
}

/**
 * Current behavior preserved from the pre-controller-extraction flow.
 * Do not correct formulas in this refactor; protocol/product changes belong in a separate pass.
 */
export function getDepositTarget(snapshot: SavingsAccountSnapshot, depositAmount: bigint): bigint {
	return snapshot.savingsBalance + depositAmount;
}

/**
 * Target savings balance for a partial withdraw `adjust` call when withdraw amount is positive.
 * Mirrors prior `partialWithdrawAdjustTarget ?? savingsBalance` fallback for `earnTargetSavingsAmount`.
 * Current behavior preserved; protocol/product corrections belong in a separate pass.
 */
export function getPartialWithdrawAdjustTarget(
	snapshot: SavingsAccountSnapshot,
	withdrawAmount: bigint
): bigint | undefined {
	const savedAfterRefresh = getSavedAfterRefresh(snapshot);
	if (withdrawAmount <= 0n) return undefined;
	if (savedAfterRefresh < withdrawAmount) return undefined;
	return savedAfterRefresh - withdrawAmount;
}

/** Alias for partial-withdraw on-chain target savings level (`partialWithdrawAdjustTarget`). */
export function getCustomWithdrawTarget(
	snapshot: SavingsAccountSnapshot,
	withdrawAmount: bigint
): bigint | undefined {
	return getPartialWithdrawAdjustTarget(snapshot, withdrawAmount);
}

/** Current behavior preserved; protocol/product corrections belong in a separate pass. */
export function getWithdrawAllTarget(): bigint {
	return 0n;
}

export type EarnTargetBaseContext = {
	snapshot: SavingsAccountSnapshot;
	earnAction: EarnAction;
	collectAction: CollectAction;
	withdrawMode: WithdrawMode;
	depositAmount: bigint;
	withdrawAmount: bigint;
};

export type EarnTargetContext = EarnTargetBaseContext & {
	isPartialWithdrawActive: boolean;
};

/** Same branching as legacy inline `earnTargetSavingsAmount` in SavingsInteractionCard. */
export function getEarnTargetSavingsAmount(ctx: EarnTargetContext): bigint {
	const { snapshot, earnAction, collectAction, withdrawMode, depositAmount, withdrawAmount, isPartialWithdrawActive } =
		ctx;

	if (earnAction === "collect") {
		return collectAction === "compound"
			? getCompoundTarget(snapshot)
			: getCollectWalletTarget(snapshot);
	}
	if (earnAction === "deposit") {
		return getDepositTarget(snapshot, depositAmount);
	}
	if (withdrawMode === "all") {
		return getWithdrawAllTarget();
	}
	if (isPartialWithdrawActive) {
		const partial = getPartialWithdrawAdjustTarget(snapshot, withdrawAmount);
		return partial ?? snapshot.savingsBalance;
	}
	return snapshot.savingsBalance;
}

export type EarnPreviewDerivatives = {
	savedAfterRefresh: bigint;
	partialWithdrawAdjustTarget: bigint | undefined;
	isPartialWithdrawActive: boolean;
	isWithdrawAllPreviewActive: boolean;
	earnTargetSavingsAmount: bigint;
	isPartialWithdrawIdle: boolean;
	earnTargetChange: bigint;
};

export function getEarnPreviewDerivatives(
	ctx: EarnTargetBaseContext & { grossSavedPlusInterest: bigint; isLockedEarnFlow: boolean }
): EarnPreviewDerivatives {
	const savedAfterRefresh = getSavedAfterRefresh(ctx.snapshot);
	const partialWithdrawAdjustTarget =
		ctx.earnAction === "withdraw" &&
		ctx.withdrawMode === "partial" &&
		ctx.withdrawAmount > 0n &&
		savedAfterRefresh >= ctx.withdrawAmount
			? savedAfterRefresh - ctx.withdrawAmount
			: undefined;

	const isPartialWithdrawActive =
		ctx.earnAction === "withdraw" && ctx.withdrawMode === "partial" && ctx.withdrawAmount > 0n;

	const isWithdrawAllPreviewActive =
		ctx.isLockedEarnFlow && ctx.earnAction === "withdraw" && ctx.withdrawMode === "all";

	const earnTargetSavingsAmount = getEarnTargetSavingsAmount({
		snapshot: ctx.snapshot,
		earnAction: ctx.earnAction,
		collectAction: ctx.collectAction,
		withdrawMode: ctx.withdrawMode,
		depositAmount: ctx.depositAmount,
		withdrawAmount: ctx.withdrawAmount,
		isPartialWithdrawActive,
	});

	const isPartialWithdrawIdle =
		ctx.isLockedEarnFlow && ctx.earnAction === "withdraw" && ctx.withdrawMode === "partial" && ctx.withdrawAmount === 0n;

	const earnTargetChange = isPartialWithdrawIdle
		? 0n
		: earnTargetSavingsAmount - ctx.grossSavedPlusInterest;

	return {
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		isPartialWithdrawActive,
		isWithdrawAllPreviewActive,
		earnTargetSavingsAmount,
		isPartialWithdrawIdle,
		earnTargetChange,
	};
}
