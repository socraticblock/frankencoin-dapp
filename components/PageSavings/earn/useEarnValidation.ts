import { useMemo } from "react";
import { SAVINGS_DATA_ERROR } from "./useSavingsAccountSnapshot";
import type { EarnAction } from "./earnTypes";

export function useEarnValidation(params: {
	loadError: string;
	isLockedEarnFlow: boolean;
	earnAction: EarnAction;
	depositAmount: bigint;
	withdrawAmount: bigint;
	userBalance: bigint;
	savedAfterRefresh: bigint;
	legacyTargetAmount: bigint;
	legacyAvailableAmount: bigint;
	onbehalfToggle: boolean;
	fromSymbol: string;
}): string {
	const {
		loadError,
		isLockedEarnFlow,
		earnAction,
		depositAmount,
		withdrawAmount,
		userBalance,
		savedAfterRefresh,
		legacyTargetAmount,
		legacyAvailableAmount,
		onbehalfToggle,
		fromSymbol,
	} = params;

	return useMemo(() => {
		if (loadError === SAVINGS_DATA_ERROR) return "";
		if (isLockedEarnFlow && earnAction === "deposit" && depositAmount > userBalance) {
			return `Not enough ${fromSymbol} in your wallet.`;
		}
		if (isLockedEarnFlow && earnAction === "withdraw" && withdrawAmount > savedAfterRefresh) {
			return "Amount exceeds available earning.";
		}
		if (!isLockedEarnFlow && legacyTargetAmount > userBalance + (!onbehalfToggle ? legacyAvailableAmount : 0n)) {
			return `Not enough ${fromSymbol} in your wallet.`;
		}
		return "";
	}, [
		depositAmount,
		earnAction,
		fromSymbol,
		isLockedEarnFlow,
		legacyAvailableAmount,
		legacyTargetAmount,
		loadError,
		onbehalfToggle,
		savedAfterRefresh,
		userBalance,
		withdrawAmount,
	]);
}
