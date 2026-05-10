import { getEarnPreviewDerivatives } from "./earnMath";
import { getEarnPreviewRows } from "./earnPreview";
import type { EarnPreviewRow } from "./earnPreview";
import type { SavingsAccountSnapshot, SavingsOutcomeFlowIntent } from "./earnTypes";
import type { EarnFlowState } from "./useEarnInteractionState";

export type EarnInteractionPreviewModel = {
	snapshot: SavingsAccountSnapshot;
	savedAfterRefresh: bigint;
	partialWithdrawAdjustTarget: bigint | undefined;
	isPartialWithdrawActive: boolean;
	isWithdrawAllPreviewActive: boolean;
	earnTargetChange: bigint;
	outcomeFlowIntent: SavingsOutcomeFlowIntent | null;
	previewFlowIntent: SavingsOutcomeFlowIntent | null;
	previewActionAmount: bigint;
	previewResultingBalance: bigint | undefined;
	withdrawAllPreview: { principal: bigint; totalReceived: bigint } | null;
	cardChangeForPreviewFallback: bigint;
	earnPreviewRows: EarnPreviewRow[];
	change: bigint;
	direction: boolean;
};

export function computeEarnInteractionPreview(params: {
	lockChainSelector: boolean;
	isLockedEarnFlow: boolean;
	isOnBehalf: boolean;
	legacyTargetAmount: bigint;
	snapshot: SavingsAccountSnapshot;
	flowState: EarnFlowState;
}): EarnInteractionPreviewModel {
	const {
		lockChainSelector,
		isLockedEarnFlow,
		isOnBehalf,
		legacyTargetAmount,
		snapshot,
		flowState,
	} = params;
	const { earnAction, collectAction, withdrawMode, depositAmount, withdrawAmount } = flowState;
	const { savingsBalance, readyInterest } = snapshot;

	const change = legacyTargetAmount - (savingsBalance + readyInterest);
	const direction = legacyTargetAmount >= savingsBalance + readyInterest;

	const {
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		isPartialWithdrawActive,
		isWithdrawAllPreviewActive,
		earnTargetSavingsAmount,
		earnTargetChange,
	} = getEarnPreviewDerivatives({
		snapshot,
		earnAction,
		collectAction,
		withdrawMode,
		depositAmount,
		withdrawAmount,
		isLockedEarnFlow,
		grossSavedPlusInterest: savingsBalance + readyInterest,
	});

	const outcomeFlowIntent: SavingsOutcomeFlowIntent | null = isOnBehalf
		? null
		: readyInterest > 0n && legacyTargetAmount === savingsBalance
			? "collect"
			: legacyTargetAmount > savingsBalance + readyInterest
				? "deposit"
				: legacyTargetAmount < savingsBalance + readyInterest
					? "withdraw"
					: null;

	const previewFlowIntent: SavingsOutcomeFlowIntent | null = isLockedEarnFlow
		? earnAction === "collect"
			? collectAction
			: earnAction === "withdraw"
				? isPartialWithdrawActive
					? "withdraw_partial"
					: withdrawMode === "all"
						? "withdraw_all"
						: "withdraw_partial"
				: earnAction
		: outcomeFlowIntent;

	const previewActionAmount =
		earnAction === "collect"
			? readyInterest
			: earnAction === "deposit"
				? depositAmount
				: isPartialWithdrawActive
					? withdrawAmount
					: withdrawMode === "all"
						? savedAfterRefresh
						: withdrawAmount;

	const previewResultingBalance = !isLockedEarnFlow
		? undefined
		: earnAction === "withdraw"
			? isPartialWithdrawActive
				? partialWithdrawAdjustTarget
				: withdrawMode !== "all"
					? undefined
					: 0n
			: earnTargetSavingsAmount;

	const withdrawAllPreview = isWithdrawAllPreviewActive
		? { principal: savingsBalance, totalReceived: savedAfterRefresh }
		: null;

	const cardChangeForPreviewFallback = isLockedEarnFlow ? earnTargetChange : change;

	const earnPreviewRows =
		lockChainSelector && !isOnBehalf && previewFlowIntent
			? getEarnPreviewRows({
					flowIntent: previewFlowIntent,
					actionAmount:
						previewActionAmount ??
						(previewFlowIntent === "deposit" ||
						previewFlowIntent === "withdraw" ||
						previewFlowIntent === "withdraw_partial"
							? cardChangeForPreviewFallback < 0n
								? -cardChangeForPreviewFallback
								: cardChangeForPreviewFallback
							: readyInterest),
					interest: readyInterest,
					referralFees: snapshot.referralFees,
					interestAlsoCollected: 0n,
					withdrawAllPreview,
			  })
			: [];

	return {
		snapshot,
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		isWithdrawAllPreviewActive,
		isPartialWithdrawActive,
		earnTargetChange,
		outcomeFlowIntent,
		previewFlowIntent,
		previewActionAmount,
		previewResultingBalance,
		withdrawAllPreview,
		cardChangeForPreviewFallback,
		earnPreviewRows,
		change,
		direction,
	};
}
