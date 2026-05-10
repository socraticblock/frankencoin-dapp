import EarnCollectPanel from "./EarnCollectPanel";
import EarnDepositPanel from "./EarnDepositPanel";
import EarnWithdrawPanel from "./EarnWithdrawPanel";
import EarnCustomWithdrawPanel from "./EarnCustomWithdrawPanel";
import EarnWithdrawAllPanel from "./EarnWithdrawAllPanel";
import type { Address } from "viem";
import type { EarnFlowActions, EarnFlowState } from "./useEarnInteractionState";
import type { EarnCustomTargetActions, EarnCustomTargetState } from "./useEarnCustomTargetState";

export type EarnSnapshotModel = {
	userBalance: bigint;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	savedAfterRefresh: bigint;
	partialWithdrawAdjustTarget: bigint | undefined;
	compoundTargetAmount: bigint;
};

export type EarnTxContext = {
	error: string;
	savingsModule: Address;
	newReferrer: Address | undefined;
	newReferralFeePPM: bigint;
	depositBlockedByInterest: boolean;
	hasMeaningfulWalletZchf: boolean;
	fromSymbol: string;
	hasSavingsDataError: boolean;
	onChangeChain: (value: string) => void;
	lockChainSelector: boolean;
	chainName: string;
};

export type EarnLockedFlowPanelsProps = {
	snapshot: EarnSnapshotModel;
	flowState: EarnFlowState;
	flowActions: EarnFlowActions;
	txContext: EarnTxContext;
	customTarget: EarnCustomTargetState;
	customTargetActions: EarnCustomTargetActions;
};

export default function EarnLockedFlowPanels({
	snapshot,
	flowState,
	flowActions,
	txContext,
	customTarget,
	customTargetActions,
}: EarnLockedFlowPanelsProps) {
	const { userBalance, userSavingsBalance, userSavingsInterest, savedAfterRefresh, partialWithdrawAdjustTarget, compoundTargetAmount } =
		snapshot;
	const { earnAction, collectAction, depositAmount, withdrawAmount, withdrawMode } = flowState;
	const {
		error,
		savingsModule,
		newReferrer,
		newReferralFeePPM,
		depositBlockedByInterest,
		hasMeaningfulWalletZchf,
		fromSymbol,
		hasSavingsDataError,
		onChangeChain,
		lockChainSelector,
		chainName,
	} = txContext;
	const { onbehalfToggle, onbehalfAddress, onbehalfError } = customTarget;
	const {
		handleEarnActionChange,
		setCollectAction,
		onChangeDepositAmount,
		onChangeWithdrawAmount,
		setWithdrawMode,
		setWithdrawAmount,
	} = flowActions;
	const { setOnbehalfToggle, setOnbehalfAddress } = customTargetActions;

	if (earnAction === "collect") {
		return (
			<EarnCollectPanel
				userSavingsBalance={userSavingsBalance}
				userSavingsInterest={userSavingsInterest}
				compoundTargetAmount={compoundTargetAmount}
				collectAction={collectAction}
				onCollectActionChange={setCollectAction}
				error={!!error}
				savingsModule={savingsModule}
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
						savingsModule={savingsModule}
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
						savingsModule={savingsModule}
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
			onDepositAmountChange={onChangeDepositAmount}
			errorLabel={error}
			hasSavingsDataError={hasSavingsDataError}
			userBalance={userBalance}
			onChangeChain={onChangeChain}
			lockChainSelector={lockChainSelector}
			onGoToCollect={() => handleEarnActionChange("collect")}
		/>
	);
}
