import AppCard from "@components/AppCard";
import TokenInputChain from "@components/Input/TokenInputChain";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide, FrankencoinABI, SavingsABI } from "@frankencoin/zchf";
import { useConnection, useBlockNumber, useChainId } from "wagmi";
import { Address, formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import { useEffect, useRef, useState } from "react";
import SavingsDetailsCard, { SavingsOutcomeFlowIntent } from "./SavingsDetailsCard";
import { readContract } from "wagmi/actions";
import { WAGMI_CHAINS, WAGMI_CONFIG } from "../../app.config";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import SavingsActionInterest from "./SavingsActionInterest";
import SavingsActionSave from "./SavingsActionSave";
import SavingsActionWithdraw from "./SavingsActionWithdraw";
import AppToggle from "@components/AppToggle";
import AddressInput from "@components/Input/AddressInput";
import SavingsActionSaveOnBehalf from "./SavingsActionSaveOnBehalf";
import { ContractUrl, formatCurrency, getChain, normalizeAddress, shortenAddress } from "@utils";
import { useRouter } from "next/router";
import AppLink from "@components/AppLink";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import AppChainBadge from "@components/AppChainBadge";

export type EarnFormIntent = "collect" | "deposit" | "withdraw" | null;
export type EarnAction = "collect" | "deposit" | "withdraw";
type CollectAction = "collect_wallet" | "compound";
type WithdrawMode = "partial" | "all";
const SAVINGS_DATA_ERROR = "Savings data could not be loaded for this chain.";
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
	const AppKitNetwork = useAppKitNetwork();

	const [amount, setAmount] = useState(0n);
	const [error, setError] = useState("");
	const [isLoaded, setLoaded] = useState<boolean>(false);

	const [userBalance, setUserBalance] = useState(0n);
	const [userSavingsBalance, setUserSavingsBalance] = useState(0n);
	const [userSavingsTicks, setUserSavingsTicks] = useState(0n);
	const [userSavingsInterest, setUserSavingsInterest] = useState(0n);
	const [userSavingsLocktime, setUserSavingsLocktime] = useState(0n);
	const [userSavingsReferrer, setUserSavingsReferrer] = useState<Address>(zeroAddress);
	const [userSavingsReferralFeePPM, setUserSavingsReferralFeePPM] = useState(0n);
	const [userSavingsReferralFees, setUserSavingsReferralFees] = useState(0n);
	const [newReferrer, setNewReferrer] = useState<Address | undefined>(undefined);
	const [newReferralFeePPM, setNewReferralFeePPM] = useState(0n);
	const [currentTicks, setCurrentTicks] = useState(0n);
	const [onbehalfToggle, setOnbehalfToggle] = useState(false);
	const [onbehalfAddress, setOnbehalfAddress] = useState("");
	const [onbehalfError, setOnbehalfError] = useState("");
	const [earnAction, setEarnAction] = useState<EarnAction>("collect");
	const [collectAction, setCollectAction] = useState<CollectAction>("collect_wallet");
	const [depositAmount, setDepositAmount] = useState(0n);
	const [withdrawAmount, setWithdrawAmount] = useState(0n);
	const [withdrawMode, setWithdrawMode] = useState<WithdrawMode>("partial");

	const frankencoinAddress =
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].frankencoin : ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin;
	const savingsAdresse = normalizeAddress(
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].savingsReferral : ADDRESS[chainId as ChainIdSide].ccipBridgedSavings
	);

	const chainStatus = status?.[chainId]?.[savingsAdresse];

	const { data } = useBlockNumber({ watch: true });
	const { address } = useConnection();
	const router = useRouter();

	const queryAddress: Address = normalizeAddress(String(router.query.address));
	const account = isAddress(queryAddress) ? queryAddress : address ?? zeroAddress;

	const queryReferrer: Address = router.query.referrer as Address;
	const queryReferralFeePPM: string = router.query.referralFeePPM as string;

	const fromSymbol = "ZCHF";
	const change: bigint = amount - (userSavingsBalance + userSavingsInterest);
	const direction: boolean = amount >= userSavingsBalance + userSavingsInterest;
	const hasActionableFunds = userBalance > 0n || userSavingsBalance > 0n || userSavingsInterest > 0n;
	const hasSavingsDataError = error === SAVINGS_DATA_ERROR;
	const isSavingsDataReady = Boolean(chainStatus && isLoaded && !hasSavingsDataError);
	const isLockedEarnFlow = lockChainSelector && !onbehalfToggle;
	const hasMeaningfulWalletZchf = userBalance >= MIN_DEPOSIT_AMOUNT;
	const depositBlockedByInterest = isLockedEarnFlow && earnAction === "deposit" && userSavingsInterest > 0n;
	/** On-chain `adjust` calls `refresh` first, compounding gross interest minus referral into `saved` before any withdraw. */
	const savedAfterRefresh = userSavingsBalance + userSavingsInterest - userSavingsReferralFees;
	const partialWithdrawAdjustTarget =
		earnAction === "withdraw" && withdrawAmount > 0n && savedAfterRefresh >= withdrawAmount
			? savedAfterRefresh - withdrawAmount
			: undefined;
	const isPartialWithdrawActive = earnAction === "withdraw" && withdrawAmount > 0n;
	const isWithdrawAllPreviewActive =
		isLockedEarnFlow && earnAction === "withdraw" && withdrawMode === "all" && withdrawAmount === 0n;
	const earnTargetSavingsAmount =
		earnAction === "collect"
			? collectAction === "compound"
				? userSavingsBalance + userSavingsInterest
				: userSavingsBalance
			: earnAction === "deposit"
				? userSavingsBalance + depositAmount
				: isPartialWithdrawActive
					? partialWithdrawAdjustTarget ?? userSavingsBalance
					: withdrawMode === "all"
						? 0n
						: userSavingsBalance;
	const isPartialWithdrawIdle =
		isLockedEarnFlow && earnAction === "withdraw" && withdrawMode !== "all" && withdrawAmount === 0n;
	const earnTargetChange = isPartialWithdrawIdle ? 0n : earnTargetSavingsAmount - (userSavingsBalance + userSavingsInterest);

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
	const withdrawAllPreview = isWithdrawAllPreviewActive ? { principal: userSavingsBalance, totalReceived: savedAfterRefresh } : null;

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
	// ---------------------------------------------------------------------------

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
		setLoaded(false);
		setAmount(0n);
		setError("");
		setUserBalance(0n);
		setUserSavingsBalance(0n);
		setUserSavingsTicks(0n);
		setUserSavingsInterest(0n);
		setUserSavingsLocktime(0n);
		setCurrentTicks(0n);
		setUserSavingsReferrer(zeroAddress);
		setUserSavingsReferralFeePPM(0n);
		setUserSavingsReferralFees(0n);
		setEarnAction("collect");
		setCollectAction("collect_wallet");
		setDepositAmount(0n);
		setWithdrawAmount(0n);
		setWithdrawMode("partial");
	}, [account, chainId]);

	useEffect(() => {
		if (!isAddress(account)) return;
		if (!chainStatus) return;

		let active = true;
		const shouldInitializeAmount = !isLoaded;

		const fetchAsync = async function () {
			try {
				const _balance = await readContract(WAGMI_CONFIG, {
					address: frankencoinAddress,
					chainId: chainId,
					abi: FrankencoinABI,
					functionName: "balanceOf",
					args: [account],
				});

				const [_userSavings, _userTicks, _referrer, _referralFeePPM] = await readContract(WAGMI_CONFIG, {
					address: savingsAdresse,
					chainId: chainId,
					abi: SavingsABI,
					functionName: "savings",
					args: [account],
				});

				const _current = await readContract(WAGMI_CONFIG, {
					address: savingsAdresse,
					chainId: chainId,
					abi: SavingsABI,
					functionName: "currentTicks",
				});

				const safeRate = BigInt(chainStatus.rate || 0);
				const _locktime = safeRate > 0n && _userTicks >= _current ? (_userTicks - _current) / safeRate : 0n;
				const _tickDiff = _current - _userTicks;
				const _interest =
					_userTicks == 0n || _locktime > 0
						? 0n
						: (_tickDiff * _userSavings) / (1_000_000n * 365n * 24n * 60n * 60n);
				const _fee = (_interest * BigInt(_referralFeePPM)) / 1_000_000n;

				if (!active) return;
				setUserBalance(_balance);
				setUserSavingsBalance(_userSavings);
				setUserSavingsTicks(_userTicks);
				setCurrentTicks(_current);
				setUserSavingsLocktime(_locktime);
				setUserSavingsInterest(_interest);
				setUserSavingsReferrer(_referrer);
				setUserSavingsReferralFeePPM(BigInt(_referralFeePPM));
				setUserSavingsReferralFees(_fee);
				if (shouldInitializeAmount) setAmount(_userSavings);
				setLoaded(true);
			} catch {
				if (!active) return;
				setError(SAVINGS_DATA_ERROR);
				setLoaded(true);
			}
		};

		fetchAsync();
		return () => {
			active = false;
		};
	}, [data, account, isLoaded, frankencoinAddress, savingsAdresse, chainStatus, chainId]);

	useEffect(() => {
		if (isAddress(onbehalfAddress) || onbehalfAddress == "") {
			setOnbehalfError("");
		} else {
			setOnbehalfError("Address is not valid.");
		}
	}, [onbehalfAddress]);

	useEffect(() => {
		if (error === SAVINGS_DATA_ERROR) return;
		if (isLockedEarnFlow && earnAction === "deposit" && depositAmount > userBalance) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else if (isLockedEarnFlow && earnAction === "withdraw" && withdrawAmount > userSavingsBalance) {
			setError("Not enough ZCHF in your earning balance.");
		} else if (!isLockedEarnFlow && amount > userBalance + (!onbehalfToggle ? userSavingsBalance + userSavingsInterest : 0n)) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else {
			setError("");
		}
	}, [
		amount,
		depositAmount,
		earnAction,
		error,
		isLockedEarnFlow,
		onbehalfToggle,
		userBalance,
		userSavingsBalance,
		userSavingsInterest,
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

	// ---------------------------------------------------------------------------

	const onChangeChain = (value: string) => {
		if (lockChainSelector) return;
		const chain = WAGMI_CHAINS.find((c) => c.name == value) as AppKitNetwork;
		if (chain != undefined) AppKitNetwork.switchNetwork(chain);
	};

	const onChangeAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setAmount(valueBigInt);
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
							<div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
								{(["collect", "deposit", "withdraw"] as const).map((tab) => (
									<button
										key={tab}
										type="button"
										onClick={() => handleEarnActionChange(tab)}
										className={`min-h-[44px] flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
											earnAction === tab
												? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
												: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
										}`}
									>
										{tab === "collect" ? "Collect" : tab === "deposit" ? "Deposit" : "Withdraw"}
									</button>
								))}
							</div>
						) : null}

						{!onbehalfToggle && lockChainSelector ? (
							earnAction === "collect" ? (
								<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 dark:border-menu-separator dark:bg-card-body-primary">
									{userSavingsInterest === 0n ? (
										<p className="text-sm text-text-secondary">No interest ready to collect.</p>
									) : (
										<>
											<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
												<span className="text-text-secondary">Interest ready</span>
												<span className="font-semibold tabular-nums text-text-primary">
													{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF
												</span>
											</div>
											<div className="grid gap-2 sm:grid-cols-2">
												<button
													type="button"
													onClick={() => setCollectAction("collect_wallet")}
													className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
														collectAction === "collect_wallet"
															? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
															: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
													}`}
												>
													Collect to wallet
												</button>
												<button
													type="button"
													onClick={() => setCollectAction("compound")}
													className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
														collectAction === "compound"
															? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
															: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
													}`}
												>
													Compound into earning
												</button>
											</div>
											<div className="pt-1">
												{collectAction === "compound" ? (
													<SavingsActionSave
														disabled={!!error}
														savingsModule={savingsAdresse}
														amount={userSavingsBalance + userSavingsInterest}
														interest={userSavingsInterest}
														newReferrer={newReferrer}
														newReferralFeePPM={newReferralFeePPM}
														buttonLabel="Compound interest"
													/>
												) : (
													<SavingsActionInterest
														disabled={!!error}
														savingsModule={savingsAdresse}
														balance={userSavingsBalance}
														interest={userSavingsInterest}
														newReferrer={newReferrer}
														newReferralFeePPM={newReferralFeePPM}
														buttonLabel="Collect to wallet"
													/>
												)}
											</div>
										</>
									)}
								</div>
							) : earnAction === "deposit" && userSavingsInterest > 0n ? (
								<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 text-sm dark:border-menu-separator dark:bg-card-body-primary">
									<p className="text-text-primary">
										{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF interest is ready. Collect it or compound it before
										depositing more ZCHF.
									</p>
									<button
										type="button"
										onClick={() => handleEarnActionChange("collect")}
										className="min-h-[44px] rounded-lg border border-[#c4a75f] bg-[#f4ead4]/90 px-4 py-2.5 font-medium text-text-primary transition hover:bg-[#ecdcbf] dark:border-[#8a7448] dark:bg-[#2a3244]"
									>
										Go to Collect
									</button>
								</div>
							) : earnAction === "deposit" && !hasMeaningfulWalletZchf ? (
								<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 text-sm dark:border-menu-separator dark:bg-card-body-primary">
									<p className="text-text-secondary">No wallet ZCHF available to deposit.</p>
								</div>
							) : earnAction === "withdraw" ? (
								<div className="mt-8 space-y-4">
									<div
										className="space-y-3"
										onMouseDown={() => setWithdrawMode("partial")}
										onFocusCapture={() => setWithdrawMode("partial")}
									>
										<TokenInputChain
											label="Amount from earning"
											chain={chain.name}
											min={BigInt("0")}
											max={userSavingsBalance}
											maxLabel="Max earning"
											reset={BigInt("0")}
											symbol={fromSymbol}
											placeholder={fromSymbol + " Amount"}
											value={withdrawAmount.toString()}
											onChange={onChangeWithdrawAmount}
											error={hasSavingsDataError ? "" : error}
											limit={userSavingsBalance}
											limitDigit={18}
											limitLabel="Earning"
											note={withdrawAmount === 0n ? "Enter an amount to withdraw from earning." : undefined}
											onChangeChain={onChangeChain}
											lockChainSelector={lockChainSelector}
											tokenLogo={"ZCHF"}
										/>
									</div>
									<div
										className="space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 dark:border-menu-separator dark:bg-card-body-primary"
										onMouseDown={() => setWithdrawMode("all")}
									>
										<div className="text-sm font-semibold text-text-primary">Withdraw all to wallet</div>
										<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
											<span className="text-text-secondary">Earning balance</span>
											<span className="font-semibold tabular-nums text-text-primary">
												{formatCurrency(formatUnits(userSavingsBalance, 18))} ZCHF
											</span>
										</div>
										<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
											<span className="text-text-secondary">Interest ready</span>
											<span className="font-semibold tabular-nums text-text-primary">
												{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF
											</span>
										</div>
										<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
											<span className="text-text-secondary">Total to receive</span>
											<span className="font-semibold tabular-nums text-text-primary">
												{formatCurrency(formatUnits(savedAfterRefresh, 18))} ZCHF
											</span>
										</div>
										<p className="text-xs text-text-secondary">
											Closes your earning position on {chain.name}. The savings module compounds ready interest into your balance
											before paying out; nothing stays earning after this action.
										</p>
										<SavingsActionWithdraw
											disabled={savedAfterRefresh === 0n || !!error}
											savingsModule={savingsAdresse}
											balance={0n}
											change={savedAfterRefresh}
											newReferrer={newReferrer}
											newReferralFeePPM={newReferralFeePPM}
											buttonLabel="Withdraw all to wallet"
										/>
									</div>
								</div>
							) : (
								<div className="mt-8 space-y-3">
									<TokenInputChain
										label="Amount to deposit"
										chain={chain.name}
										min={BigInt("0")}
										max={userBalance}
										reset={BigInt("0")}
										symbol={fromSymbol}
										placeholder={fromSymbol + " Amount"}
										value={depositAmount.toString()}
										onChange={onChangeDepositAmount}
										error={hasSavingsDataError ? "" : error}
										limit={userBalance}
										limitDigit={18}
										limitLabel="Wallet"
										onChangeChain={onChangeChain}
										lockChainSelector={lockChainSelector}
										tokenLogo={"ZCHF"}
									/>
								</div>
							)
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

						<div className="">
							{onbehalfToggle ? (
								<AddressInput
									label="To address"
									placeholder="0x1a2b3c..."
									error={onbehalfError}
									value={onbehalfAddress}
									onChange={setOnbehalfAddress}
								/>
							) : null}
							<AppToggle disabled={false} label="Custom target address" enabled={onbehalfToggle} onChange={setOnbehalfToggle} />
						</div>

						<div className="mx-auto my-4 w-full flex-col flex gap-4">
							{!onbehalfToggle && !hasActionableFunds ? (
								<div className="rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
									Add ZCHF on {chain.name} to start earning.
								</div>
							) : onbehalfToggle ? (
								<SavingsActionSaveOnBehalf
									disabled={onbehalfError != "" || onbehalfAddress == ""}
									savingsModule={savingsAdresse}
									amount={amount}
									onBehalf={onbehalfAddress as Address}
								/>
							) : lockChainSelector && earnAction === "collect" ? null : lockChainSelector && earnAction === "deposit" ? (
								<SavingsActionSave
									disabled={!!error || depositBlockedByInterest || !hasMeaningfulWalletZchf || depositAmount === 0n}
									savingsModule={savingsAdresse}
									amount={userSavingsBalance + depositAmount}
									interest={0n}
									newReferrer={newReferrer}
									newReferralFeePPM={newReferralFeePPM}
								/>
							) : lockChainSelector && earnAction === "withdraw" ? (
								<div onMouseDown={() => setWithdrawMode("partial")}>
								<SavingsActionWithdraw
									disabled={withdrawAmount === 0n || !!error || partialWithdrawAdjustTarget === undefined}
									savingsModule={savingsAdresse}
									balance={partialWithdrawAdjustTarget ?? 0n}
									change={withdrawAmount}
									newReferrer={newReferrer}
									newReferralFeePPM={newReferralFeePPM}
									buttonLabel="Withdraw ZCHF"
								/>
								</div>
							) : userSavingsInterest > 0 && amount == userSavingsBalance ? (
								<SavingsActionInterest
									disabled={!!error}
									savingsModule={savingsAdresse}
									balance={userSavingsBalance}
									interest={userSavingsInterest}
									newReferrer={newReferrer}
									newReferralFeePPM={newReferralFeePPM}
								/>
							) : amount > userSavingsBalance ? (
								<SavingsActionSave
									disabled={!!error}
									savingsModule={savingsAdresse}
									amount={amount}
									interest={userSavingsInterest}
									newReferrer={newReferrer}
									newReferralFeePPM={newReferralFeePPM}
								/>
							) : (
								<SavingsActionWithdraw
									disabled={userSavingsBalance == 0n || !!error}
									savingsModule={savingsAdresse}
									balance={amount}
									change={change}
									newReferrer={newReferrer}
									newReferralFeePPM={newReferralFeePPM}
								/>
							)}
						</div>

						{newReferrer ? (
							<div className="flex mt-8">
								<div className={`flex-1 text-text-secondary`}>
									<span className="font-semibold">Notice: </span>
									You are about to set a referrer{" "}
									<AppLink
										className="pr-2"
										label={shortenAddress(newReferrer)}
										href={ContractUrl(newReferrer, chain)}
										external={true}
									/>
									who will receive{" "}
									<span className="font-semibold">{Math.round(Number(newReferralFeePPM / 1000n)) / 10}%</span> of your
									earned interest.
								</div>
							</div>
						) : null}
					</>
				) : null}
			</AppCard>

			{isSavingsDataReady && (onbehalfToggle || hasActionableFunds) ? (
				<SavingsDetailsCard
					account={account}
					chain={chain}
					balance={userSavingsBalance}
					change={isLoaded && !onbehalfToggle ? (isLockedEarnFlow ? earnTargetChange : change) : 0n}
					direction={isLockedEarnFlow ? earnTargetChange >= 0n : direction}
					interest={isLoaded && !onbehalfToggle ? userSavingsInterest : 0n}
					locktime={userSavingsLocktime}
					referrer={userSavingsReferrer}
					referralFeePPM={userSavingsReferralFeePPM}
					referralFees={userSavingsReferralFees}
					flowIntent={previewFlowIntent}
					variant={lockChainSelector && !onbehalfToggle ? "earnTransaction" : "full"}
					actionAmount={previewActionAmount}
					resultingBalance={previewResultingBalance}
					withdrawAllPreview={withdrawAllPreview}
				/>
			) : null}
		</section>
	);
}
