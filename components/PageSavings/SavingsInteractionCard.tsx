import AppCard from "@components/AppCard";
import TokenInputChain from "@components/Input/TokenInputChain";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide } from "@frankencoin/zchf";
import { useConnection, useBlockNumber, useChainId } from "wagmi";
import { Address, isAddress, parseUnits, zeroAddress } from "viem";
import { useCallback, useEffect, useRef, useState } from "react";
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
import type { EarnAction, CollectAction, EarnFormIntent } from "./earn/earnTypes";
import { SAVINGS_DATA_ERROR, useSavingsAccountSnapshot } from "./earn/useSavingsAccountSnapshot";

export type { EarnFormIntent };

const MIN_DEPOSIT_AMOUNT = parseUnits("0.01", 18);

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
	const onConsumeRef = useRef(onConsumeEarnFormIntent);
	onConsumeRef.current = onConsumeEarnFormIntent;

	const { status } = useSelector((state: RootState) => state.savings.savingsInfo);
	const chainId = useChainId() as ChainId;
	const chain = getChain(chainId);
	const AppKitNetworkHook = useAppKitNetwork();

	const [amount, setAmount] = useState(0n);
	const [error, setError] = useState("");

	const [newReferrer, setNewReferrer] = useState<Address | undefined>(undefined);
	const [newReferralFeePPM, setNewReferralFeePPM] = useState(0n);
	const [onbehalfToggle, setOnbehalfToggle] = useState(false);
	const [onbehalfAddress, setOnbehalfAddress] = useState("");
	const [onbehalfError, setOnbehalfError] = useState("");
	const [earnAction, setEarnAction] = useState<EarnAction>("collect");
	const [collectAction, setCollectAction] = useState<CollectAction>("collect_wallet");
	const [depositAmount, setDepositAmount] = useState(0n);
	const [withdrawAmount, setWithdrawAmount] = useState(0n);
	const [withdrawMode, setWithdrawMode] = useState<"partial" | "all">("partial");

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

	const queryReferrer: Address = router.query.referrer as Address;
	const queryReferralFeePPM: string = router.query.referralFeePPM as string;

	const fromSymbol = "ZCHF";

	const onInitialSavingsBalance = useCallback((b: bigint) => setAmount(b), []);

	const { data: snapData, isLoaded, error: loadError, hasSavingsDataError } = useSavingsAccountSnapshot({
		account,
		chainId,
		frankencoinAddress,
		savingsAdresse,
		chainStatus,
		blockTag: blockNumberData,
		onInitialSavingsBalance,
	});

	const userBalance = snapData?.userBalance ?? 0n;
	const userSavingsBalance = snapData?.userSavingsBalance ?? 0n;
	const userSavingsInterest = snapData?.userSavingsInterest ?? 0n;
	const userSavingsLocktime = snapData?.userSavingsLocktime ?? 0n;
	const userSavingsReferrer = snapData?.userSavingsReferrer ?? zeroAddress;
	const userSavingsReferralFeePPM = snapData?.userSavingsReferralFeePPM ?? 0n;
	const userSavingsReferralFees = snapData?.userSavingsReferralFees ?? 0n;

	const hasActionableFunds = userBalance > 0n || userSavingsBalance > 0n || userSavingsInterest > 0n;
	const isSavingsDataReady = Boolean(chainStatus && isLoaded && loadError !== SAVINGS_DATA_ERROR);
	const isLockedEarnFlow = Boolean(lockChainSelector && !onbehalfToggle);
	const hasMeaningfulWalletZchf = userBalance >= MIN_DEPOSIT_AMOUNT;
	const depositBlockedByInterest = isLockedEarnFlow && earnAction === "deposit" && userSavingsInterest > 0n;

	const {
		savedAfterRefresh,
		partialWithdrawAdjustTarget,
		earnTargetChange,
		previewFlowIntent,
		previewResultingBalance,
		earnPreviewRows,
		change,
		direction,
	} = computeEarnInteractionPreview({
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
	});

	const applyEarnActionAmounts = (next: EarnAction) => {
		if (next === "collect") {
			setCollectAction("collect_wallet");
			setAmount(userSavingsBalance);
		} else if (next === "withdraw") {
			setWithdrawMode("partial");
			setWithdrawAmount(0n);
			setAmount(0n);
		} else {
			setDepositAmount(0n);
			setAmount(userSavingsBalance);
		}
	};

	const handleEarnActionChange = (next: EarnAction) => {
		setEarnAction(next);
		applyEarnActionAmounts(next);
	};

	useEffect(() => {
		if (queryReferrer != undefined && queryReferrer.length != 0) {
			if (isAddress(queryReferrer)) {
				setNewReferrer(queryReferrer);
			}
		}
		if (queryReferralFeePPM != undefined && queryReferralFeePPM.length != 0) {
			if (BigInt(queryReferralFeePPM) > 0n) {
				setNewReferralFeePPM(BigInt(queryReferralFeePPM));
			}
		}
	}, [queryReferrer, queryReferralFeePPM]);

	useEffect(() => {
		setAmount(0n);
		setError("");
		setNewReferrer(undefined);
		setNewReferralFeePPM(0n);
		setOnbehalfToggle(false);
		setOnbehalfAddress("");
		setOnbehalfError("");
		setEarnAction("collect");
		setCollectAction("collect_wallet");
		setDepositAmount(0n);
		setWithdrawAmount(0n);
		setWithdrawMode("partial");
	}, [account, chainId]);

	useEffect(() => {
		if (isAddress(onbehalfAddress) || onbehalfAddress == "") {
			setOnbehalfError("");
		} else {
			setOnbehalfError("Address is not valid.");
		}
	}, [onbehalfAddress]);

	useEffect(() => {
		if (loadError === SAVINGS_DATA_ERROR) return;
		if (isLockedEarnFlow && earnAction === "deposit" && depositAmount > userBalance) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else if (isLockedEarnFlow && earnAction === "withdraw" && withdrawAmount > savedAfterRefresh) {
			setError("Amount exceeds available earning.");
		} else if (!isLockedEarnFlow && amount > userBalance + (!onbehalfToggle ? userSavingsBalance + userSavingsInterest : 0n)) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else {
			setError("");
		}
	}, [
		amount,
		depositAmount,
		earnAction,
		loadError,
		isLockedEarnFlow,
		onbehalfToggle,
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
		savedAfterRefresh,
		withdrawAmount,
	]);

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
			setAmount(userSavingsBalance);
		} else if (earnFormIntent === "deposit") {
			if (lockChainSelector) {
				setAmount(userSavingsBalance);
			} else {
				const bump = userBalance > 0n ? (userBalance >= MIN_DEPOSIT_AMOUNT ? MIN_DEPOSIT_AMOUNT : userBalance) : 0n;
				const maxTarget = userSavingsBalance + userSavingsInterest + userBalance;
				const next = userSavingsBalance + userSavingsInterest + bump;
				setAmount(
					next > maxTarget ? maxTarget : next > userSavingsBalance + userSavingsInterest ? next : userSavingsBalance + userSavingsInterest
				);
			}
		} else if (earnFormIntent === "withdraw") {
			setAmount(0n);
		}
		onConsumeRef.current?.();
	}, [earnFormIntent, isLoaded, onbehalfToggle, userBalance, userSavingsBalance, userSavingsInterest, lockChainSelector]);

	const onChangeChain = (value: string) => {
		if (lockChainSelector) return;
		const net = WAGMI_CHAINS.find((c) => c.name == value) as AppKitNetwork;
		if (net != undefined) AppKitNetworkHook.switchNetwork(net);
	};

	const onChangeAmount = (value: string) => {
		setAmount(BigInt(value));
	};

	const onChangeDepositAmount = (value: string) => {
		setDepositAmount(BigInt(value));
	};

	const onChangeWithdrawAmount = (value: string) => {
		setWithdrawMode("partial");
		setWithdrawAmount(BigInt(value));
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
							<EarnActionTabs earnAction={earnAction} onChange={handleEarnActionChange} />
						) : null}

						{!onbehalfToggle && lockChainSelector ? (
							<EarnLockedFlowPanels
								earnAction={earnAction}
								onEarnActionChange={handleEarnActionChange}
								userSavingsBalance={userSavingsBalance}
								userSavingsInterest={userSavingsInterest}
								collectAction={collectAction}
								onCollectActionChange={setCollectAction}
								error={error}
								savingsAdresse={savingsAdresse}
								newReferrer={newReferrer}
								newReferralFeePPM={newReferralFeePPM}
								depositBlockedByInterest={depositBlockedByInterest}
								hasMeaningfulWalletZchf={hasMeaningfulWalletZchf}
								fromSymbol={fromSymbol}
								depositAmount={depositAmount}
								onDepositAmountChange={onChangeDepositAmount}
								hasSavingsDataError={hasSavingsDataError}
								userBalance={userBalance}
								onChangeChain={onChangeChain}
								lockChainSelector={lockChainSelector}
								withdrawMode={withdrawMode}
								setWithdrawMode={setWithdrawMode}
								setWithdrawAmount={setWithdrawAmount}
								withdrawAmount={withdrawAmount}
								onChangeWithdrawAmount={onChangeWithdrawAmount}
								savedAfterRefresh={savedAfterRefresh}
								onbehalfToggle={onbehalfToggle}
								onbehalfAddress={onbehalfAddress}
								onbehalfError={onbehalfError}
								setOnbehalfToggle={setOnbehalfToggle}
								setOnbehalfAddress={setOnbehalfAddress}
								partialWithdrawAdjustTarget={partialWithdrawAdjustTarget}
								chainName={chain.name}
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
									value={amount.toString()}
									onChange={onChangeAmount}
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
							onOnbehalfToggle={setOnbehalfToggle}
							onOnbehalfAddressChange={setOnbehalfAddress}
							hasActionableFunds={hasActionableFunds}
							error={error}
							depositBlockedByInterest={depositBlockedByInterest}
							hasMeaningfulWalletZchf={hasMeaningfulWalletZchf}
							depositAmount={depositAmount}
							savingsModule={savingsAdresse}
							newReferrer={newReferrer}
							newReferralFeePPM={newReferralFeePPM}
							amount={amount}
							userSavingsBalance={userSavingsBalance}
							userSavingsInterest={userSavingsInterest}
							change={change}
						/>
					</>
				) : null}
			</AppCard>

			{isSavingsDataReady && (onbehalfToggle || hasActionableFunds) ? (
				<EarnOutcomeAside
					showEarnPreview={Boolean(lockChainSelector && !onbehalfToggle)}
					earnPreviewRows={earnPreviewRows}
					previewResultingBalance={previewResultingBalance}
					earnPreviewHelperText={
						isLockedEarnFlow &&
						earnAction === "withdraw" &&
						withdrawMode === "partial" &&
						withdrawAmount === 0n
							? "Enter an amount to receive in wallet."
							: null
					}
					hideEarnResultingBalance={
						isLockedEarnFlow &&
						earnAction === "withdraw" &&
						withdrawMode === "partial" &&
						withdrawAmount === 0n
					}
					userSavingsBalance={userSavingsBalance}
					earnTargetChange={earnTargetChange}
					userSavingsInterest={userSavingsInterest}
					userSavingsReferrer={userSavingsReferrer}
					userSavingsReferralFeePPM={userSavingsReferralFeePPM}
					userSavingsReferralFees={userSavingsReferralFees}
					userSavingsLocktime={userSavingsLocktime}
					chain={chain}
					isLoaded={isLoaded}
					onbehalfToggle={onbehalfToggle}
					legacyChange={change}
					legacyDirection={direction}
					account={account}
					previewFlowIntent={previewFlowIntent}
				/>
			) : null}
		</section>
	);
}
