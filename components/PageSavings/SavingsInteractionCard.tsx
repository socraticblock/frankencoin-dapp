import AppCard from "@components/AppCard";
import TokenInputChain from "@components/Input/TokenInputChain";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide } from "@frankencoin/zchf";
import { useConnection, useBlockNumber, useChainId } from "wagmi";
import { Address, isAddress, zeroAddress } from "viem";
import { useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import { getChain, normalizeAddress } from "@utils";
import { useRouter } from "next/router";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import AppChainBadge from "@components/AppChainBadge";
import { WAGMI_CHAINS } from "../../app.config";
import EarnActionTabs from "./earn/EarnActionTabs";
import EarnLockedFlowPanels from "./earn/EarnLockedFlowPanels";
import EarnPrimaryCardFooter from "./earn/EarnPrimaryCardFooter";
import EarnOutcomeAside from "./earn/EarnOutcomeAside";
import { computeEarnInteractionPreview } from "./earn/computeEarnInteractionPreview";
import type { EarnFormIntent } from "./earn/earnTypes";
import { SAVINGS_DATA_ERROR, useSavingsAccountSnapshot } from "./earn/useSavingsAccountSnapshot";
import { useEarnInteractionState } from "./earn/useEarnInteractionState";
import { useEarnCustomTargetState } from "./earn/useEarnCustomTargetState";
import { useEarnValidation } from "./earn/useEarnValidation";
import { getCompoundTarget, getDepositTarget } from "./earn/earnMath";

export type { EarnFormIntent };

type SavingsInteractionCardProps = {
	earnFormIntent?: EarnFormIntent;
	onConsumeEarnFormIntent?: () => void;
	lockChainSelector?: boolean;
};

export default function SavingsInteractionCard({
	earnFormIntent = null,
	onConsumeEarnFormIntent,
	lockChainSelector = false,
}: SavingsInteractionCardProps) {
	const { status } = useSelector((state: RootState) => state.savings.savingsInfo);
	const chainId = useChainId() as ChainId;
	const chain = getChain(chainId);
	const AppKitNetworkHook = useAppKitNetwork();

	const frankencoinAddress =
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].frankencoin : ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin;
	const savingsAdresse = normalizeAddress(
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].savingsReferral : ADDRESS[chainId as ChainIdSide].ccipBridgedSavings
	);

	const chainStatus = status?.[chainId]?.[savingsAdresse];

	const { data: blockNumberData } = useBlockNumber({ watch: true });
	const { address } = useConnection();
	const router = useRouter();

	const queryAddress: Address = normalizeAddress(String(router.query.address));
	const account = isAddress(queryAddress) ? queryAddress : address ?? zeroAddress;

	const fromSymbol = "ZCHF";
	const resetKey = `${account}:${chainId}`;
	const legacyInitRef = useRef<(value: bigint) => void>();

	const onInitialSavingsBalance = useCallback((value: bigint) => {
		legacyInitRef.current?.(value);
	}, []);

	const { data: snapData, isLoaded, error: loadError, hasSavingsDataError } = useSavingsAccountSnapshot({
		account,
		chainId,
		frankencoinAddress,
		savingsAdresse,
		chainStatus,
		refreshBlock: blockNumberData,
		onInitialSavingsBalance,
	});

	const userBalance = snapData?.userBalance ?? 0n;
	const userSavingsBalance = snapData?.userSavingsBalance ?? 0n;
	const userSavingsInterest = snapData?.userSavingsInterest ?? 0n;
	const userSavingsLocktime = snapData?.userSavingsLocktime ?? 0n;
	const userSavingsReferrer = snapData?.userSavingsReferrer ?? zeroAddress;
	const userSavingsReferralFeePPM = snapData?.userSavingsReferralFeePPM ?? 0n;
	const userSavingsReferralFees = snapData?.userSavingsReferralFees ?? 0n;

	const { customTargetState, customTargetActions } = useEarnCustomTargetState({
		resetKey,
	});
	const { onbehalfToggle, onbehalfAddress, onbehalfError } = customTargetState;

	const { flowState, flowActions } = useEarnInteractionState({
		earnFormIntent,
		isLoaded,
		onConsumeEarnFormIntent,
		lockChainSelector,
		onbehalfToggle,
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
		resetKey,
	});
	legacyInitRef.current = flowActions.setLegacyTargetAmount;
	const { earnAction, depositAmount, withdrawAmount, withdrawMode, legacyTargetAmount } = flowState;

	const hasActionableFunds = userBalance > 0n || userSavingsBalance > 0n || userSavingsInterest > 0n;
	const isSavingsDataReady = Boolean(chainStatus && isLoaded && loadError !== SAVINGS_DATA_ERROR);
	const isLockedEarnFlow = Boolean(lockChainSelector && !onbehalfToggle);
	const hasMeaningfulWalletZchf = userBalance >= 10_000_000_000_000_000n;
	const readyInterestWillBeAdded = isLockedEarnFlow && earnAction === "deposit" && userSavingsInterest > 0n;

	const previewModel = computeEarnInteractionPreview({
		lockChainSelector,
		isLockedEarnFlow,
		isOnBehalf: onbehalfToggle,
		legacyTargetAmount,
		snapshot: {
			walletBalance: userBalance,
			savingsBalance: userSavingsBalance,
			readyInterest: userSavingsInterest,
			referralFees: userSavingsReferralFees,
			locktime: userSavingsLocktime,
			referrer: userSavingsReferrer,
			referralFeePPM: userSavingsReferralFeePPM,
		},
		flowState,
	});

	const {
		snapshot,
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		earnTargetChange,
		previewFlowIntent,
		previewResultingBalance,
		earnPreviewRows,
		change,
		direction,
	} = previewModel;

	const error = useEarnValidation({
		loadError,
		isLockedEarnFlow,
		earnAction,
		depositAmount,
		withdrawAmount,
		userBalance,
		savedAfterRefresh,
		legacyTargetAmount,
		legacyAvailableAmount: userSavingsBalance + userSavingsInterest,
		onbehalfToggle,
		fromSymbol,
	});

	const hideEarnResultingBalance =
		isLockedEarnFlow && earnAction === "withdraw" && withdrawMode === "partial" && withdrawAmount === 0n;
	const earnPreviewResultingBalance = hideEarnResultingBalance ? 0n : previewResultingBalance;
	const earnPreviewModel =
		lockChainSelector && !onbehalfToggle && (hideEarnResultingBalance || earnPreviewResultingBalance !== undefined)
			? {
					rows: earnPreviewRows,
					resultingBalance: earnPreviewResultingBalance as bigint,
					helperText: hideEarnResultingBalance ? "Enter an amount to receive in wallet." : null,
					hideResultingBalance: hideEarnResultingBalance,
					balance: userSavingsBalance,
					referrer: userSavingsReferrer,
					referralFeePPM: userSavingsReferralFeePPM,
					referralFees: userSavingsReferralFees,
					locktime: userSavingsLocktime,
			  }
			: undefined;

	const onChangeChain = (value: string) => {
		if (lockChainSelector) return;
		const net = WAGMI_CHAINS.find((c) => c.name == value) as AppKitNetwork;
		if (net != undefined) AppKitNetworkHook.switchNetwork(net);
	};

	return (
		<section className={`mx-auto grid gap-4 ${lockChainSelector ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
			<AppCard>
				<div className="flex items-center justify-between gap-3">
					<div className="text-lg font-bold">{!onbehalfToggle ? "Earn with ZCHF" : "Save for another address"}</div>
					<AppChainBadge label={`Saving on ${chain.name}`} />
				</div>

				{!isSavingsDataReady ? (
					<div className="mt-8 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
						{hasSavingsDataError ? SAVINGS_DATA_ERROR : `Loading savings data for ${chain.name}…`}
					</div>
				) : null}

				{isSavingsDataReady ? (
					<>
						{lockChainSelector && !onbehalfToggle ? (
							<EarnActionTabs earnAction={earnAction} onChange={flowActions.handleEarnActionChange} />
						) : null}

						{!onbehalfToggle && lockChainSelector ? (
							<EarnLockedFlowPanels
								snapshot={{
									userBalance,
									userSavingsBalance,
									userSavingsInterest,
									existingReferralFees: userSavingsReferralFees,
									savedAfterRefresh,
									partialWithdrawAdjustTarget,
									compoundTargetAmount: getCompoundTarget(snapshot),
									netInterestAmount: getCompoundTarget(snapshot) - userSavingsBalance,
								}}
								flowState={flowState}
								flowActions={flowActions}
								txContext={{
									error,
									savingsModule: savingsAdresse,
									readyInterestWillBeAdded,
									hasMeaningfulWalletZchf,
									fromSymbol,
									hasSavingsDataError,
									onChangeChain,
									lockChainSelector,
									chainName: chain.name,
								}}
								customTarget={customTargetState}
								customTargetActions={customTargetActions}
							/>
						) : (
							<div className="mt-8">
								<TokenInputChain
									label={!onbehalfToggle ? "Your savings" : "You save"}
									chain={chain.name}
									min={!onbehalfToggle ? BigInt("0") : undefined}
									max={!onbehalfToggle ? userBalance + userSavingsBalance + userSavingsInterest : userBalance}
									reset={!onbehalfToggle ? userSavingsBalance : 0n}
									symbol={fromSymbol}
									placeholder={fromSymbol + " Amount"}
									value={legacyTargetAmount.toString()}
									onChange={flowActions.onChangeLegacyTargetAmount}
									error={hasSavingsDataError ? "" : error}
									limit={userBalance}
									limitDigit={18}
									limitLabel="Balance"
									onChangeChain={onChangeChain}
									lockChainSelector={lockChainSelector}
									tokenLogo={"ZCHF"}
								/>
							</div>
						)}

						<EarnPrimaryCardFooter
							lockChainSelector={lockChainSelector}
							earnAction={earnAction}
							chain={chain}
							onbehalfToggle={onbehalfToggle}
							onbehalfAddress={onbehalfAddress}
							onbehalfError={onbehalfError}
							onOnbehalfToggle={customTargetActions.setOnbehalfToggle}
							onOnbehalfAddressChange={customTargetActions.setOnbehalfAddress}
							hasActionableFunds={hasActionableFunds}
							error={error}
							depositTargetAmount={getDepositTarget(snapshot, depositAmount)}
							hasMeaningfulWalletZchf={hasMeaningfulWalletZchf}
							depositAmount={depositAmount}
							savingsModule={savingsAdresse}
							legacyTargetAmount={legacyTargetAmount}
							userSavingsBalance={userSavingsBalance}
							userSavingsInterest={userSavingsInterest}
							change={change}
						/>
					</>
				) : null}
			</AppCard>

			{isSavingsDataReady && (onbehalfToggle || hasActionableFunds) ? (
				<EarnOutcomeAside
					chain={chain}
					earnPreviewModel={earnPreviewModel}
					legacyPreviewModel={{
						account,
						balance: userSavingsBalance,
						change: isLoaded && !onbehalfToggle ? change : 0n,
						direction,
						interest: isLoaded && !onbehalfToggle ? userSavingsInterest : 0n,
						locktime: userSavingsLocktime,
						referrer: userSavingsReferrer,
						referralFeePPM: userSavingsReferralFeePPM,
						referralFees: userSavingsReferralFees,
						flowIntent: previewFlowIntent,
					}}
				/>
			) : null}
		</section>
	);
}
