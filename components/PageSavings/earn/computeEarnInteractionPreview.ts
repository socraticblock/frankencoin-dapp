import { getEarnPreviewDerivatives } from "./earnMath";
import { getEarnPreviewRows } from "./earnPreview";
import type { EarnPreviewRow } from "./earnPreview";
import type {
	CollectAction,
	EarnAction,
	SavingsAccountSnapshot,
	SavingsOutcomeFlowIntent,
} from "./earnTypes";

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
	amount: bigint;
	userBalance: bigint;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	userSavingsLocktime: bigint;
	userSavingsReferrer: SavingsAccountSnapshot["referrer"];
	userSavingsReferralFeePPM: bigint;
	userSavingsReferralFees: bigint;
	lockChainSelector: boolean;
	onbehalfToggle: boolean;
	earnAction: EarnAction;
	collectAction: CollectAction;
	withdrawMode: "partial" | "all";
	depositAmount: bigint;
	withdrawAmount: bigint;
}): EarnInteractionPreviewModel {
	const {
		amount,
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
		userSavingsLocktime,
		userSavingsReferrer,
		userSavingsReferralFeePPM,
		userSavingsReferralFees,
		lockChainSelector,
		onbehalfToggle,
		earnAction,
		collectAction,
		withdrawMode,
		depositAmount,
		withdrawAmount,
	} = params;

	const change = amount - (userSavingsBalance + userSavingsInterest);
	const direction = amount >= userSavingsBalance + userSavingsInterest;
	const isLockedEarnFlow = Boolean(lockChainSelector && !onbehalfToggle);

	const snapshot: SavingsAccountSnapshot = {
		walletBalance: userBalance,
		savingsBalance: userSavingsBalance,
		readyInterest: userSavingsInterest,
		referralFees: userSavingsReferralFees,
		locktime: userSavingsLocktime,
		referrer: userSavingsReferrer,
		referralFeePPM: userSavingsReferralFeePPM,
	};

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
		grossSavedPlusInterest: userSavingsBalance + userSavingsInterest,
	});

	const outcomeFlowIntent: SavingsOutcomeFlowIntent | null = onbehalfToggle
		? null
		: userSavingsInterest > 0n && amount === userSavingsBalance
			? "collect"
			: amount > userSavingsBalance + userSavingsInterest
				? "deposit"
				: amount < userSavingsBalance + userSavingsInterest
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
			? userSavingsInterest
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
		? { principal: userSavingsBalance, totalReceived: savedAfterRefresh }
		: null;

	const cardChangeForPreviewFallback = isLockedEarnFlow ? earnTargetChange : change;

	const earnPreviewRows =
		lockChainSelector && !onbehalfToggle && previewFlowIntent
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
							: userSavingsInterest),
					interest: userSavingsInterest,
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
