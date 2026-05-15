import { useEffect, useMemo, useRef, useState } from "react";
import { TradeType, type CowSwapWidgetParams, type SupportedChainId } from "@cowprotocol/widget-lib";
import { CowSwapDirection, getCowRouteLabels, getCowSwapNetwork, getCowZchfAddress } from "../../utils/cowswap";
import type { ChainId } from "@frankencoin/zchf";

type Props = {
	direction: CowSwapDirection;
	chainId: ChainId;
};

export default function ZchfCowSwapWidget({ direction, chainId }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const network = getCowSwapNetwork(chainId);
	const zchfAddress = getCowZchfAddress(chainId);
	const routeLabels = network ? getCowRouteLabels(direction, network) : null;

	const params = useMemo((): CowSwapWidgetParams | null => {
		if (!network || !zchfAddress) return null;
		const sellAsset = direction === "buy-zchf" ? network.counterAsset : zchfAddress;
		const buyAsset = direction === "buy-zchf" ? zchfAddress : network.counterAsset;
		const origin = typeof window === "undefined" ? "" : window.location.origin;

		return {
			appCode: "ZCHF-Desk",
			width: "100%",
			height: "640px",
			maxHeight: 760,
			chainId: chainId as SupportedChainId,
			tradeType: TradeType.SWAP,
			sell: { asset: sellAsset },
			buy: { asset: buyAsset },
			standaloneMode: true,
			tokenLists: origin ? [`${origin}/api/cow-token-list`] : undefined,
			disableCrossChainSwap: true,
			disablePostedOrderConfirmationModal: false,
			disableProgressBar: false,
			disableToastMessages: false,
		};
	}, [chainId, direction, network, zchfAddress]);

	useEffect(() => {
		let cancelled = false;
		const container = containerRef.current;
		if (!container || !params) return;

		setStatus("loading");
		setError(null);
		container.innerHTML = "";

		async function mountWidget() {
			const widgetParams = params;
			if (!widgetParams) return;
			try {
				const { createCowSwapWidget } = await import("@cowprotocol/widget-lib");
				if (cancelled || !containerRef.current) return;
				createCowSwapWidget(containerRef.current, { params: widgetParams });
				setStatus("ready");
			} catch (e) {
				if (cancelled) return;
				setStatus("error");
				setError(e instanceof Error ? e.message : "CoW widget could not be loaded.");
			}
		}

		void mountWidget();

		return () => {
			cancelled = true;
			if (container) container.innerHTML = "";
		};
	}, [params]);

	if (!network || !zchfAddress || !routeLabels) {
		return (
			<div className="rounded-xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
				<h2 className="text-lg font-semibold">ZCHF route unavailable</h2>
				<p className="mt-2 max-w-2xl text-sm leading-6">Choose a supported ZCHF network.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-5 max-w-[720px] overflow-hidden rounded-2xl border border-[#e0d4bd] bg-[#fffdf8] shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
			<div className="border-b border-[#e0d4bd] bg-card-content-secondary/70 px-4 py-3 dark:border-menu-separator dark:bg-card-content-secondary">
				<p className="text-xs uppercase tracking-wider text-text-secondary">ZCHF Desk swap</p>
				<p className="mt-1 text-sm font-semibold text-text-primary">
					{routeLabels.sell} to {routeLabels.buy} on {network.label}
				</p>
			</div>
			<div className="relative min-h-[640px] bg-white">
				{status === "loading" ? (
					<div className="absolute inset-0 flex items-center justify-center bg-white text-sm font-medium text-slate-700">
						Loading ZCHF swap module...
					</div>
				) : null}
				{status === "error" ? (
					<div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center">
						<div>
							<p className="text-sm font-semibold text-slate-900">CoW widget could not be loaded.</p>
							<p className="mt-2 text-xs leading-5 text-slate-600">{error}</p>
						</div>
					</div>
				) : null}
				<div ref={containerRef} className="min-h-[640px] w-full" />
			</div>
		</div>
	);
}
