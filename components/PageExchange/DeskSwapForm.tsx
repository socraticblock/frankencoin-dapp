import AppNotice from "@components/AppNotice";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import { WAGMI_CHAINS } from "../../app.config";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import { requestDeskQuote, type DeskQuoteResponse } from "../../utils/cowDeskQuote";
import {
	FRANKENCOIN_ASSET_META,
	getAllowedDeskChainsForMode,
	getDefaultDeskChainForMode,
	getDeskChain,
	getDeskCounterAssets,
	getDeskRoute,
	isWfpsConfigured,
	isWfpsMode,
	modeFromDeskSelection,
	type DeskAsset,
	type DeskFrankencoinAsset,
	type DeskSwapMode,
	type DeskSwapSide,
} from "../../utils/exchangeAssets";

const ERC20_BALANCE_ABI = [
	{
		type: "function",
		name: "balanceOf",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "balance", type: "uint256" }],
	},
] as const;

const BALANCE_DISPLAY_DECIMALS = 6;
const QUOTE_DISPLAY_DECIMALS = 6;

type QuoteState = {
	status: "idle" | "ready" | "blocked";
	message: string;
};

function parseChainId(value: string, mode: DeskSwapMode): ChainId {
	const id = Number(value);
	const match = getAllowedDeskChainsForMode(mode).find((chain) => chain.chainId === id);
	return match?.chainId ?? getDefaultDeskChainForMode(mode);
}

function getChainLabel(chainId: number) {
	return chainId === 1 ? "Ethereum" : chainId === 8453 ? "Base" : chainId === 100 ? "Gnosis" : "the selected network";
}

function normalizeDecimalInput(value: string, decimals: number) {
	const normalized = value.replace(/,/g, ".");
	const [integerPart, ...fractionParts] = normalized.split(".");
	const integer = integerPart.replace(/\D/g, "");
	const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, decimals);
	const hasDecimal = normalized.includes(".");

	if (!hasDecimal) return integer;
	return `${integer || "0"}.${fraction}`;
}

function getAmountValidation(amount: string, asset: DeskAsset | null) {
	if (!amount) return null;
	if (!asset) return "This route is not available in ZCHF Desk.";
	if (!/^\d+(\.\d+)?$/.test(amount)) return "Enter a valid amount.";

	const fraction = amount.split(".")[1] ?? "";
	if (fraction.length > asset.decimals) return `${asset.symbol} supports up to ${asset.decimals} decimals.`;

	try {
		const parsed = parseUnits(amount, asset.decimals);
		if (parsed <= 0n) return "Enter an amount greater than zero.";
	} catch {
		return "Enter a valid amount.";
	}

	return null;
}

function trimDecimalZeros(value: string) {
	if (!value.includes(".")) return value;
	return value.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0*$/, "");
}

function formatDisplayDecimal(value: string, maxFractionDigits: number) {
	const isNegative = value.startsWith("-");
	const unsigned = isNegative ? value.slice(1) : value;
	const [integerRaw, fractionRaw = ""] = unsigned.split(".");
	const integer = integerRaw || "0";
	const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const fraction = fractionRaw.slice(0, maxFractionDigits).replace(/0+$/, "");

	if (!fraction) {
		if (fractionRaw && /[1-9]/.test(fractionRaw)) {
			return `${isNegative ? "-" : ""}<0.${"0".repeat(Math.max(0, maxFractionDigits - 1))}1`;
		}
		return `${isNegative ? "-" : ""}${groupedInteger}`;
	}

	return `${isNegative ? "-" : ""}${groupedInteger}.${fraction}`;
}

function formatTokenAmount(value: bigint | string, decimals: number, maxFractionDigits = QUOTE_DISPLAY_DECIMALS) {
	const raw = typeof value === "bigint" ? value : BigInt(value);
	return formatDisplayDecimal(formatUnits(raw, decimals), maxFractionDigits);
}

function getApproximateRate({
	sellAmountBeforeFee,
	buyAmount,
	sellAsset,
	buyAsset,
}: {
	sellAmountBeforeFee: string | null;
	buyAmount?: string;
	sellAsset: DeskAsset | null;
	buyAsset?: DeskAsset;
}) {
	if (!sellAmountBeforeFee || !buyAmount || !sellAsset || !buyAsset) return null;

	const sell = Number(formatUnits(BigInt(sellAmountBeforeFee), sellAsset.decimals));
	const buy = Number(formatUnits(BigInt(buyAmount), buyAsset.decimals));
	if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy <= 0) return null;

	return `1 ${sellAsset.symbol} ≈ ${formatDisplayDecimal((buy / sell).toFixed(QUOTE_DISPLAY_DECIMALS), QUOTE_DISPLAY_DECIMALS)} ${buyAsset.symbol}`;
}

function getQuoteExpirationLabel(value?: string) {
	if (!value) return null;
	const expiresAt = new Date(value).getTime();
	if (!Number.isFinite(expiresAt)) return null;
	const milliseconds = expiresAt - Date.now();
	if (milliseconds <= 0) return "Quote expired";
	if (milliseconds < 60_000) return "Expires in less than 1 minute";
	const minutes = Math.ceil(milliseconds / 60_000);
	return `Expires in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function getRouteExplanation(mode: DeskSwapMode, assetSymbol: string) {
	if (mode === "get-zchf") return "Buy ZCHF: you pay crypto already in your wallet and receive ZCHF.";
	if (mode === "sell-zchf") return "Sell ZCHF: you sell ZCHF and receive the selected crypto token.";
	if (mode === "get-wfps") return "Buy WFPS: you pay crypto already in your wallet and receive WFPS.";
	return `Sell ${assetSymbol}: you sell WFPS and receive the selected crypto token.`;
}

function TokenLogo({ asset }: { asset: DeskAsset }) {
	// Token logos are curated remote URLs and should not require a global Next image allowlist.
	// eslint-disable-next-line @next/next/no-img-element
	return <img src={asset.logoURI} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-white object-contain" />;
}

function TokenSelectCard({
	asset,
	assets,
	label,
	onChange,
}: {
	asset: DeskAsset | null;
	assets: DeskAsset[];
	label: string;
	onChange: (id: string) => void;
}) {
	return (
		<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-text-secondary">{label}</p>
				<p className="text-xs font-semibold text-text-secondary">Choose token</p>
			</div>
			<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-3 py-3 dark:border-menu-separator">
				{asset ? <TokenLogo asset={asset} /> : null}
				<div className="min-w-0 flex-1">
					<select
						value={asset?.id ?? ""}
						onChange={(event) => onChange(event.target.value)}
						className="w-full bg-transparent text-base font-semibold leading-5 text-text-primary outline-none"
					>
						{assets.map((option) => (
							<option key={option.id} value={option.id}>
								{option.recommended ? `${option.symbol} - suggested` : option.symbol}
							</option>
						))}
					</select>
					{asset ? <p className="mt-0.5 truncate text-xs leading-4 text-text-secondary">{asset.name}</p> : null}
				</div>
			</div>
		</div>
	);
}

function LockedAssetCard({ asset, label }: { asset: DeskAsset | null; label: string }) {
	return (
		<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-text-secondary">{label}</p>
				<span className="rounded-full bg-card-content-primary px-2 py-1 text-xs font-semibold text-text-secondary">Locked</span>
			</div>
			{asset ? (
				<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-3 py-3 dark:border-menu-separator">
					<TokenLogo asset={asset} />
					<div className="min-w-0">
						<p className="text-base font-semibold leading-5 text-text-primary">{asset.symbol}</p>
						<p className="mt-0.5 truncate text-xs leading-4 text-text-secondary">{asset.name}</p>
					</div>
				</div>
			) : (
				<div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
					Asset unavailable
				</div>
			)}
		</div>
	);
}

export default function DeskSwapForm() {
	const connectedChainId = useChainId();
	const { address, isConnected } = useAccount();
	const appKitNetwork = useAppKitNetwork();
	const [side, setSide] = useState<DeskSwapSide>("buy");
	const [frankencoinAsset, setFrankencoinAsset] = useState<DeskFrankencoinAsset>("zchf");
	const mode = modeFromDeskSelection(side, frankencoinAsset);
	const [chainId, setChainId] = useState<ChainId>(getDefaultDeskChainForMode(mode));
	const counterAssets = useMemo(() => getDeskCounterAssets(mode, chainId), [chainId, mode]);
	const [counterAssetId, setCounterAssetId] = useState<string>(counterAssets[0]?.id ?? "");
	const [amount, setAmount] = useState<string>("");
	const [quote, setQuote] = useState<DeskQuoteResponse | null>(null);
	const [quoteError, setQuoteError] = useState<string | null>(null);
	const [isQuoteLoading, setIsQuoteLoading] = useState(false);
	const route = useMemo(() => getDeskRoute(mode, chainId, counterAssetId), [chainId, counterAssetId, mode]);
	const sellAsset = route?.sellAsset ?? null;
	const selectedChain = getDeskChain(chainId);
	const allowedChains = getAllowedDeskChainsForMode(mode);
	const selectedCounterAsset = route?.counterAsset ?? counterAssets.find((asset) => asset.id === counterAssetId) ?? null;
	const isConnectedToRouteChain = connectedChainId === chainId;
	const amountValidation = useMemo(() => getAmountValidation(amount, sellAsset), [amount, sellAsset]);
	const quoteState = getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, amountValidation, route, mode });
	const sellAmountPreview = route && amount ? `${amount} ${route.sellAsset.symbol}` : "Enter amount";
	const openSideIsSell = side === "buy";
	const assetMeta = FRANKENCOIN_ASSET_META[frankencoinAsset];
	const amountLabel = side === "buy" ? "Amount to pay" : "Amount to sell";
	const assetChoiceLabel = side === "buy" ? "What do you want to buy?" : "What do you want to sell?";
	const routeExplanation = getRouteExplanation(mode, assetMeta.symbol);
	const wfpsConfigured = isWfpsConfigured();
	const {
		data: sellBalance,
		isLoading: isBalanceLoading,
	} = useReadContract({
		address: sellAsset?.address,
		abi: ERC20_BALANCE_ABI,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		chainId,
		query: {
			enabled: Boolean(address && sellAsset?.address),
		},
	});
	const sellAmountBeforeFee = useMemo(() => {
		if (!amount || !sellAsset || amountValidation) return null;
		try {
			return parseUnits(amount, sellAsset.decimals).toString();
		} catch {
			return null;
		}
	}, [amount, amountValidation, sellAsset]);
	const formattedSellAmount = sellAmountBeforeFee && sellAsset ? `${formatTokenAmount(sellAmountBeforeFee, sellAsset.decimals)} ${sellAsset.symbol}` : null;
	const estimatedReceive =
		quote?.quote?.buyAmount && quote.buyAsset
			? `${formatTokenAmount(quote.quote.buyAmount, quote.buyAsset.decimals)} ${quote.buyAsset.symbol}`
			: null;
	const feeAmount =
		quote?.quote?.feeAmount && quote.sellAsset
			? `${formatTokenAmount(quote.quote.feeAmount, quote.sellAsset.decimals)} ${quote.sellAsset.symbol}`
			: null;
	const quoteRate = getApproximateRate({
		sellAmountBeforeFee,
		buyAmount: quote?.quote?.buyAmount,
		sellAsset,
		buyAsset: quote?.buyAsset,
	});
	const quoteExpirationLabel = getQuoteExpirationLabel(quote?.expiration);
	const nextExecutionLabel = quote?.sellAsset
		? `Next execution step: approve ${quote.sellAsset.symbol}, then review and sign the order.`
		: route
			? `Next execution step: approve ${route.sellAsset.symbol}, then review and sign the order.`
			: "Next execution step: approve the sell token, then review and sign the order.";
	const buyPreview = estimatedReceive ?? (route ? `${route.buyAsset.symbol} after quote` : "Route unavailable");
	const hasInsufficientBalance =
		sellBalance !== undefined &&
		sellAmountBeforeFee !== null &&
		BigInt(sellAmountBeforeFee) > sellBalance;
	const isWaitingForBalance = Boolean(address && route && sellAmountBeforeFee && isConnectedToRouteChain && isBalanceLoading);
	const isBalanceUnavailable = Boolean(
		address &&
		route &&
		sellAmountBeforeFee &&
		isConnectedToRouteChain &&
		!isBalanceLoading &&
		sellBalance === undefined
	);
	const canRequestQuote = Boolean(
		address &&
		route &&
		sellAmountBeforeFee &&
		isConnectedToRouteChain &&
		sellBalance !== undefined &&
		!hasInsufficientBalance &&
		!amountValidation
	);

	useEffect(() => {
		const fallback = getDefaultDeskChainForMode(mode);
		const allowed = getAllowedDeskChainsForMode(mode);
		if (!allowed.some((chain) => chain.chainId === chainId)) setChainId(fallback);
	}, [chainId, mode]);

	useEffect(() => {
		if (!counterAssets.some((asset) => asset.id === counterAssetId)) setCounterAssetId(counterAssets[0]?.id ?? "");
	}, [counterAssetId, counterAssets]);

	const switchWalletToChain = (nextChainId: ChainId) => {
		const target = WAGMI_CHAINS.find((chain) => chain.id === nextChainId) as AppKitNetwork | undefined;
		if (!target || connectedChainId === nextChainId) return;
		const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
		Promise.resolve(appKitNetwork.switchNetwork(target))
			.catch(() => null)
			.finally(() => {
				if (typeof window !== "undefined") window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
			});
	};

	const onChainChange = (value: string) => {
		const nextChainId = parseChainId(value, mode);
		setChainId(nextChainId);
		switchWalletToChain(nextChainId);
	};

	const onAssetChoiceChange = (asset: DeskFrankencoinAsset) => {
		if (asset === "wfps" && !wfpsConfigured) return;
		setFrankencoinAsset(asset);
		const nextMode = modeFromDeskSelection(side, asset);
		const nextChain = getDefaultDeskChainForMode(nextMode);
		setChainId(nextChain);
		setAmount("");
		switchWalletToChain(nextChain);
	};

	const onSideChange = (nextSide: DeskSwapSide) => {
		setSide(nextSide);
		setAmount("");
	};

	const onMaxClick = () => {
		if (!sellAsset || sellBalance === undefined) return;
		setAmount(trimDecimalZeros(formatUnits(sellBalance, sellAsset.decimals)));
	};

	useEffect(() => {
		setQuote(null);
		setQuoteError(null);
		setIsQuoteLoading(false);

		if (!canRequestQuote || !address || !route || !sellAmountBeforeFee) return;

		let cancelled = false;
		const timeout = window.setTimeout(async () => {
			setIsQuoteLoading(true);
			try {
				const result = await requestDeskQuote({
					chainId,
					mode,
					counterAssetId,
					sellAmountBeforeFee,
					from: address,
					receiver: address,
				});
				if (!cancelled) setQuote(result);
			} catch (error) {
				if (!cancelled) setQuoteError(error instanceof Error ? error.message : "Quote request failed.");
			} finally {
				if (!cancelled) setIsQuoteLoading(false);
			}
		}, 700);

		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [address, canRequestQuote, chainId, counterAssetId, mode, route, sellAmountBeforeFee]);

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Crypto swap quote</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Swap crypto and Frankencoin assets</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
						This desk only supports routes where one side is ZCHF or WFPS. Quotes are powered by CoW Protocol.
					</p>
				</div>
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-3 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="font-semibold text-text-primary">Trading path</p>
					<p className="mt-1 max-w-sm text-xs leading-5">Live quote now. Next: approve token, sign order, submit trade, then track settlement.</p>
				</div>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[0.9fr,1.1fr,1.1fr]">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Buy or sell ZCHF or WFPS?</p>
					<div className="mt-2 grid grid-cols-2 gap-2">
						{(["buy", "sell"] as DeskSwapSide[]).map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => onSideChange(item)}
								className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
									side === item
										? "border-[#c4a75f] bg-button-default text-white"
										: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
								}`}
							>
								{item === "buy" ? "Buy" : "Sell"}
							</button>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">{assetChoiceLabel}</p>
					<div className="mt-2 grid grid-cols-2 gap-2">
						{(["zchf", "wfps"] as DeskFrankencoinAsset[]).map((asset) => {
							const meta = FRANKENCOIN_ASSET_META[asset];
							const disabled = asset === "wfps" && !wfpsConfigured;
							return (
								<button
									key={asset}
									type="button"
									disabled={disabled}
									onClick={() => onAssetChoiceChange(asset)}
									className={`rounded-xl border px-3 py-2.5 text-left transition ${
										frankencoinAsset === asset
											? "border-[#c4a75f] bg-button-default text-white"
											: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
									} ${disabled ? "cursor-not-allowed opacity-50 hover:border-[#e0d4bd]" : ""}`}
								>
									<p className="text-sm font-semibold leading-5">{meta.symbol}</p>
									<p className={`mt-0.5 truncate text-xs leading-4 ${frankencoinAsset === asset ? "text-white/75" : "text-text-secondary"}`}>
										{disabled ? "Wrapper address not verified" : meta.name}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				<label className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<span className="text-xs uppercase tracking-wider text-text-secondary">Network</span>
					<select
						value={chainId}
						onChange={(event) => onChainChange(event.target.value)}
						className="mt-2 min-h-[42px] w-full rounded-lg border border-[#e0d4bd] bg-card-content-primary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
					>
						{allowedChains.map((chain) => (
							<option key={chain.chainId} value={chain.chainId}>
								{chain.recommended ? `${chain.label} - recommended` : chain.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{openSideIsSell ? (
							<TokenSelectCard asset={selectedCounterAsset} assets={counterAssets} label="You pay" onChange={setCounterAssetId} />
						) : (
							<LockedAssetCard asset={route?.sellAsset ?? null} label="You sell" />
						)}
						{openSideIsSell ? (
							<LockedAssetCard asset={route?.buyAsset ?? null} label="You receive" />
						) : (
							<TokenSelectCard asset={selectedCounterAsset} assets={counterAssets} label="You receive" onChange={setCounterAssetId} />
						)}
					</div>

					<label className="mt-4 block">
						<span className="mb-1 block text-sm font-medium text-text-secondary">{amountLabel}</span>
						<div className="flex min-h-[48px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white transition hover:border-[#c4a75f] focus-within:border-[#c4a75f] dark:border-menu-separator dark:bg-card-content-primary">
							<input
								value={amount}
								onChange={(event) => setAmount(normalizeDecimalInput(event.target.value, sellAsset?.decimals ?? 18))}
								placeholder="0.00"
								inputMode="decimal"
								aria-invalid={Boolean(amountValidation)}
								className="min-w-0 flex-1 bg-transparent px-4 text-lg font-semibold text-text-primary outline-none placeholder:text-text-secondary/50"
							/>
							<button
								type="button"
								onClick={onMaxClick}
								disabled={!sellAsset || sellBalance === undefined}
								className="border-l border-[#e0d4bd] px-4 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-menu-separator"
							>
								Max
							</button>
						</div>
						<p className="mt-2 text-xs text-text-secondary">
							{isBalanceLoading
								? "Loading balance…"
								: sellAsset && sellBalance !== undefined
									? `Balance: ${formatTokenAmount(sellBalance, sellAsset.decimals, BALANCE_DISPLAY_DECIMALS)} ${sellAsset.symbol}`
									: "Connect your wallet to see balance."}
						</p>
						{amountValidation ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-200">{amountValidation}</p> : null}
					</label>

					<AppNotice
						variant="neutral"
						message={
							isWfpsMode(mode)
								? "WFPS routes are Ethereum-only in this desk. The wrapper address must be verified before order execution is enabled."
								: "Other chains may have little or no direct ZCHF swap liquidity. For those chains, buy or swap into ZCHF first, then bridge it."
						}
					/>
				</div>

				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Route preview</p>
					<h3 className="mt-1 text-lg font-semibold text-text-primary">
						{side === "buy" ? "Buy" : "Sell"} {assetMeta.symbol}
					</h3>
					<p className="mt-2 text-sm leading-6 text-text-secondary">{routeExplanation}</p>

					<div className="mt-4 space-y-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary p-4 dark:border-menu-separator">
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">Chain</span>
							<span className="font-semibold text-text-primary">{selectedChain?.label ?? "Unsupported"}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">You pay</span>
							<span className="font-semibold text-text-primary">{formattedSellAmount ?? sellAmountPreview}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">You receive</span>
							<span className="font-semibold text-text-primary">{buyPreview}</span>
						</div>
						{feeAmount ? (
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-text-secondary">CoW fee estimate</span>
								<span className="font-semibold text-text-primary">{feeAmount}</span>
							</div>
						) : null}
						{quoteRate ? (
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-text-secondary">Rate</span>
								<span className="text-right font-semibold text-text-primary">{quoteRate}</span>
							</div>
						) : null}

						<div className="border-t border-[#e0d4bd] pt-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							{amountValidation ? (
								<p className="font-medium text-amber-700 dark:text-amber-200">{amountValidation}</p>
							) : hasInsufficientBalance ? (
								<p className="font-medium text-amber-700 dark:text-amber-200">This route may be available, but your wallet balance is too low.</p>
							) : isWaitingForBalance ? (
								<p>Loading wallet balance before checking the route…</p>
							) : isBalanceUnavailable ? (
								<p className="font-medium text-amber-700 dark:text-amber-200">Wallet balance is unavailable right now. Reconnect your wallet or try again in a moment.</p>
							) : isQuoteLoading ? (
								<p>Checking route…</p>
							) : quoteError ? (
								<p className="font-medium text-amber-700 dark:text-amber-200">{quoteError}</p>
							) : estimatedReceive ? (
								<div>
									<p className="font-semibold text-text-primary">Quote found</p>
									{quoteExpirationLabel ? <p className="mt-1">{quoteExpirationLabel}</p> : null}
									<p className="mt-2 text-xs leading-5">{nextExecutionLabel}</p>
									<p className="mt-1 text-xs leading-5">This screen does not request approval, signature, or a transaction yet.</p>
								</div>
							) : (
								<p>{quoteState.message}</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function getQuoteState({
	isConnected,
	isConnectedToRouteChain,
	address,
	amount,
	amountValidation,
	route,
	mode,
}: {
	isConnected: boolean;
	isConnectedToRouteChain: boolean;
	address?: string;
	amount: string;
	amountValidation: string | null;
	route: ReturnType<typeof getDeskRoute>;
	mode: DeskSwapMode;
}): QuoteState {
	if (!route) return { status: "blocked", message: "This route is not available in ZCHF Desk." };
	if (!isConnected || !address) return { status: "blocked", message: "Connect your wallet to preview a personalized quote." };
	if (!isConnectedToRouteChain) return { status: "blocked", message: `Switch your wallet to ${getChainLabel(route.sellAsset.chainId)} for this route.` };
	if (!amount || Number(amount) <= 0) return { status: "idle", message: "Enter an amount to check this route." };
	if (amountValidation) return { status: "blocked", message: amountValidation };
	if (isWfpsMode(mode) && !route.lockedAsset) return { status: "blocked", message: "WFPS is not configured yet." };
	return {
		status: "ready",
		message: `This route is ready to check: ${route.sellAsset.symbol} -> ${route.buyAsset.symbol}.`,
	};
}
