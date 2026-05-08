import AppButtonSecondary from "@components/AppButtonSecondary";
import { formatCurrency, getChain } from "@utils";
import { ChainId } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import { useMemo, useState } from "react";

export type ChainRow = {
	chainId: ChainId;
	name: string;
	isCurrent: boolean;
	status: "Current" | "Detected" | "No savings detected" | "Not checked" | "Data unavailable";
	walletZchf?: number | null;
	savingsZchf?: number | null;
};

interface Props {
	rows: ChainRow[];
	currentChainId: ChainId;
	fpsKnown: boolean;
	onSwitch: (chainId: ChainId) => void;
}

export default function DetectedAcrossChainsPanel({ rows, currentChainId, fpsKnown, onSwitch }: Props) {
	const [showAll, setShowAll] = useState(false);

	const detectedRows = useMemo(() => rows.filter((row) => row.status === "Detected"), [rows]);
	const currentRow = useMemo(() => rows.find((row) => row.isCurrent), [rows]);
	const ethereumRow = useMemo(() => rows.find((row) => row.chainId === mainnet.id), [rows]);
	const collapsedIds = new Set<ChainId>([
		...(currentRow ? [currentRow.chainId] : []),
		...detectedRows.map((row) => row.chainId),
		...(ethereumRow ? [ethereumRow.chainId] : []),
	]);
	const collapsedRows = rows.filter((row) => collapsedIds.has(row.chainId));
	const otherChainNames = rows.filter((row) => !collapsedIds.has(row.chainId)).map((row) => row.name);
	const visibleRows = showAll ? rows : collapsedRows;

	const suggestion = useMemo(() => {
		const detectedOtherChain = detectedRows.find((row) => row.chainId !== currentChainId);
		if (currentChainId === mainnet.id && detectedOtherChain) {
			return {
				message: `Your wallet is connected to Ethereum. Savings were detected on ${detectedOtherChain.name}.`,
				actionLabel: `Switch to ${detectedOtherChain.name}`,
				targetChainId: detectedOtherChain.chainId,
			};
		}
		if (currentChainId !== mainnet.id && fpsKnown) {
			return {
				message: "FPS is managed on Ethereum mainnet.",
				actionLabel: "Switch to Ethereum",
				targetChainId: mainnet.id as ChainId,
			};
		}
		return null;
	}, [detectedRows, currentChainId, fpsKnown]);

	return (
		<section className="rounded-2xl border border-menu-separator bg-card-content-secondary p-4">
			<div className="flex items-start justify-between gap-3 border-b border-menu-separator pb-3">
				<div>
					<h3 className="text-sm font-semibold uppercase tracking-wide text-text-subheader">Chain awareness</h3>
					<p className="mt-1 text-sm text-text-secondary">Current network, detected savings, and FPS context.</p>
				</div>
				<button
					type="button"
					className="text-xs font-medium text-card-content-highlight hover:text-text-primary"
					onClick={() => setShowAll((prev) => !prev)}
				>
					{showAll ? "Hide chains" : "Show all chains"}
				</button>
			</div>
			{suggestion ? (
				<div className="mt-3 rounded-lg border border-card-content-highlight/40 bg-layout-footer px-3 py-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-sm text-text-primary">{suggestion.message}</p>
						<AppButtonSecondary
							size="small"
							width="w-auto"
							className="h-8 px-3 text-xs"
							onClick={() => onSwitch(suggestion.targetChainId)}
						>
							{suggestion.actionLabel}
						</AppButtonSecondary>
					</div>
				</div>
			) : null}
			<div className="mt-3 space-y-2">
				{visibleRows.map((row) => (
					<div key={row.chainId} className="rounded-lg border border-menu-separator bg-card-body-primary px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<div className="text-sm font-medium text-text-primary">{row.name}</div>
								<div className="text-xs text-text-secondary">
									{row.isCurrent ? "Current network" : row.status === "Detected" ? "Savings detected" : row.status}
									{row.chainId === mainnet.id ? " · FPS on Ethereum" : ""}
								</div>
							</div>
							<AppButtonSecondary
								className="h-8 px-3 text-xs"
								size="small"
								width="w-auto"
								disabled={row.isCurrent}
								onClick={() => onSwitch(row.chainId)}
							>
								{row.isCurrent ? "Current" : `Switch to ${getChain(row.chainId).name}`}
							</AppButtonSecondary>
						</div>
						<div className="mt-2 grid grid-cols-1 gap-1 text-xs text-text-secondary sm:grid-cols-2">
							<div>
								Wallet ZCHF:{" "}
								<span className="font-medium text-text-primary">
									{row.walletZchf === null || row.walletZchf === undefined ? "—" : `${formatCurrency(row.walletZchf, 2, 2)} ZCHF`}
								</span>
							</div>
							<div>
								Savings balance:{" "}
								<span className="font-medium text-text-primary">
									{row.savingsZchf === null || row.savingsZchf === undefined ? "—" : `${formatCurrency(row.savingsZchf, 2, 2)} ZCHF`}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
			{!showAll && otherChainNames.length > 0 ? (
				<p className="mt-2 text-xs text-text-secondary">Other supported chains: {otherChainNames.join(", ")}</p>
			) : null}
		</section>
	);
}
