import AppButton from "@components/AppButton";
import AppNotice from "@components/AppNotice";
import { useEffect, useMemo, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import type { ChainId } from "@frankencoin/zchf";
import { WAGMI_CHAINS } from "../../app.config";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import {
	getAllowedDeskChainsForMode,
	getDefaultDeskChainForMode,
	getDeskChain,
	getDeskCounterAssets,
	getDeskRoute,
	isWfpsMode,
	type DeskAsset,
	type DeskSwapMode,
} from "../../utils/exchangeAssets";

type SwapSide = "buy" | "sell";
type FrankencoinAssetChoice = "zchf" | "wfps";

type QuoteState = {
	status: "idle" | "ready" | "blocked";
	message: string;
};

function modeFromSelection(side: SwapSide, asset: FrankencoinAssetChoice): DeskSwapMode {
	if (side === "buy" && asset === "zchf") return "get-zchf";
	if (side === "sell" && asset === "zchf") return "sell-zchf";
	if (side === "buy" && asset === "wfps") return "get-wfps";
	return "sell-wfps";
}

function parseChainId(value: string, mode: DeskSwapMode): ChainId {
	const id = Number(value);
	const match = getAllowedDeskChainsForMode(mode).find((chain) => chain.chainId === id);
	return match?.chainId ?? getDefaultDeskChainForMode(mode);
}

function getChainLabel(chainId: number) {
	return chainId === 1 ? "Ethereum" : chainId === 8453 ? "Base" : chainId === 100 ? "Gnosis" : "the selected network";
}

function TokenLogo({ asset }: { asset: DeskAsset }) {
	return <img src={asset.logoURI} alt="" className="h-8 w-8 rounded-full bg-white object-contain" />;
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
				<select
					value={asset?.id ?? ""}
					onChange={(event) => onChange(event.target.value)}
					className="min-h-[42px] flex-1 bg-transparent text-base font-semibold text-text-primary outline-none"
				>
					{assets.map((option) => (
						<option key={option.id} value={option.id}>
							{option.recommended ? `${option.symbol} - suggested` : option.symbol}
						</option>
					))}
				</select>
			</div>
			{asset ? <p className="mt-2 text-xs text-text-secondary">{asset.name}</p> : null}
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
					<div>
						<p className="text-base font-semibold text-text-primary">{asset.symbol}</p>
						<p className="text-xs text-text-secondary">{asset.name}</p>
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
	const { address, isConnected } = useConnection();
	const appKitNetwork = useAppKitNetwork();
	const [side, setSide] = useState<SwapSide>("buy");
	const [frankencoinAsset, setFrankencoinAsset] = useState<FrankencoinAssetChoice>("zchf");
	const mode = modeFromSelection(side, frankencoinAsset);
	const [chainId, setChainId] = useState<ChainId>(getDefaultDeskChainForMode(mode));
	const counterAssets = useMemo(() => getDeskCounterAssets(mode, chainId), [chainId, mode]);
	const [counterAssetId, setCounterAssetId] = useState<string>(counterAssets[0]?.id ?? "");
	const [amount, setAmount] = useState<string>("");
	const route = getDeskRoute(mode, chainId, counterAssetId);
	const selectedChain = getDeskChain(chainId);
	const allowedChains = getAllowedDeskChainsForMode(mode);
	const selectedCounterAsset = route?.counterAsset ?? counterAssets.find((asset) => asset.id === counterAssetId) ?? null;
	const isConnectedToRouteChain = connectedChainId === chainId;
	const quoteState = getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, route, mode });
	const sellAmountPreview = route && amount ? `${amount} ${route.sellAsset.symbol}` : "Enter amount";
	const buyPreview = route ? `${route.buyAsset.symbol} locked` : "Route unavailable";
	const openSideIsSell = side === "buy";

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
		void appKitNetwork.switchNetwork(target).finally(() => {
			if (typeof window !== "undefined") window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
		});
	};

	const onChainChange = (value: string) => {
		const nextChainId = parseChainId(value, mode);
		setChainId(nextChainId);
		switchWalletToChain(nextChainId);
	};

	const onAssetChoiceChange = (asset: FrankencoinAssetChoice) => {
		setFrankencoinAsset(asset);
		const nextMode = modeFromSelection(side, asset);
		const nextChain = getDefaultDeskChainForMode(nextMode);
		setChainId(nextChain);
		setAmount("");
		switchWalletToChain(nextChain);
	};

	const onSideChange = (nextSide: SwapSide) => {
		setSide(nextSide);
		setAmount("");
	};

	const onMaxClick = () => {
		setAmount("");
	};

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

			<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[0.85fr,1fr,1.15fr]">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">I want to</p>
					<div className="mt-2 grid grid-cols-2 gap-2">
						{(["buy", "sell"] as SwapSide[]).map((item) => (
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
					<p className="text-xs uppercase tracking-wider text-text-secondary">Frankencoin asset</p>
					<div className="mt-2 grid grid-cols-2 gap-2">
						{(["zchf", "wfps"] as FrankencoinAssetChoice[]).map((asset) => (
							<button
								key={asset}
								type="button"
								onClick={() => onAssetChoiceChange(asset)}
								className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
									frankencoinAsset === asset
										? "border-[#c4a75f] bg-button-default text-white"
										: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
								}`}
							>
								{asset === "zchf" ? "ZCHF" : "WFPS"}
							</button>
						))}
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
						<span className="mb-1 block text-sm font-medium text-text-secondary">Amount to sell</span>
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
								className="border-l border-[#e0d4bd] px-4 text-sm font-semibold text-text-secondary hover:text-text-primary dark:border-menu-separator"
							>
								Max
							</button>
						</div>
						<p className="mt-2 text-xs text-text-secondary">Balance-aware Max will be enabled with the quote and balance step.</p>
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
						{side === "buy" ? "Buy" : "Sell"} {frankencoinAsset === "zchf" ? "ZCHF" : "WFPS"}
					</h3>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						{side === "buy"
							? `Swap selected crypto into ${frankencoinAsset === "zchf" ? "ZCHF" : "WFPS"}. Receive token is locked.`
							: `Sell ${frankencoinAsset === "zchf" ? "ZCHF" : "WFPS"} into the selected crypto token.`}
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

					<div className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-6 ${quoteState.status === "blocked" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200" : "border-[#e0d4bd] bg-card-content-primary text-text-secondary dark:border-menu-separator"}`}>
						{quoteState.message}
					</div>

					<AppButton disabled width="w-full" className="mt-4">
						Quote execution coming next
					</AppButton>
					<p className="mt-3 text-xs leading-5 text-text-secondary">
						Next step: connect this locked route form to CoW quotes, then add approval and order signing after small-route testing.
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
