import AppButton from "@components/AppButton";
import AppNotice from "@components/AppNotice";
import { useEffect, useMemo, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import type { ChainId } from "@frankencoin/zchf";
import {
	DESK_SWAP_CHAINS,
	formatDeskAssetAmount,
	getAllowedDeskChainsForMode,
	getDefaultDeskChainForMode,
	getDeskChain,
	getDeskCounterAssets,
	getDeskRoute,
	getDeskSwapModes,
	isWfpsMode,
	type DeskAsset,
	type DeskSwapMode,
} from "../../utils/exchangeAssets";

type QuoteState = {
	status: "idle" | "ready" | "blocked";
	message: string;
};

function parseChainId(value: string, mode: DeskSwapMode): ChainId {
	const id = Number(value);
	const match = getAllowedDeskChainsForMode(mode).find((chain) => chain.chainId === id);
	return match?.chainId ?? getDefaultDeskChainForMode(mode);
}

function AssetPill({ asset, locked }: { asset: DeskAsset | null; locked?: boolean }) {
	if (!asset) {
		return (
			<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
				Asset unavailable
			</div>
		);
	}
	return (
		<div className="flex items-center justify-between rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-3 dark:border-menu-separator">
			<div className="flex items-center gap-3">
				<img src={asset.logoURI} alt="" className="h-7 w-7 rounded-full" />
				<div>
					<p className="text-sm font-semibold text-text-primary">{asset.symbol}</p>
					<p className="text-xs text-text-secondary">{asset.name}</p>
				</div>
			</div>
			{locked ? <span className="rounded-full bg-card-content-primary px-2 py-1 text-xs font-semibold text-text-secondary">Locked</span> : null}
		</div>
	);
}

export default function DeskSwapForm() {
	const connectedChainId = useChainId();
	const { address, isConnected } = useConnection();
	const modes = getDeskSwapModes();
	const [mode, setMode] = useState<DeskSwapMode>("get-zchf");
	const [chainId, setChainId] = useState<ChainId>(getDefaultDeskChainForMode("get-zchf"));
	const counterAssets = useMemo(() => getDeskCounterAssets(mode, chainId), [chainId, mode]);
	const [counterAssetId, setCounterAssetId] = useState<string>(counterAssets[0]?.id ?? "");
	const [amount, setAmount] = useState<string>("");

	useEffect(() => {
		const allowed = getAllowedDeskChainsForMode(mode);
		if (!allowed.some((chain) => chain.chainId === chainId)) setChainId(getDefaultDeskChainForMode(mode));
	}, [chainId, mode]);

	useEffect(() => {
		if (!counterAssets.some((asset) => asset.id === counterAssetId)) setCounterAssetId(counterAssets[0]?.id ?? "");
	}, [counterAssetId, counterAssets]);

	const selectedChain = getDeskChain(chainId);
	const route = getDeskRoute(mode, chainId, counterAssetId);
	const allowedChains = getAllowedDeskChainsForMode(mode);
	const isConnectedToRouteChain = connectedChainId === chainId;
	const selectedMode = modes.find((item) => item.value === mode) ?? modes[0];
	const quoteState = getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, route, mode });
	const sellAmountPreview = route && amount ? `${amount} ${route.sellAsset.symbol}` : "Enter amount";
	const buyPreview = route ? `${route.buyAsset.symbol} locked` : "Route unavailable";

	const onModeChange = (nextMode: DeskSwapMode) => {
		setMode(nextMode);
		setChainId(getDefaultDeskChainForMode(nextMode));
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

			<div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-4">
				{modes.map((item) => {
					const active = item.value === mode;
					return (
						<button
							key={item.value}
							type="button"
							onClick={() => onModeChange(item.value)}
							className={`rounded-xl border p-3 text-left transition ${
								active
									? "border-[#c4a75f] bg-button-default text-white"
									: "border-[#e0d4bd] bg-card-content-secondary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
							}`}
						>
							<p className="text-sm font-semibold">{item.label}</p>
							<p className={`mt-1 text-xs leading-5 ${active ? "text-white/80" : "text-text-secondary"}`}>{item.description}</p>
						</button>
					);
				})}
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<label className="block">
							<span className="mb-1 block text-sm font-medium text-text-secondary">Network</span>
							<select
								value={chainId}
								onChange={(event) => setChainId(parseChainId(event.target.value, mode))}
								className="min-h-[42px] w-full rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
							>
								{allowedChains.map((chain) => (
									<option key={chain.chainId} value={chain.chainId}>
										{chain.recommended ? `${chain.label} - recommended` : chain.label}
									</option>
								))}
							</select>
						</label>
						<label className="block">
							<span className="mb-1 block text-sm font-medium text-text-secondary">Meaningful token</span>
							<select
								value={counterAssetId}
								onChange={(event) => setCounterAssetId(event.target.value)}
								className="min-h-[42px] w-full rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
							>
								{counterAssets.map((asset) => (
									<option key={asset.id} value={asset.id}>
										{asset.recommended ? `${asset.symbol} - suggested` : asset.symbol}
									</option>
								))}
							</select>
						</label>
					</div>

					<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
						<div>
							<p className="mb-1 text-sm font-medium text-text-secondary">Sell</p>
							<AssetPill asset={route?.sellAsset ?? null} locked={route?.sellAsset.role === "frankencoin"} />
						</div>
						<div>
							<p className="mb-1 text-sm font-medium text-text-secondary">Receive</p>
							<AssetPill asset={route?.buyAsset ?? null} locked={route?.buyAsset.role === "frankencoin"} />
						</div>
					</div>

					<label className="mt-4 block">
						<span className="mb-1 block text-sm font-medium text-text-secondary">Amount to sell</span>
						<input
							value={amount}
							onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
							placeholder="0.00"
							inputMode="decimal"
							className="min-h-[48px] w-full rounded-xl border border-[#e0d4bd] bg-white px-4 text-lg font-semibold text-text-primary outline-none transition placeholder:text-text-secondary/50 hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator dark:bg-card-content-primary"
						/>
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
					<h3 className="mt-1 text-lg font-semibold text-text-primary">{selectedMode.label}</h3>
					<p className="mt-2 text-sm leading-6 text-text-secondary">{selectedMode.description}</p>

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
	if (!isConnectedToRouteChain) return { status: "blocked", message: `Switch your wallet to ${route.sellAsset.chainId === 1 ? "Ethereum" : route.sellAsset.chainId === 8453 ? "Base" : "Gnosis"} for this route.` };
	if (!amount || Number(amount) <= 0) return { status: "idle", message: "Enter an amount to preview the route." };
	if (isWfpsMode(mode) && !route.lockedAsset) return { status: "blocked", message: "WFPS is not configured yet." };
	return {
		status: "ready",
		message: `Route is locked to ${route.sellAsset.symbol} -> ${route.buyAsset.symbol}. Quote fetching is the next implementation step before enabling signatures.`,
	};
}
