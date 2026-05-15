import AppButton from "@components/AppButton";
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
				<p className="text-xs font-semibold text-text-secondary">Tap to switch crypto</p>
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
	const quoteState = getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, route, mode });
	const sellAmountPreview = route && amount ? `${amount} ${route.sellAsset.symbol}` : "Enter amount";
	const buyPreview = route ? `${route.buyAsset.symbol} locked` : "Route unavailable";
	const openSideIsSell = side === "buy";
	const assetMeta = FRANKENCOIN_ASSET_META[frankencoinAsset];
	const amountLabel = side === "buy" ? "Amount to pay" : "Amount to sell";
	const assetChoiceLabel = side === "buy" ? "What do you want to buy?" : "What do you want to sell?";
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
		if (!amount || !sellAsset) return null;
		try {
			return parseUnits(amount, sellAsset.decimals).toString();
		} catch {
			return null;
		}
	}, [amount, sellAsset]);
	const estimatedReceive =
		quote?.quote?.buyAmount && quote.buyAsset
			? `${formatUnits(BigInt(quote.quote.buyAmount), quote.buyAsset.decimals)} ${quote.buyAsset.symbol}`
			: null;
	const feeAmount =
		quote?.quote?.feeAmount && quote.sellAsset
			? `${formatUnits(BigInt(quote.quote.feeAmount), quote.sellAsset.decimals)} ${quote.sellAsset.symbol}`
			: null;
	const hasInsufficientBalance =
		sellBalance !== undefined &&
		sellAmountBeforeFee !== null &&
		BigInt(sellAmountBeforeFee) > sellBalance;

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
		setAmount(formatUnits(sellBalance, sellAsset.decimals));
	};

	useEffect(() => {
		setQuote(null);
		setQuoteError(null);
		setIsQuoteLoading(false);

		if (!address || !route || !sellAmountBeforeFee || !isConnectedToRouteChain) return;

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
	}, [address, route, sellAmountBeforeFee, isConnectedToRouteChain, chainId, mode, counterAssetId]);

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Custom CoW-backed quote form</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Swap crypto and Frankencoin assets</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
						This desk only supports routes where one side is ZCHF or WFPS. For unrelated crypto-to-crypto swaps, use CoW Swap directly.
					</p>
				</div>
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-3 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="font-semibold text-text-primary">Execution status</p>
					<p className="mt-1 max-w-sm text-xs leading-5">Quote-only preview is being introduced first. Order signing comes after route testing with tiny amounts.</p>
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
								onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
								placeholder="0.00"
								inputMode="decimal"
								className="min-w-0 flex-1 bg-transparent px-4 text-lg font-semibold text-text-primary outline-none placeholder:text-text-secondary/50"
							/>
							<button
								type="button"
								onClick={onMaxClick}
								disabled={!sellAsset || sellBalance === undefined}
								className="border-l border-[#e0d4bd] px-4 text-sm font-semibold text-text-secondary hover:text-text-primary dark:border-menu-separator"
							>
								Max
							</button>
						</div>
						<p className="mt-2 text-xs text-text-secondary">
							{isBalanceLoading
								? "Loading balance…"
								: sellAsset && sellBalance !== undefined
									? `Balance: ${formatUnits(sellBalance, sellAsset.decimals)} ${sellAsset.symbol}`
									: "Connect your wallet to see balance."}
						</p>
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
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						{side === "buy"
							? `Swap selected crypto into ${assetMeta.symbol}. Receive token is locked.`
							: `Sell ${assetMeta.symbol} into the selected crypto token.`}
					</p>

					<div className="mt-4 space-y-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary p-4 dark:border-menu-separator">
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">Chain</span>
							<span className="font-semibold text-text-primary">{selectedChain?.label ?? "Unsupported"}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">Sell</span>
							<span className="font-semibold text-text-primary">{sellAmountPreview}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-text-secondary">Receive</span>
							<span className="font-semibold text-text-primary">{buyPreview}</span>
						</div>
					</div>

					{hasInsufficientBalance ? (
						<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
							This route may be available, but your wallet balance is too low.
						</div>
					) : isQuoteLoading ? (
						<div className="mt-4 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-4 py-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							Checking route…
						</div>
					) : quoteError ? (
						<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
							{quoteError}
						</div>
					) : estimatedReceive ? (
						<div className="mt-4 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-4 py-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							<p className="font-semibold text-text-primary">Quote found</p>
							<p className="mt-1">Estimated receive: {estimatedReceive}</p>
							{feeAmount ? <p className="mt-1">CoW fee estimate: {feeAmount}</p> : null}
							{quote?.expiration ? <p className="mt-1">Quote expires: {quote.expiration}</p> : null}
						</div>
					) : (
						<div className="mt-4 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-4 py-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							{quoteState.message}
						</div>
					)}

					<AppButton disabled width="w-full" className="mt-4">
						Quote preview only
					</AppButton>
					<p className="mt-3 text-xs leading-5 text-text-secondary">
						Next step: add approval and order signing after small-route testing.
					</p>
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
	route,
	mode,
}: {
	isConnected: boolean;
	isConnectedToRouteChain: boolean;
	address?: string;
	amount: string;
	route: ReturnType<typeof getDeskRoute>;
	mode: DeskSwapMode;
}): QuoteState {
	if (!route) return { status: "blocked", message: "This route is not available in ZCHF Desk." };
	if (!isConnected || !address) return { status: "blocked", message: "Connect your wallet to preview a personalized quote." };
	if (!isConnectedToRouteChain) return { status: "blocked", message: `Switch your wallet to ${getChainLabel(route.sellAsset.chainId)} for this route.` };
	if (!amount || Number(amount) <= 0) return { status: "idle", message: "Enter an amount to preview the route." };
	if (isWfpsMode(mode) && !route.lockedAsset) return { status: "blocked", message: "WFPS is not configured yet." };
	return {
		status: "ready",
		message: `Route is locked to ${route.sellAsset.symbol} -> ${route.buyAsset.symbol}. Quote fetching is the next implementation step before enabling signatures.`,
	};
}
