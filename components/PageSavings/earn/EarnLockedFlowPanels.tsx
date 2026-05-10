import EarnCollectPanel from "./EarnCollectPanel";
import EarnDepositPanel from "./EarnDepositPanel";
import EarnWithdrawPanel from "./EarnWithdrawPanel";
import EarnCustomWithdrawPanel from "./EarnCustomWithdrawPanel";
import EarnWithdrawAllPanel from "./EarnWithdrawAllPanel";
import type { Address } from "viem";
import type { CollectAction, EarnAction } from "./earnTypes";

export type EarnLockedFlowPanelsProps = {
	earnAction: EarnAction;
	onEarnActionChange: (next: EarnAction) => void;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	collectAction: CollectAction;
	onCollectActionChange: (next: CollectAction) => void;
	error: string;
	savingsAdresse: Address;
	newReferrer: Address | undefined;
	newReferralFeePPM: bigint;
	depositBlockedByInterest: boolean;
	hasMeaningfulWalletZchf: boolean;
	fromSymbol: string;
	depositAmount: bigint;
	onDepositAmountChange: (value: string) => void;
	hasSavingsDataError: boolean;
	userBalance: bigint;
	onChangeChain: (value: string) => void;
	lockChainSelector: boolean;
	withdrawMode: "partial" | "all";
	setWithdrawMode: (m: "partial" | "all") => void;
	setWithdrawAmount: (v: bigint) => void;
	withdrawAmount: bigint;
	onChangeWithdrawAmount: (value: string) => void;
	savedAfterRefresh: bigint;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
	setOnbehalfToggle: (v: boolean) => void;
	setOnbehalfAddress: (v: string) => void;
	partialWithdrawAdjustTarget: bigint | undefined;
	chainName: string;
};

export default function EarnLockedFlowPanels({
	earnAction,
	onEarnActionChange,
	userSavingsBalance,
	userSavingsInterest,
	collectAction,
	onCollectActionChange,
	error,
	savingsAdresse,
	newReferrer,
	newReferralFeePPM,
	depositBlockedByInterest,
	hasMeaningfulWalletZchf,
	fromSymbol,
	depositAmount,
	onDepositAmountChange,
	hasSavingsDataError,
	userBalance,
	onChangeChain,
	lockChainSelector,
	withdrawMode,
	setWithdrawMode,
	setWithdrawAmount,
	withdrawAmount,
	onChangeWithdrawAmount,
	savedAfterRefresh,
	onbehalfToggle,
	onbehalfAddress,
	onbehalfError,
	setOnbehalfToggle,
	setOnbehalfAddress,
	partialWithdrawAdjustTarget,
	chainName,
}: EarnLockedFlowPanelsProps) {
	if (earnAction === "collect") {
		return (
			<EarnCollectPanel
				userSavingsBalance={userSavingsBalance}
				userSavingsInterest={userSavingsInterest}
				collectAction={collectAction}
				onCollectActionChange={onCollectActionChange}
				error={!!error}
				savingsModule={savingsAdresse}
				newReferrer={newReferrer}
				newReferralFeePPM={newReferralFeePPM}
			/>
		);
	}

	if (earnAction === "withdraw") {
		return (
			<EarnWithdrawPanel
				withdrawMode={withdrawMode}
				onWithdrawModePartial={() => setWithdrawMode("partial")}
				onWithdrawModeAll={() => {
					setWithdrawMode("all");
					setWithdrawAmount(0n);
				}}
				customPanel={
					<EarnCustomWithdrawPanel
						chainName={chainName}
						fromSymbol={fromSymbol}
						withdrawAmount={withdrawAmount}
						onChangeWithdrawAmount={onChangeWithdrawAmount}
						errorLabel={error}
						hasSavingsDataError={hasSavingsDataError}
						savedAfterRefresh={savedAfterRefresh}
						onChangeChain={onChangeChain}
						lockChainSelector={lockChainSelector}
						onbehalfToggle={onbehalfToggle}
						onbehalfAddress={onbehalfAddress}
						onbehalfError={onbehalfError}
						onOnbehalfToggle={setOnbehalfToggle}
						onOnbehalfAddressChange={setOnbehalfAddress}
						partialWithdrawAdjustTarget={partialWithdrawAdjustTarget}
						savingsModule={savingsAdresse}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				}
				allPanel={
					<EarnWithdrawAllPanel
						userSavingsBalance={userSavingsBalance}
						userSavingsInterest={userSavingsInterest}
						savedAfterRefresh={savedAfterRefresh}
						chainName={chainName}
						onbehalfToggle={onbehalfToggle}
						onbehalfAddress={onbehalfAddress}
						onbehalfError={onbehalfError}
						onOnbehalfToggle={setOnbehalfToggle}
						onOnbehalfAddressChange={setOnbehalfAddress}
						errorLabel={error}
						savingsModule={savingsAdresse}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				}
			/>
		);
	}

	return (
		<EarnDepositPanel
			blockedByInterest={depositBlockedByInterest}
			hasMeaningfulWalletZchf={hasMeaningfulWalletZchf}
			userSavingsInterest={userSavingsInterest}
			chainName={chainName}
			fromSymbol={fromSymbol}
			depositAmount={depositAmount}
			onDepositAmountChange={onDepositAmountChange}
			errorLabel={error}
			hasSavingsDataError={hasSavingsDataError}
			userBalance={userBalance}
			onChangeChain={onChangeChain}
			lockChainSelector={lockChainSelector}
			onGoToCollect={() => onEarnActionChange("collect")}
		/>
	);
}
