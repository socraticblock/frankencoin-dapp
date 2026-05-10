import { useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import type { CollectAction, EarnAction, EarnFormIntent, WithdrawMode } from "./earnTypes";

const MIN_DEPOSIT_AMOUNT = parseUnits("0.01", 18);

export type EarnFlowState = {
	earnAction: EarnAction;
	collectAction: CollectAction;
	depositAmount: bigint;
	withdrawAmount: bigint;
	withdrawMode: WithdrawMode;
	legacyTargetAmount: bigint;
};

export type EarnFlowActions = {
	handleEarnActionChange: (next: EarnAction) => void;
	setCollectAction: (next: CollectAction) => void;
	onChangeDepositAmount: (value: string) => void;
	onChangeWithdrawAmount: (value: string) => void;
	onChangeLegacyTargetAmount: (value: string) => void;
	setWithdrawMode: (mode: WithdrawMode) => void;
	setWithdrawAmount: (value: bigint) => void;
	setLegacyTargetAmount: (value: bigint) => void;
};

export function useEarnInteractionState(params: {
	earnFormIntent: EarnFormIntent;
	isLoaded: boolean;
	onConsumeEarnFormIntent?: () => void;
	lockChainSelector: boolean;
	onbehalfToggle: boolean;
	userBalance: bigint;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	resetKey: string;
}): {
	flowState: EarnFlowState;
	flowActions: EarnFlowActions;
} {
	const {
		earnFormIntent,
		isLoaded,
		onConsumeEarnFormIntent,
		lockChainSelector,
		onbehalfToggle,
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
		resetKey,
	} = params;

	const onConsumeRef = useRef(onConsumeEarnFormIntent);
	onConsumeRef.current = onConsumeEarnFormIntent;

	const [legacyTargetAmount, setLegacyTargetAmount] = useState(0n);
	const [earnAction, setEarnAction] = useState<EarnAction>("collect");
	const [collectAction, setCollectAction] = useState<CollectAction>("collect_wallet");
	const [depositAmount, setDepositAmount] = useState(0n);
	const [withdrawAmount, setWithdrawAmount] = useState(0n);
	const [withdrawMode, setWithdrawMode] = useState<WithdrawMode>("partial");

	useEffect(() => {
		setLegacyTargetAmount(0n);
		setEarnAction("collect");
		setCollectAction("collect_wallet");
		setDepositAmount(0n);
		setWithdrawAmount(0n);
		setWithdrawMode("partial");
	}, [resetKey]);

	const applyEarnActionAmounts = (next: EarnAction) => {
		if (next === "collect") {
			setCollectAction("collect_wallet");
			setLegacyTargetAmount(userSavingsBalance);
		} else if (next === "withdraw") {
			setWithdrawMode("partial");
			setWithdrawAmount(0n);
			setLegacyTargetAmount(0n);
		} else {
			setDepositAmount(0n);
			setLegacyTargetAmount(userSavingsBalance);
		}
	};

	const handleEarnActionChange = (next: EarnAction) => {
		setEarnAction(next);
		applyEarnActionAmounts(next);
	};

	useEffect(() => {
		if (earnAction === "withdraw" && withdrawAmount > 0n && withdrawMode !== "partial") {
			setWithdrawMode("partial");
		}
	}, [earnAction, withdrawAmount, withdrawMode]);

	useEffect(() => {
		if (!earnFormIntent || !isLoaded || onbehalfToggle) return;
		if (lockChainSelector) {
			setEarnAction(earnFormIntent);
			if (earnFormIntent === "collect") {
				setCollectAction("collect_wallet");
			} else if (earnFormIntent === "deposit") {
				setDepositAmount(0n);
			} else if (earnFormIntent === "withdraw") {
				setWithdrawMode("partial");
				setWithdrawAmount(0n);
			}
		}
		if (earnFormIntent === "collect") {
			setLegacyTargetAmount(userSavingsBalance);
		} else if (earnFormIntent === "deposit") {
			if (lockChainSelector) {
				setLegacyTargetAmount(userSavingsBalance);
			} else {
				const bump = userBalance > 0n ? (userBalance >= MIN_DEPOSIT_AMOUNT ? MIN_DEPOSIT_AMOUNT : userBalance) : 0n;
				const maxTarget = userSavingsBalance + userSavingsInterest + userBalance;
				const next = userSavingsBalance + userSavingsInterest + bump;
				setLegacyTargetAmount(
					next > maxTarget ? maxTarget : next > userSavingsBalance + userSavingsInterest ? next : userSavingsBalance + userSavingsInterest
				);
			}
		} else if (earnFormIntent === "withdraw") {
			setLegacyTargetAmount(0n);
		}
		onConsumeRef.current?.();
	}, [earnFormIntent, isLoaded, lockChainSelector, onbehalfToggle, userBalance, userSavingsBalance, userSavingsInterest]);

	return {
		flowState: {
			earnAction,
			collectAction,
			depositAmount,
			withdrawAmount,
			withdrawMode,
			legacyTargetAmount,
		},
		flowActions: {
			handleEarnActionChange,
			setCollectAction,
			onChangeDepositAmount: (value: string) => setDepositAmount(BigInt(value)),
			onChangeWithdrawAmount: (value: string) => {
				setWithdrawMode("partial");
				setWithdrawAmount(BigInt(value));
			},
			onChangeLegacyTargetAmount: (value: string) => setLegacyTargetAmount(BigInt(value)),
			setWithdrawMode,
			setWithdrawAmount,
			setLegacyTargetAmount,
		},
	};
}
