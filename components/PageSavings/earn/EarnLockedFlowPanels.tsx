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
	existingReferralFees: bigint;
	savedAfterRefresh: bigint;
	partialWithdrawAdjustTarget: bigint | undefined;
	compoundTargetAmount: bigint;
	netInterestAmount: bigint;
};

export type EarnTxContext = {
	error: string;
	savingsModule: Address;
	readyInterestWillBeAdded: boolean;
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
	const {
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
		existingReferralFees,
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		compoundTargetAmount,
		netInterestAmount,
	} = snapshot;
	const { earnAction, collectAction, depositAmount, withdrawAmount, withdrawMode } = flowState;
	const {
		error,
		savingsModule,
		readyInterestWillBeAdded,
		hasMeaningfulWalletZchf,
		fromSymbol,
		hasSavingsDataError,
		onChangeChain,
		lockChainSelector,
		chainName,
	} = txContext;
	const { onbehalfToggle, onbehalfAddress, onbehalfError } = customTarget;
	const {
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
				netInterestAmount={netInterestAmount}
				collectAction={collectAction}
				onCollectActionChange={setCollectAction}
				error={!!error}
				savingsModule={savingsModule}
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
					/>
				}
				allPanel={
					<EarnWithdrawAllPanel
						userSavingsBalance={userSavingsBalance}
						userSavingsInterest={userSavingsInterest}
						existingReferralFees={existingReferralFees}
						savedAfterRefresh={savedAfterRefresh}
						chainName={chainName}
						onbehalfToggle={onbehalfToggle}
						onbehalfAddress={onbehalfAddress}
						onbehalfError={onbehalfError}
						onOnbehalfToggle={setOnbehalfToggle}
						onOnbehalfAddressChange={setOnbehalfAddress}
						errorLabel={error}
						savingsModule={savingsModule}
					/>
				}
			/>
		);
	}

	return (
		<EarnDepositPanel
			readyInterestWillBeAdded={readyInterestWillBeAdded}
			hasMeaningfulWalletZchf={hasMeaningfulWalletZchf}
			chainName={chainName}
			fromSymbol={fromSymbol}
			depositAmount={depositAmount}
			onDepositAmountChange={onChangeDepositAmount}
			errorLabel={error}
			hasSavingsDataError={hasSavingsDataError}
			userBalance={userBalance}
			onChangeChain={onChangeChain}
			lockChainSelector={lockChainSelector}
		/>
	);
}
