import AppButtonSecondary from "@components/AppButtonSecondary";
import { formatCurrency, getChain } from "@utils";
import { ChainId } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import { useMemo, useState } from "react";

export type ChainAction = {
	label: string;
	targetChainId: ChainId;
	href: string;
};

export type ChainRow = {
	chainId: ChainId;
	name: string;
	isCurrent: boolean;
	status: "Current network" | "Savings detected" | "No ZCHF activity" | "Data unavailable";
	walletZchf?: number | null;
	savingsZchf?: number | null;
	claimableInterestZchf?: number | null;
	borrowedZchf?: number | null;
	fpsHoldings?: number | null;
	badges: string[];
	actions: ChainAction[];
};

interface Props {
	rows: ChainRow[];
	currentChainId: ChainId;
	suggestion?: {
		message: string;
		action?: ChainAction;
	};
	onAction: (action: ChainAction) => void;
}

export default function DetectedAcrossChainsPanel({ rows, currentChainId, suggestion, onAction }: Props) {
	const [showAll, setShowAll] = useState(false);

	const detectedRows = useMemo(
		() => rows.filter((row) => row.badges.includes("Savings active") || row.badges.includes("Interest available")),
		[rows]
	);
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
						{suggestion.action ? (
							<AppButtonSecondary size="small" width="w-auto" className="h-8 px-3 text-xs" onClick={() => onAction(suggestion.action!)}>
								{suggestion.action.label}
							</AppButtonSecondary>
						) : null}
					</div>
				</div>
			) : null}
			<div className="mt-3 space-y-2">
				{visibleRows.map((row) => (
					<div key={row.chainId} className="rounded-lg border border-menu-separator bg-card-body-primary px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<div className="text-sm font-medium text-text-primary">{row.name}</div>
								<div className="text-xs text-text-secondary">{row.status}</div>
							</div>
							{row.isCurrent ? (
								<span
									className="inline-flex items-center rounded-full border border-menu-separator px-2 py-1 text-[10px] font-medium text-text-secondary"
									title="Your wallet is currently connected to this network."
								>
									Current
								</span>
							) : null}
						</div>
						<div className="mt-2 flex flex-wrap gap-1">
							{row.badges.map((badge) => (
								<span key={`${row.chainId}-${badge}`} className="rounded-full border border-card-content-highlight/40 px-2 py-1 text-[10px] text-text-secondary">
									{badge}
								</span>
							))}
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
							<div>
								Claimable interest:{" "}
								<span className="font-medium text-text-primary">
									{row.claimableInterestZchf === null || row.claimableInterestZchf === undefined
										? "—"
										: `${formatCurrency(row.claimableInterestZchf, 2, 2)} ZCHF`}
								</span>
							</div>
							<div>
								Borrowed:{" "}
								<span className="font-medium text-text-primary">
									{row.borrowedZchf === null || row.borrowedZchf === undefined ? "—" : `${formatCurrency(row.borrowedZchf, 2, 2)} ZCHF`}
								</span>
							</div>
							<div>
								FPS:{" "}
								<span className="font-medium text-text-primary">
									{row.fpsHoldings === null || row.fpsHoldings === undefined ? "—" : formatCurrency(row.fpsHoldings, 2, 2)}
								</span>
							</div>
						</div>
						<div className="mt-2 flex flex-wrap gap-2">
							{row.actions.map((action) => (
								<AppButtonSecondary
									key={`${row.chainId}-${action.label}`}
									size="small"
									width="w-auto"
									className="h-8 px-3 text-xs"
									onClick={() => onAction(action)}
								>
									{action.label}
								</AppButtonSecondary>
							))}
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
