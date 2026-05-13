import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, maxUint256, erc20Abi, Address, parseEther, parseUnits, isAddress } from "viem";
import Head from "next/head";
import TokenInput from "@components/Input/TokenInput";
import { ContractUrl, formatBigInt, formatCurrency, formatDuration, normalizeAddress, shortenAddress } from "@utils";
import AppButton from "@components/AppButton";
import { useConnection, useBlockNumber } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { toast } from "react-toastify";
import { TxToast, renderErrorTxToast, renderErrorTxToastDecode } from "@components/TxToast";
import { WAGMI_CONFIG } from "../../../app.config";
import { useSelector } from "react-redux";
import { RootState, store } from "../../../redux/redux.store";
import { fetchPositionsList } from "../../../redux/slices/positions.slice";
import { PositionQuery } from "@frankencoin/api";
import { ADDRESS, PositionV1ABI, PositionV2ABI } from "@frankencoin/zchf";
import PositionRollerTable from "@components/PageMypositions/PositionRollerTable";
import AppCard from "@components/AppCard";
import AppLink from "@components/AppLink";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import MyPositionsNotFound from "@components/PageMypositions/MyPositionsNotFound";
import { mainnet } from "viem/chains";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import { generateExpirationCalendar, downloadCalendarFile, generateGoogleCalendarUrl } from "../../../utils/calendarGenerator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faCalendarPlus } from "@fortawesome/free-solid-svg-icons";
import { buildManageTarget, estimateRisk, getReserve } from "@components/PageMypositions/manage/managePositionMath";
import { ManageAction, RiskEstimate } from "@components/PageMypositions/manage/managePositionTypes";

const MANAGE_ACTIONS: { action: ManageAction; label: string; title: string; description: string; inputLabel?: string }[] = [
	{
		action: "addCollateral",
		label: "Add collateral",
		title: "Add collateral",
		description: "Add more collateral to improve the position's safety buffer. Your ZCHF repayment amount does not change.",
		inputLabel: "Collateral to add",
	},
	{
		action: "removeCollateral",
		label: "Remove collateral",
		title: "Remove collateral",
		description:
			"Withdraw collateral from this position. This reduces your safety buffer and can make the position easier to challenge.",
		inputLabel: "Collateral to remove",
	},
	{
		action: "borrowMore",
		label: "Borrow more",
		title: "Borrow more",
		description: "Increase this position's size and receive additional ZCHF, after reserve and upfront interest deductions.",
		inputLabel: "Increase total position size by",
	},
	{
		action: "repay",
		label: "Repay ZCHF",
		title: "Repay ZCHF",
		description:
			"Reduce the position size using ZCHF from your wallet. Retained reserves may reduce the amount you need to repay from wallet.",
		inputLabel: "Reduce position size by",
	},
	{
		action: "adjustSafety",
		label: "Adjust safety",
		title: "Adjust safety",
		description:
			"Change the liquidation / challenge price. Lowering it generally increases the safety buffer. Raising it can reduce the safety buffer and may trigger cooldown rules.",
		inputLabel: "New liquidation / challenge price",
	},
	{
		action: "close",
		label: "Close position",
		title: "Close position",
		description: "Repay the position and return collateral if the wallet has enough ZCHF.",
	},
];

export default function PositionAdjust() {
	const [isApproving, setApproving] = useState(false);
	const [isAdjusting, setAdjusting] = useState(false);
	const [selectedAction, setSelectedAction] = useState<ManageAction>("addCollateral");
	const [actionAmount, setActionAmount] = useState(0n);
	const [selectedPrice, setSelectedPrice] = useState(0n);

	const [challengeSize, setChallengeSize] = useState(0n);
	const [userCollAllowance, setUserCollAllowance] = useState(0n);
	const [userCollBalance, setUserCollBalance] = useState(0n);
	const [userFrancBalance, setUserFrancBalance] = useState(0n);

	const { data } = useBlockNumber({ watch: true });
	const account = useConnection();
	const router = useRouter();
	const chainId = mainnet.id;

	const addressQuery = typeof router.query.address === "string" ? router.query.address : undefined;
	const normalizedQuery = safeNormalizeAddress(addressQuery);
	const positions = useSelector((state: RootState) => state.positions.list.list);
	const positionsLoaded = useSelector((state: RootState) => state.positions.loaded);
	const matchedPosition = normalizedQuery
		? (positions.find((p) => safeNormalizeAddress(p.position) === normalizedQuery) as PositionQuery | undefined)
		: undefined;
	const prices = useSelector((state: RootState) => state.prices.coingecko);

	useEffect(() => {
		if (!positionsLoaded) store.dispatch(fetchPositionsList());
	}, [positionsLoaded]);

	useEffect(() => {
		if (matchedPosition) setSelectedPrice(BigInt(matchedPosition.price));
	}, [matchedPosition]);

	useEffect(() => {
		setActionAmount(0n);
		if (matchedPosition) setSelectedPrice(BigInt(matchedPosition.price));
	}, [selectedAction, matchedPosition]);

	useEffect(() => {
		const acc: Address | undefined = account.address;
		if (!matchedPosition || !matchedPosition.collateral) return;

		const fetchAsync = async function () {
			if (acc !== undefined) {
				const _balanceFranc = await readContract(WAGMI_CONFIG, {
					address: ADDRESS[mainnet.id].frankencoin,
					chainId,
					abi: erc20Abi,
					functionName: "balanceOf",
					args: [acc],
				});
				setUserFrancBalance(_balanceFranc);

				const _balanceColl = await readContract(WAGMI_CONFIG, {
					address: matchedPosition.collateral,
					chainId,
					abi: erc20Abi,
					functionName: "balanceOf",
					args: [acc],
				});
				setUserCollBalance(_balanceColl);

				const _allowanceColl = await readContract(WAGMI_CONFIG, {
					address: matchedPosition.collateral,
					chainId,
					abi: erc20Abi,
					functionName: "allowance",
					args: [acc, matchedPosition.position],
				});
				setUserCollAllowance(_allowanceColl);
			}

			const _balanceChallenge = await readContract(WAGMI_CONFIG, {
				address: matchedPosition.position,
				chainId,
				abi: matchedPosition.version === 1 ? PositionV1ABI : PositionV2ABI,
				functionName: "challengedAmount",
			});
			setChallengeSize(_balanceChallenge);
		};

		fetchAsync();
	}, [data, account.address, matchedPosition, chainId]);

	if (!router.isReady) return <AppCard>Loading position...</AppCard>;
	if (!normalizedQuery) return <AppCard>Invalid position address.</AppCard>;
	if (!positionsLoaded) return <AppCard>Loading position...</AppCard>;
	if (!matchedPosition) return <MyPositionsNotFound query={addressQuery ?? normalizedQuery} />;

	const position = matchedPosition;
	const currentMinted = BigInt(position.minted);
	const currentCollateral = BigInt(position.collateralBalance);
	const currentPrice = BigInt(position.price);
	const priceQuery = prices[normalizeAddress(position.collateral)];
	const marketPriceChf = priceQuery?.price.chf ?? null;
	const priceDecimals = 36 - position.collateralDecimals;
	const marketPrice80Pct =
		marketPriceChf != null ? parseUnits(String(Math.round(marketPriceChf * 80) / 100), priceDecimals) : currentPrice;
	const isCooldown = position.cooldown * 1000 - Date.now() > 0;
	const isMatured = position.expiration * 1000 < Date.now();
	const isChallenged = challengeSize > 0n;
	const isOwner = Boolean(account.address && safeNormalizeAddress(account.address) === safeNormalizeAddress(position.owner));
	const canManagePosition = Boolean(isOwner && account.address);

	const target = buildManageTarget({
		action: selectedAction,
		currentMinted,
		currentCollateral,
		currentPrice,
		actionAmount,
		selectedPrice,
	});
	const amount = target.targetMinted;
	const collateralAmount = target.targetCollateral;
	const liqPrice = target.targetPrice;
	const currentRisk = estimateRisk({
		minted: currentMinted,
		collateral: currentCollateral,
		collateralDecimals: position.collateralDecimals,
		marketPriceChf,
	});
	const targetRisk = estimateRisk({
		minted: amount,
		collateral: collateralAmount,
		collateralDecimals: position.collateralDecimals,
		marketPriceChf,
	});

	let maxMintableInclClones = 0n;
	if (position.version == 1) maxMintableInclClones = BigInt(position.availableForClones) + currentMinted;
	if (position.version == 2) maxMintableInclClones = BigInt(position.availableForMinting) + currentMinted;
	const maxTotalLimit = maxMintableInclClones;

	const feeDuration = BigInt(Math.floor(position.expiration * 1000 - Date.now())) / 1000n;
	const feePercent = (feeDuration * BigInt(position.annualInterestPPM)) / BigInt(60 * 60 * 24 * 365);
	const calcDirection = amount > currentMinted;
	const returnFromReserve = () => (BigInt(position.reserveContribution) * (amount - currentMinted)) / 1_000_000n;
	const paidOutAmount = () => {
		if (amount > currentMinted) {
			return ((amount - currentMinted) * (1_000_000n - BigInt(position.reserveContribution) - feePercent)) / 1_000_000n;
		}
		return amount - currentMinted - returnFromReserve();
	};
	const fees = calcDirection ? amount - currentMinted - returnFromReserve() - paidOutAmount() : 0n;

	function getCollateralError() {
		if (liqPrice > currentPrice && currentPrice * collateralAmount < amount * parseEther("1")) {
			return "This position is limited to the old challenge price. Add collateral or lower the target position size.";
		}
		if (liqPrice * collateralAmount < amount * 10n ** 18n) {
			return "This collateral and challenge price combination is not safe enough for the selected position size.";
		}
		if (collateralAmount > currentCollateral && collateralAmount - currentCollateral > userCollBalance) {
			return `Insufficient ${position.collateralSymbol} in this wallet.`;
		}
		return "";
	}

	function getAmountError() {
		if (selectedAction === "borrowMore" && isCooldown) return "This position is in cooldown. Borrowing more is not available yet.";
		if (amount > maxTotalLimit) return `This position cannot mint that much additional ZCHF.`;
		if (liqPrice * collateralAmount < amount * 10n ** 18n) {
			return `Can mint at most ${formatUnits(
				(collateralAmount * liqPrice) / 10n ** 36n,
				0
			)} ZCHF with this collateral and challenge price.`;
		}
		if (amount > currentMinted && liqPrice > currentPrice) {
			return "Additional borrowing is only available after the higher challenge price has gone through cooldown.";
		}
		if (liqPrice > currentPrice && currentPrice * collateralAmount < amount * parseEther("1")) {
			return "This position is limited to the old challenge price. Decrease the position size or add collateral.";
		}
		if (userFrancBalance + paidOutAmount() < 0n) return "Insufficient ZCHF in this wallet.";
		return "";
	}

	const actionConfig = MANAGE_ACTIONS.find((item) => item.action === selectedAction)!;
	const annualInterest = position.annualInterestPPM / 10_000;
	const expirationDateArr = new Date(position.expiration * 1000).toDateString().split(" ");
	const expirationDateStr = `${expirationDateArr[2]} ${expirationDateArr[1]} ${expirationDateArr[3]}`;
	const expirationDiff = Math.round((position.expiration * 1000 - Date.now()) / 1000);
	const expiredIn = expirationDiff > 0 ? formatDuration(expirationDiff) : "Expired";
	const noChange = amount === currentMinted && collateralAmount === currentCollateral && liqPrice === currentPrice;
	const needsCollateralApproval =
		selectedAction === "addCollateral" &&
		collateralAmount > currentCollateral &&
		collateralAmount - currentCollateral > userCollAllowance;
	const actionError = getActionError({
		action: selectedAction,
		actionAmount,
		accountAddress: account.address,
		isOwner,
		positionClosed: position.closed,
		isChallenged,
		isCooldown,
		noChange,
		amountError: getAmountError(),
		collateralError: getCollateralError(),
		userCollBalance,
		position,
		targetRisk,
		liqPrice,
		currentPrice,
		userFrancBalance,
		paidOut: paidOutAmount(),
	});
	const primaryDisabled = !canManagePosition || Boolean(actionError) || noChange || isApproving || isAdjusting;
	const currentReserve = getReserve(currentMinted, position.reserveContribution);
	const targetReserve = getReserve(amount, position.reserveContribution);
	const currentRepayFromWallet = currentMinted - currentReserve;
	const targetRepayFromWallet = amount - targetReserve;
	const challengeStatus = getChallengeStatus({ positionClosed: position.closed, isChallenged, isCooldown, isMatured });

	const handleApprove = async () => {
		try {
			setApproving(true);
			const approveWriteHash = await writeContract(WAGMI_CONFIG, {
				address: position.collateral as Address,
				chainId,
				abi: erc20Abi,
				functionName: "approve",
				args: [position.position, maxUint256],
			});
			const toastContent = [
				{ title: "Amount:", value: "infinite " + position.collateralSymbol },
				{ title: "Spender: ", value: shortenAddress(position.position) },
				{ title: "Transaction:", hash: approveWriteHash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: approveWriteHash, confirmations: 1 }), {
				pending: { render: <TxToast title={`Approving ${position.collateralSymbol}`} rows={toastContent} /> },
				success: { render: <TxToast title={`Successfully Approved ${position.collateralSymbol}`} rows={toastContent} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			setApproving(false);
		}
	};

	const handleAdjust = async () => {
		try {
			setAdjusting(true);
			const adjustWriteHash = await writeContract(WAGMI_CONFIG, {
				address: position.position,
				chainId,
				abi: position.version == 2 ? PositionV2ABI : PositionV1ABI,
				functionName: "adjust",
				args: [amount, collateralAmount, liqPrice],
			});
			const toastContent = [
				{ title: "Total position size:", value: formatBigInt(amount) },
				{ title: "Collateral Amount:", value: formatBigInt(collateralAmount, position.collateralDecimals) },
				{ title: "Liquidation Price:", value: formatBigInt(liqPrice, priceDecimals) },
				{ title: "Transaction:", hash: adjustWriteHash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: adjustWriteHash, confirmations: 1 }), {
				pending: { render: <TxToast title={`Managing Position`} rows={toastContent} /> },
				success: { render: <TxToast title="Successfully Managed Position" rows={toastContent} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToastDecode(error, position.version == 2 ? PositionV2ABI : PositionV1ABI, 2));
		} finally {
			setAdjusting(false);
		}
	};

	const handleDownloadCalendar = () => {
		const calendarContent = generateExpirationCalendar([position], account.address ?? "");
		downloadCalendarFile(calendarContent, `frankencoin-position-${position.position.slice(0, 8)}.ics`);
	};

	const handleGoogleCalendar = () => {
		const googleUrl = generateGoogleCalendarUrl(position);
		window.open(googleUrl, "_blank");
	};

	return (
		<>
			<Head>
				<title>Frankencoin - Manage Position</title>
			</Head>

			<AppPageHeader
				eyebrow="Portfolio"
				title={`Manage ${position.collateralSymbol} position`}
				description="Adjust collateral, repayment, and safety for this borrowing position."
				action={
					<div className="flex flex-wrap gap-4 text-sm">
						<AppLink label="Details" href={`/monitoring/${position.position}`} external={false} />
						<AppLink label="Contract" href={ContractUrl(position.position)} external={true} />
					</div>
				}
			>
				<div className="flex flex-wrap gap-2">
					<StatusBadge label={challengeStatus.label} tone={challengeStatus.tone} />
					<StatusBadge label={`V${position.version}`} tone="info" />
					{position.isClone ? <StatusBadge label="Clone" tone="neutral" /> : null}
				</div>
			</AppPageHeader>

			<div className="mt-6 space-y-6">
				{!canManagePosition ? (
					<AppNotice
						variant="neutral"
						title="Viewing public position"
						message={
							account.address
								? "Your connected wallet is not the owner of this position. You can review it, but only the owner can adjust collateral, borrow more, repay, or close it."
								: "Connect the owner wallet to manage this position."
						}
					/>
				) : null}

				<ManagePositionWarnings
					canManage={canManagePosition}
					isChallenged={isChallenged}
					isCooldown={isCooldown}
					isMatured={isMatured}
					isClosed={position.closed}
					selectedAction={selectedAction}
					targetRisk={targetRisk}
					liqPrice={liqPrice}
					currentPrice={currentPrice}
					collateralSymbol={position.collateralSymbol}
					userCollBalance={userCollBalance}
					userFrancBalance={userFrancBalance}
					paidOut={paidOutAmount()}
					marketPriceLoaded={marketPriceChf != null}
				/>

				<ManagePositionSummary
					position={position}
					currentMinted={currentMinted}
					currentCollateral={currentCollateral}
					currentReserve={currentReserve}
					currentRepayFromWallet={currentRepayFromWallet}
					currentPrice={currentPrice}
					priceDecimals={priceDecimals}
					risk={currentRisk}
					expirationDateStr={expirationDateStr}
					expiredIn={expiredIn}
					challengeStatus={challengeStatus.label}
				/>

				{canManagePosition ? (
					<section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
						<AppCard>
							<div className="space-y-5">
								<ManagePositionActionTabs selectedAction={selectedAction} onSelect={setSelectedAction} />
								<div>
									<h2 className="text-xl font-semibold text-text-primary">{actionConfig.title}</h2>
									<p className="mt-1 text-sm leading-6 text-text-secondary">{actionConfig.description}</p>
								</div>
								{selectedAction === "close" ? (
									<AppNotice
										variant="warning"
										title="Before you sign"
										message="This will try to repay the full position and return all deposited collateral to your wallet."
									/>
								) : selectedAction === "adjustSafety" ? (
									<TokenInput
										label={actionConfig.inputLabel}
										symbol="ZCHF"
										min={1n}
										max={marketPrice80Pct}
										reset={currentPrice}
										value={selectedPrice.toString()}
										digit={priceDecimals}
										onChange={(value) => setSelectedPrice(BigInt(value))}
										placeholder="Challenge price"
										warning={
											selectedPrice > currentPrice
												? "Raising the challenge price can reduce this position's safety buffer."
												: undefined
										}
									/>
								) : (
									<TokenInput
										label={actionConfig.inputLabel}
										symbol={
											selectedAction === "addCollateral" || selectedAction === "removeCollateral"
												? position.collateralSymbol
												: "ZCHF"
										}
										min={0n}
										max={getActionMax({
											action: selectedAction,
											userCollBalance,
											currentCollateral,
											currentMinted,
											maxTotalLimit,
										})}
										reset={0n}
										value={actionAmount.toString()}
										digit={
											selectedAction === "addCollateral" || selectedAction === "removeCollateral"
												? position.collateralDecimals
												: 18
										}
										onChange={(value) => setActionAmount(BigInt(value))}
										placeholder="0.00"
										limit={
											selectedAction === "addCollateral"
												? userCollBalance
												: selectedAction === "removeCollateral"
												? currentCollateral
												: selectedAction === "repay"
												? userFrancBalance
												: maxTotalLimit > currentMinted
												? maxTotalLimit - currentMinted
												: 0n
										}
										limitDigit={
											selectedAction === "addCollateral" || selectedAction === "removeCollateral"
												? position.collateralDecimals
												: 18
										}
										limitLabel={
											selectedAction === "addCollateral"
												? "Wallet"
												: selectedAction === "removeCollateral"
												? "Deposited"
												: selectedAction === "repay"
												? "Wallet"
												: "Available"
										}
									/>
								)}

								{actionAmount === 0n && selectedAction !== "adjustSafety" && selectedAction !== "close" ? (
									<p className="text-sm text-text-secondary">Enter an amount to preview the change.</p>
								) : null}

								<GuardSupportedChain chain={mainnet}>
									{needsCollateralApproval ? (
										<AppButton
											isLoading={isApproving}
											disabled={!account.address || isApproving}
											onClick={handleApprove}
										>
											Approve collateral
										</AppButton>
									) : (
										<AppButton
											disabled={primaryDisabled}
											isLoading={isAdjusting}
											onClick={handleAdjust}
											error={actionError || undefined}
										>
											{getButtonText(selectedAction)}
										</AppButton>
									)}
								</GuardSupportedChain>
							</div>
						</AppCard>

						<div className="space-y-4">
							<ManagePositionPreviewCard
								action={selectedAction}
								currentMinted={currentMinted}
								targetMinted={amount}
								currentCollateral={currentCollateral}
								targetCollateral={collateralAmount}
								currentPrice={currentPrice}
								targetPrice={liqPrice}
								currentRepayFromWallet={currentRepayFromWallet}
								targetRepayFromWallet={targetRepayFromWallet}
								currentReserve={currentReserve}
								targetReserve={targetReserve}
								fees={fees}
								paidOut={paidOutAmount()}
								risk={targetRisk}
								collateralSymbol={position.collateralSymbol}
								collateralDecimals={position.collateralDecimals}
								priceDecimals={priceDecimals}
								marketPriceLoaded={marketPriceChf != null}
							/>
							<ManagePositionWalletCard
								userFrancBalance={userFrancBalance}
								userCollBalance={userCollBalance}
								userCollAllowance={userCollAllowance}
								collateralSymbol={position.collateralSymbol}
								collateralDecimals={position.collateralDecimals}
								needsCollateralApproval={needsCollateralApproval}
							/>
						</div>
					</section>
				) : (
					<AppCard>
						<div className="space-y-2">
							<h2 className="text-xl font-semibold text-text-primary">Manage position</h2>
							<p className="text-sm text-text-secondary">
								{account.address
									? "Connect the owner wallet to manage this position. This connected wallet can review the public position details only."
									: "Connect the owner wallet to manage this position."}
							</p>
						</div>
					</AppCard>
				)}

				<AppCard>
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-lg font-semibold text-text-primary">Maturity reminders</h2>
							<p className="mt-1 text-sm text-text-secondary">
								Add this position&apos;s maturity date to your calendar so repayment does not surprise you.
							</p>
							<p className="mt-2 text-sm text-text-secondary">
								Maturity: <span className="font-medium text-text-primary">{expirationDateStr}</span> ({expiredIn})
							</p>
						</div>
						{!position.closed && !position.denied ? (
							<div className="flex flex-wrap gap-2">
								<button
									onClick={handleDownloadCalendar}
									className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-menu-separator dark:bg-card-content-secondary dark:text-text-primary"
								>
									<FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
									Download calendar file
								</button>
								<button
									onClick={handleGoogleCalendar}
									className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-menu-separator dark:bg-card-content-secondary dark:text-text-primary"
								>
									<FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
									Open in Google Calendar
								</button>
							</div>
						) : null}
					</div>
				</AppCard>

				{position.version == 1 || position.minted == "0" ? null : (
					<section className="space-y-4">
						<div>
							<h2 className="text-xl font-semibold text-text-primary">Renewal</h2>
							<p className="mt-1 text-sm text-text-secondary">
								You can renew positions by rolling them into suitable new ones with the same collateral.
							</p>
						</div>
						<PositionRollerTable position={position} challengeSize={challengeSize} />
					</section>
				)}
			</div>
		</>
	);
}

function ManagePositionActionTabs({
	selectedAction,
	onSelect,
}: {
	selectedAction: ManageAction;
	onSelect: (action: ManageAction) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
			{MANAGE_ACTIONS.map((item) => (
				<button
					key={item.action}
					type="button"
					onClick={() => onSelect(item.action)}
					className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
						selectedAction === item.action
							? "border-[#c4a75f] bg-button-default text-white"
							: "border-menu-separator bg-card-content-secondary text-text-primary hover:border-[#c4a75f]"
					}`}
				>
					{item.label}
				</button>
			))}
		</div>
	);
}

function ManagePositionSummary({
	position,
	currentMinted,
	currentCollateral,
	currentReserve,
	currentRepayFromWallet,
	currentPrice,
	priceDecimals,
	risk,
	expirationDateStr,
	expiredIn,
	challengeStatus,
}: {
	position: PositionQuery;
	currentMinted: bigint;
	currentCollateral: bigint;
	currentReserve: bigint;
	currentRepayFromWallet: bigint;
	currentPrice: bigint;
	priceDecimals: number;
	risk: RiskEstimate;
	expirationDateStr: string;
	expiredIn: string;
	challengeStatus: string;
}) {
	const rows = [
		{
			label: "Collateral deposited",
			value: `${formatCurrency(formatUnits(currentCollateral, position.collateralDecimals))} ${position.collateralSymbol}`,
		},
		{
			label: "Collateral value",
			value: risk.collateralValue === null ? "Unavailable" : `${formatCurrency(risk.collateralValue, 2, 2)} CHF estimated`,
		},
		{ label: "Total position size", value: `${formatCurrency(formatUnits(currentMinted, 18))} ZCHF` },
		{ label: "Retained reserve", value: `${formatCurrency(formatUnits(currentReserve, 18))} ZCHF` },
		{ label: "Repay from wallet", value: `${formatCurrency(formatUnits(currentRepayFromWallet, 18))} ZCHF` },
		{ label: "Liquidation / challenge price", value: `${formatCurrency(formatUnits(currentPrice, priceDecimals))} ZCHF` },
		{ label: "Estimated Loan-to-Value", value: formatRisk(risk.ltv) },
		{ label: "Estimated safety buffer", value: formatRisk(risk.safetyBuffer) },
		{ label: "Maturity", value: `${expirationDateStr} (${expiredIn})` },
		{ label: "Challenge status", value: challengeStatus },
	];

	return (
		<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{rows.map((row) => (
				<AppCard key={row.label} className="!p-4">
					<p className="text-xs uppercase text-text-secondary">{row.label}</p>
					<p className="mt-2 text-base font-semibold text-text-primary">{row.value}</p>
				</AppCard>
			))}
		</section>
	);
}

function ManagePositionPreviewCard(props: {
	action: ManageAction;
	currentMinted: bigint;
	targetMinted: bigint;
	currentCollateral: bigint;
	targetCollateral: bigint;
	currentPrice: bigint;
	targetPrice: bigint;
	currentRepayFromWallet: bigint;
	targetRepayFromWallet: bigint;
	currentReserve: bigint;
	targetReserve: bigint;
	fees: bigint;
	paidOut: bigint;
	risk: RiskEstimate;
	collateralSymbol: string;
	collateralDecimals: number;
	priceDecimals: number;
	marketPriceLoaded: boolean;
}) {
	const collateralDelta = props.targetCollateral - props.currentCollateral;
	const mintedDelta = props.targetMinted - props.currentMinted;
	const walletZchf = props.paidOut;
	const retainedImpact = props.targetReserve - props.currentReserve + props.fees;

	return (
		<AppCard>
			<h2 className="text-lg font-semibold text-text-primary">Before you sign</h2>
			<div className="mt-4 space-y-3">
				<PreviewRow label="Action" value={getActionLabel(props.action)} />
				<PreviewRow
					label="From wallet"
					value={formatFromWallet(props.action, walletZchf, collateralDelta, props.collateralSymbol, props.collateralDecimals)}
				/>
				<PreviewRow
					label="To wallet"
					value={formatToWallet(props.action, walletZchf, collateralDelta, props.collateralSymbol, props.collateralDecimals)}
				/>
				{mintedDelta > 0n ? (
					<PreviewRow label="Increase in position size" value={`+${formatCurrency(formatUnits(mintedDelta, 18))} ZCHF`} />
				) : null}
				{mintedDelta < 0n ? (
					<PreviewRow label="Position size reduction" value={`${formatCurrency(formatUnits(-mintedDelta, 18))} ZCHF`} />
				) : null}
				{props.action === "borrowMore" ? (
					<>
						<PreviewRow label="Estimated sent to wallet" value={`${formatCurrency(formatUnits(walletZchf, 18))} ZCHF`} />
						<PreviewRow
							label="Retained reserve / upfront interest"
							value={`${formatCurrency(formatUnits(retainedImpact, 18))} ZCHF`}
						/>
					</>
				) : null}
				<PreviewRow
					label="New total position size"
					value={withUnchanged(
						`${formatCurrency(formatUnits(props.targetMinted, 18))} ZCHF`,
						props.targetMinted === props.currentMinted
					)}
				/>
				<PreviewRow
					label="New repay from wallet"
					value={withUnchanged(
						`${formatCurrency(formatUnits(props.targetRepayFromWallet, 18))} ZCHF`,
						props.targetRepayFromWallet === props.currentRepayFromWallet
					)}
				/>
				<PreviewRow
					label="New collateral deposited"
					value={withUnchanged(
						`${formatCurrency(formatUnits(props.targetCollateral, props.collateralDecimals))} ${props.collateralSymbol}`,
						props.targetCollateral === props.currentCollateral
					)}
				/>
				<PreviewRow
					label="New liquidation / challenge price"
					value={withUnchanged(
						`${formatCurrency(formatUnits(props.targetPrice, props.priceDecimals))} ZCHF`,
						props.targetPrice === props.currentPrice
					)}
				/>
				<PreviewRow label="New estimated LTV" value={formatRisk(props.risk.ltv)} />
				<PreviewRow label="New estimated safety buffer" value={formatRisk(props.risk.safetyBuffer)} />
			</div>
			{!props.marketPriceLoaded ? (
				<p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
					LTV and safety buffer estimates are unavailable because market price data is not loaded.
				</p>
			) : null}
		</AppCard>
	);
}

function ManagePositionWalletCard({
	userFrancBalance,
	userCollBalance,
	userCollAllowance,
	collateralSymbol,
	collateralDecimals,
	needsCollateralApproval,
}: {
	userFrancBalance: bigint;
	userCollBalance: bigint;
	userCollAllowance: bigint;
	collateralSymbol: string;
	collateralDecimals: number;
	needsCollateralApproval: boolean;
}) {
	return (
		<AppCard>
			<h2 className="text-lg font-semibold text-text-primary">Wallet balances</h2>
			<div className="mt-4 space-y-3">
				<PreviewRow label="ZCHF" value={`${formatCurrency(formatUnits(userFrancBalance, 18))} ZCHF`} />
				<PreviewRow
					label={collateralSymbol}
					value={`${formatCurrency(formatUnits(userCollBalance, collateralDecimals))} ${collateralSymbol}`}
				/>
				<PreviewRow
					label="Collateral allowance"
					value={
						needsCollateralApproval
							? "Approval needed"
							: `${formatCurrency(formatUnits(userCollAllowance, collateralDecimals))} ${collateralSymbol}`
					}
				/>
			</div>
		</AppCard>
	);
}

function ManagePositionWarnings(props: {
	canManage: boolean;
	isChallenged: boolean;
	isCooldown: boolean;
	isMatured: boolean;
	isClosed: boolean;
	selectedAction: ManageAction;
	targetRisk: RiskEstimate;
	liqPrice: bigint;
	currentPrice: bigint;
	collateralSymbol: string;
	userCollBalance: bigint;
	userFrancBalance: bigint;
	paidOut: bigint;
	marketPriceLoaded: boolean;
}) {
	const warnings: { title: string; message: string }[] = [];
	if (props.isClosed) warnings.push({ title: "Challenge status", message: "This position is closed." });
	if (props.isChallenged) {
		warnings.push({
			title: "Challenge status",
			message:
				"This position is challenged. Market participants can challenge Frankencoin positions, so review it before the challenge period ends.",
		});
	}
	if (props.isCooldown) {
		warnings.push({
			title: "Cooldown",
			message: "This position is in cooldown. Borrowing more may be temporarily blocked. This is not the same as being challenged.",
		});
	}
	if (props.isMatured) warnings.push({ title: "Maturity", message: "This position has passed maturity. Repayment may be required." });
	if (props.canManage && props.selectedAction === "removeCollateral" && props.isChallenged) {
		warnings.push({ title: "Challenge status", message: "Collateral cannot be removed while this position is challenged." });
	}
	if (
		props.canManage &&
		props.selectedAction === "removeCollateral" &&
		props.targetRisk.safetyBuffer !== null &&
		props.targetRisk.safetyBuffer < 20
	) {
		warnings.push({
			title: "Estimated safety buffer",
			message: "This leaves a thin estimated safety buffer. The position may be easier to challenge.",
		});
	}
	if (props.canManage && props.selectedAction === "borrowMore") {
		warnings.push({
			title: "Before you sign",
			message: props.isCooldown
				? "Borrowing more is temporarily blocked while this position is in cooldown. The position is not necessarily challenged."
				: "Borrowing more increases your repayment obligation and can reduce your safety buffer.",
		});
	}
	if (props.canManage && props.selectedAction === "adjustSafety" && props.liqPrice > props.currentPrice) {
		warnings.push({
			title: "Cooldown",
			message:
				"Raising the liquidation / challenge price starts a cooldown. During cooldown, borrowing more is temporarily blocked. This is not the same as being challenged.",
		});
	}
	if (props.canManage && props.selectedAction === "adjustSafety" && props.liqPrice < props.currentPrice) {
		warnings.push({
			title: "Liquidation / challenge price",
			message: "Lowering the liquidation / challenge price generally gives the position more room before it can be challenged.",
		});
	}
	if (props.canManage && props.userCollBalance === 0n && props.selectedAction === "addCollateral") {
		warnings.push({
			title: "Wallet notice",
			message: `Your connected wallet has no ${props.collateralSymbol} available for adding collateral.`,
		});
	}
	if (
		props.canManage &&
		props.userFrancBalance + props.paidOut < 0n &&
		(props.selectedAction === "repay" || props.selectedAction === "close")
	) {
		warnings.push({ title: "Wallet notice", message: "You need more ZCHF in this wallet to complete this transaction." });
	}
	if (!props.marketPriceLoaded) {
		warnings.push({
			title: "Risk estimate",
			message: "Market price data is not loaded, so estimated Loan-to-Value and safety buffer are unavailable.",
		});
	}

	if (warnings.length === 0) return null;
	return (
		<div className="space-y-2">
			{warnings.map((warning) => (
				<AppNotice key={`${warning.title}-${warning.message}`} variant="warning" title={warning.title} message={warning.message} />
			))}
		</div>
	);
}

function PreviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex gap-3 text-sm">
			<div className="flex-1 text-text-secondary">{label}</div>
			<div className="max-w-[55%] text-right font-medium text-text-primary">{value}</div>
		</div>
	);
}

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }) {
	const classes = {
		success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
		warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
		danger: "bg-red-500/15 text-red-600 dark:text-red-300",
		neutral: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
		info: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
	}[tone];
	return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function getActionError(params: {
	action: ManageAction;
	actionAmount: bigint;
	accountAddress?: Address;
	isOwner: boolean;
	positionClosed: boolean;
	isChallenged: boolean;
	isCooldown: boolean;
	noChange: boolean;
	amountError: string;
	collateralError: string;
	userCollBalance: bigint;
	position: PositionQuery;
	targetRisk: RiskEstimate;
	liqPrice: bigint;
	currentPrice: bigint;
	userFrancBalance: bigint;
	paidOut: bigint;
}) {
	if (!params.accountAddress) return "Connect your wallet before signing.";
	if (!params.isOwner) return "Connect the owner wallet to manage this position.";
	if (params.positionClosed) return "This position is closed.";
	if (params.action === "removeCollateral" && params.isChallenged)
		return "Collateral cannot be removed while this position is challenged.";
	if (params.action === "borrowMore" && params.isCooldown)
		return "Borrowing more is temporarily blocked while this position is in cooldown. The position is not necessarily challenged.";
	if (params.action !== "close" && params.action !== "adjustSafety" && params.actionAmount <= 0n) return "";
	if (params.action === "adjustSafety" && params.liqPrice <= 0n) return "Enter a valid liquidation / challenge price.";
	if (params.action === "addCollateral" && params.actionAmount > params.userCollBalance) {
		return `Insufficient ${params.position.collateralSymbol} in this wallet.`;
	}
	if ((params.action === "repay" || params.action === "close") && params.userFrancBalance + params.paidOut < 0n) {
		return params.action === "close"
			? "You need more ZCHF in this wallet to close the position."
			: "Your wallet must hold enough ZCHF to complete this repayment.";
	}
	if (params.amountError) return params.amountError;
	if (params.collateralError) return params.collateralError;
	if (params.noChange) return "No changes selected.";
	return "";
}

function getActionMax(params: {
	action: ManageAction;
	userCollBalance: bigint;
	currentCollateral: bigint;
	currentMinted: bigint;
	maxTotalLimit: bigint;
}) {
	if (params.action === "addCollateral") return params.userCollBalance;
	if (params.action === "removeCollateral") return params.currentCollateral;
	if (params.action === "repay") return params.currentMinted;
	if (params.action === "borrowMore")
		return params.maxTotalLimit > params.currentMinted ? params.maxTotalLimit - params.currentMinted : 0n;
	return undefined;
}

function getButtonText(action: ManageAction) {
	if (action === "addCollateral") return "Add collateral";
	if (action === "removeCollateral") return "Remove collateral";
	if (action === "borrowMore") return "Borrow more";
	if (action === "repay") return "Repay ZCHF";
	if (action === "adjustSafety") return "Adjust safety";
	return "Close position";
}

function getActionLabel(action: ManageAction) {
	return MANAGE_ACTIONS.find((item) => item.action === action)?.label ?? "Manage";
}

function getChallengeStatus(params: { positionClosed: boolean; isChallenged: boolean; isCooldown: boolean; isMatured: boolean }) {
	if (params.positionClosed) return { label: "Closed", tone: "danger" as const };
	if (params.isChallenged) return { label: "Challenged", tone: "warning" as const };
	if (params.isCooldown) return { label: "Cooldown", tone: "warning" as const };
	if (params.isMatured) return { label: "Matured", tone: "warning" as const };
	return { label: "Healthy", tone: "success" as const };
}

function formatRisk(value: number | null) {
	if (value === null || !Number.isFinite(value)) return "Unavailable";
	return `${formatCurrency(value, 2, 2)}% estimated`;
}

function withUnchanged(value: string, unchanged: boolean) {
	return unchanged ? `${value} unchanged` : value;
}

function formatFromWallet(
	action: ManageAction,
	walletZchf: bigint,
	collateralDelta: bigint,
	collateralSymbol: string,
	collateralDecimals: number
) {
	if (collateralDelta > 0n) return `${formatCurrency(formatUnits(collateralDelta, collateralDecimals))} ${collateralSymbol}`;
	if (walletZchf < 0n) return `${formatCurrency(formatUnits(-walletZchf, 18))} ZCHF`;
	if (action === "close") return "ZCHF repayment";
	return "Nothing";
}

function formatToWallet(
	action: ManageAction,
	walletZchf: bigint,
	collateralDelta: bigint,
	collateralSymbol: string,
	collateralDecimals: number
) {
	if (collateralDelta < 0n) return `${formatCurrency(formatUnits(-collateralDelta, collateralDecimals))} ${collateralSymbol}`;
	if (walletZchf > 0n) return `${formatCurrency(formatUnits(walletZchf, 18))} ZCHF`;
	if (action === "close") return "Collateral returned after repayment";
	return "Nothing";
}

function safeNormalizeAddress(address?: string): Address | undefined {
	if (!address || !isAddress(address)) return undefined;
	try {
		return normalizeAddress(address);
	} catch {
		return undefined;
	}
}
