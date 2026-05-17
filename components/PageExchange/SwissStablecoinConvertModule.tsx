import AppButton from "@components/AppButton";
import AppLink from "@components/AppLink";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import TokenInput from "@components/Input/TokenInput";
import { TxToast, renderErrorTxToast } from "@components/TxToast";
import { useContractUrl, useSwapCHFAUStats, useSwapVCHFStats, type SwapVCHFStatsReturn } from "@hooks";
import { formatBigInt, shortenAddress } from "@utils";
import { FrankencoinABI } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import { erc20Abi } from "viem";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../../app.config";

type ConvertAssetId = "vchf" | "chfau";
type ConvertDirection = "stablecoin-to-zchf" | "zchf-to-stablecoin";

type ConvertAssetConfig = {
	id: ConvertAssetId;
	symbol: string;
	name: string;
	decimals: number;
	enabled: boolean;
	comingSoon?: boolean;
};

const CONVERT_ASSETS: ConvertAssetConfig[] = [
	{
		id: "vchf",
		symbol: "VCHF",
		name: "VNX Swiss Franc",
		decimals: 18,
		enabled: true,
	},
	{
		id: "chfau",
		symbol: "CHFAU",
		name: "AllUnity Swiss Franc Stablecoin",
		decimals: 6,
		enabled: false,
		comingSoon: true,
	},
];

function minBigInt(...values: bigint[]) {
	return values.reduce((min, value) => (value < min ? value : min));
}

function convertAmountDecimals(amount: bigint, fromDecimals: number, toDecimals: number) {
	const decimalDiff = toDecimals - fromDecimals;
	if (decimalDiff > 0) return amount * 10n ** BigInt(decimalDiff);
	if (decimalDiff < 0) return amount / 10n ** BigInt(-decimalDiff);
	return amount;
}

function formatDate(seconds: bigint) {
	if (seconds === 0n) return "Unavailable";
	const date = new Date(Number(seconds * 1000n));
	if (Number.isNaN(date.getTime())) return "Unavailable";
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-menu-separator py-2 last:border-b-0">
			<span className="text-sm text-text-secondary">{label}</span>
			<span className="text-right text-sm font-semibold text-text-primary">{value}</span>
		</div>
	);
}

function AssetButton({
	asset,
	active,
	onClick,
}: {
	asset: ConvertAssetConfig;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={!asset.enabled}
			onClick={onClick}
			className={`rounded-xl border px-4 py-3 text-left transition ${
				active
					? "border-[#c4a75f] bg-button-default text-white"
					: asset.enabled
					? "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
					: "cursor-not-allowed border-[#e0d4bd] bg-card-content-secondary text-text-secondary opacity-80 dark:border-menu-separator"
			}`}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="font-semibold">{asset.symbol}</span>
				{asset.comingSoon ? (
					<span className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-white/15 text-white" : "bg-amber-500/15 text-amber-700 dark:text-amber-200"}`}>
						Under review
					</span>
				) : null}
			</div>
			<p className={`mt-1 text-sm ${active ? "text-white/80" : "text-text-secondary"}`}>{asset.name}</p>
		</button>
	);
}

export default function SwissStablecoinConvertModule() {
	const [selectedAssetId, setSelectedAssetId] = useState<ConvertAssetId>("vchf");
	const [direction, setDirection] = useState<ConvertDirection>("stablecoin-to-zchf");
	const [amount, setAmount] = useState(0n);
	const [isMinter, setMinter] = useState<bigint>(0n);
	const [isApproving, setApproving] = useState(false);
	const [isConverting, setConverting] = useState(false);

	const vchfStats = useSwapVCHFStats();
	const chfauStats = useSwapCHFAUStats();
	const selectedAsset = CONVERT_ASSETS.find((asset) => asset.id === selectedAssetId) ?? CONVERT_ASSETS[0];
	const stats: SwapVCHFStatsReturn = selectedAssetId === "chfau" ? chfauStats : vchfStats;
	const moduleUrl = useContractUrl(stats.bridgeAddress);

	const activeMinter = isMinter > 0 && isMinter * 1000n <= Date.now();
	const isStablecoinToZchf = direction === "stablecoin-to-zchf";
	const fromSymbol = isStablecoinToZchf ? selectedAsset.symbol : "ZCHF";
	const toSymbol = isStablecoinToZchf ? "ZCHF" : selectedAsset.symbol;
	const fromDecimals = isStablecoinToZchf ? selectedAsset.decimals : 18;
	const toDecimals = isStablecoinToZchf ? 18 : selectedAsset.decimals;
	const toAmount = convertAmountDecimals(amount, fromDecimals, toDecimals);

	const availableMintZchf = stats.bridgeLimit > stats.bridgeMinted ? stats.bridgeLimit - stats.bridgeMinted : 0n;
	const availableMintFromToken = convertAmountDecimals(availableMintZchf, 18, selectedAsset.decimals);
	const moduleBalanceAsZchf = convertAmountDecimals(stats.otherBridgeBal, selectedAsset.decimals, 18);
	const availableReturnZchf = minBigInt(stats.bridgeMinted, moduleBalanceAsZchf);
	const fromBalance = isStablecoinToZchf ? stats.otherUserBal : stats.zchfUserBal;
	const moduleCapacity = isStablecoinToZchf ? availableMintFromToken : availableReturnZchf;
	const maxAmount = minBigInt(fromBalance, moduleCapacity);
	const hasAllowance = !isStablecoinToZchf || stats.otherUserAllowance >= amount;
	const moduleExpired = stats.bridgeHorizon > 0n && stats.bridgeHorizon * 1000n < BigInt(Date.now());
	const isDisabledAsset = !selectedAsset.enabled;

	const statusLabel = !activeMinter ? "Not active" : moduleExpired ? (isStablecoinToZchf ? "Expired for minting" : "Redeem only") : "Active";
	const statusHelper =
		moduleExpired && !isStablecoinToZchf
			? "This module no longer mints new ZCHF, but ZCHF can still be converted back while module backing is available."
			: "";
	const capacityLabel = isStablecoinToZchf ? "Available to convert" : "Available to redeem";
	const capacityValue = `${formatBigInt(moduleCapacity, fromDecimals, 6)} ${fromSymbol}`;
	const backingLabel = isStablecoinToZchf ? "Mint capacity remaining" : "Module backing available";
	const backingValue = isStablecoinToZchf
		? `${formatBigInt(availableMintZchf, 18, 6)} ZCHF`
		: `${formatBigInt(convertAmountDecimals(moduleCapacity, 18, selectedAsset.decimals), selectedAsset.decimals, 6)} ${selectedAsset.symbol}`;
	const amountError = useMemo(() => {
		if (isDisabledAsset) return `${selectedAsset.symbol} conversion is under review.`;
		if (amount === 0n) return "";
		if (amount > fromBalance) return `Not enough ${fromSymbol} in your wallet.`;
		if (amount > moduleCapacity) return isStablecoinToZchf ? "Not enough module capacity. Try a smaller amount." : "Not enough module backing. Try a smaller amount.";
		if (isStablecoinToZchf && moduleExpired) return `This module no longer accepts new ${selectedAsset.symbol}-to-ZCHF conversions.`;
		if (!activeMinter) return "Module is not active.";
		return "";
	}, [activeMinter, amount, fromBalance, fromSymbol, isDisabledAsset, isStablecoinToZchf, moduleCapacity, moduleExpired, selectedAsset.symbol]);

	useEffect(() => {
		setAmount(0n);
		setMinter(0n);
	}, [selectedAssetId, direction]);

	useEffect(() => {
		const fetcher = async () => {
			const active = await readContract(WAGMI_CONFIG, {
				address: stats.frankencoinAddress,
				chainId: stats.chainId,
				abi: FrankencoinABI,
				functionName: "minters",
				args: [stats.bridgeAddress],
			});

			if (active !== isMinter) setMinter(active);
		};

		fetcher();
	}, [isMinter, stats.bridgeAddress, stats.chainId, stats.frankencoinAddress]);

	const handleApprove = async () => {
		try {
			setApproving(true);
			const approveWriteHash = await writeContract(WAGMI_CONFIG, {
				address: stats.otherAddress,
				chainId: stats.chainId,
				abi: erc20Abi,
				functionName: "approve",
				args: [stats.bridgeAddress, amount],
			});

			const toastContent = [
				{ title: "Amount:", value: `${formatBigInt(amount, selectedAsset.decimals, 6)} ${selectedAsset.symbol}` },
				{ title: "Module:", value: shortenAddress(stats.bridgeAddress) },
				{ title: "Transaction:", hash: approveWriteHash },
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: approveWriteHash, confirmations: 1 }), {
				pending: { render: <TxToast title="Confirm in wallet" rows={toastContent} /> },
				success: { render: <TxToast title={`Allowed ${selectedAsset.symbol}`} rows={toastContent} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			setApproving(false);
		}
	};

	const handleConvert = async () => {
		try {
			setConverting(true);
			const functionName = isStablecoinToZchf ? "mint" : "burn";
			const writeHash = await writeContract(WAGMI_CONFIG, {
				address: stats.bridgeAddress,
				chainId: stats.chainId,
				abi: stats.bridgeAbi,
				functionName,
				args: [amount],
			});

			const toastContent = [
				{ title: "You convert:", value: `${formatBigInt(amount, fromDecimals, 6)} ${fromSymbol}` },
				{ title: "You receive:", value: `${formatBigInt(toAmount, toDecimals, 6)} ${toSymbol}` },
				{ title: "Transaction:", hash: writeHash },
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: writeHash, confirmations: 1 }), {
				pending: { render: <TxToast title="Converting..." rows={toastContent} /> },
				success: { render: <TxToast title="Conversion completed" rows={toastContent} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			setConverting(false);
		}
	};

	const canSubmit = amount > 0n && !amountError;
	const buttonLabel = hasAllowance
		? `Convert ${formatBigInt(amount, fromDecimals, 6)} ${fromSymbol} to ${formatBigInt(toAmount, toDecimals, 6)} ${toSymbol}`
		: `Allow module to use up to ${formatBigInt(amount, selectedAsset.decimals, 6)} ${selectedAsset.symbol}`;

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Crypto convert quote</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Convert Swiss stablecoins and ZCHF</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
						Convert supported Swiss franc stablecoins into or out of Frankencoin through protocol modules.
					</p>
				</div>
				<AppLink className="text-sm font-semibold text-button-default hover:text-button-hover" label="View module contract" href={moduleUrl} external={true} />
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr),minmax(320px,420px)]">
				<div className="space-y-4">
					<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
						<p className="text-sm font-medium text-text-secondary">Stablecoin selector</p>
						<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{CONVERT_ASSETS.map((asset) => (
								<AssetButton key={asset.id} asset={asset} active={selectedAssetId === asset.id} onClick={() => asset.enabled && setSelectedAssetId(asset.id)} />
							))}
						</div>
					</div>

					<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
						<p className="text-sm font-medium text-text-secondary">Direction</p>
						<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							<button
								type="button"
								onClick={() => setDirection("stablecoin-to-zchf")}
								className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
									isStablecoinToZchf
										? "border-[#c4a75f] bg-button-default text-white"
										: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
								}`}
							>
								{selectedAsset.symbol} to ZCHF
							</button>
							<button
								type="button"
								onClick={() => setDirection("zchf-to-stablecoin")}
								className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
									!isStablecoinToZchf
										? "border-[#c4a75f] bg-button-default text-white"
										: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
								}`}
							>
								ZCHF to {selectedAsset.symbol}
							</button>
						</div>
					</div>

					<TokenInput
						label="Amount"
						symbol={fromSymbol}
						digit={fromDecimals}
						max={maxAmount}
						reset={0n}
						limit={fromBalance}
						limitDigit={fromDecimals}
						limitLabel="Balance"
						placeholder="0.00"
						value={amount.toString()}
						onChange={(value) => setAmount(BigInt(value || "0"))}
						error={amountError}
					/>
				</div>

				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Preview</p>
					<h3 className="mt-1 text-lg font-semibold text-text-primary">Convert {fromSymbol} to {toSymbol}</h3>
					<div className="mt-4">
						<StatRow label="You convert" value={`${formatBigInt(amount, fromDecimals, 6)} ${fromSymbol}`} />
						<StatRow label="You receive" value={`${formatBigInt(toAmount, toDecimals, 6)} ${toSymbol}`} />
						<StatRow label="Rate" value={`1 ${selectedAsset.symbol} = 1 ZCHF`} />
						<StatRow label={capacityLabel} value={capacityValue} />
						<StatRow label={backingLabel} value={backingValue} />
						<StatRow label="Expires" value={formatDate(stats.bridgeHorizon)} />
						<StatRow label="Status" value={statusLabel} />
					</div>
					{statusHelper ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">{statusHelper}</p> : null}

					<div className="mt-5">
						<GuardSupportedChain chain={mainnet}>
							{hasAllowance ? (
								<AppButton disabled={!canSubmit} isLoading={isConverting} onClick={handleConvert}>
									{isConverting ? "Converting..." : buttonLabel}
								</AppButton>
							) : (
								<AppButton disabled={!canSubmit} isLoading={isApproving} onClick={handleApprove} note="This does not convert yet.">
									{isApproving ? "Confirm in wallet" : buttonLabel}
								</AppButton>
							)}
						</GuardSupportedChain>
					</div>
				</div>
			</div>
		</section>
	);
}
