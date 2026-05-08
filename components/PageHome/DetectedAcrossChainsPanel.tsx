import AppButton from "@components/AppButton";
import { formatCurrency } from "@utils";
import { ChainId } from "@frankencoin/zchf";
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
	status: "Current network" | "No ZCHF activity" | "Data unavailable";
	walletZchf?: number | null;
	savingsZchf?: number | null;
	claimableInterestZchf?: number | null;
	fpsHoldings?: number | null;
	badges: string[];
	actions: ChainAction[];
};

interface Props {
	rows: ChainRow[];
	currentChainId: ChainId;
	isConnected: boolean;
	dataUnavailable?: boolean;
	suggestion?: {
		message: string;
		action?: ChainAction;
	};
	onAction: (action: ChainAction) => void;
}

export default function DetectedAcrossChainsPanel({ rows, isConnected, dataUnavailable, suggestion, onAction }: Props) {
	const [showAll, setShowAll] = useState(false);

	const activeRows = useMemo(
		() =>
			rows.filter((row) => {
				if (row.isCurrent) return true;
				return (
					hasPositive(row.walletZchf) ||
					hasPositive(row.savingsZchf) ||
					hasPositive(row.claimableInterestZchf) ||
					hasPositive(row.fpsHoldings)
				);
			}),
		[rows]
	);

	const visibleRows = showAll ? rows : activeRows;
	const quietChains = rows.filter((row) => !activeRows.some((activeRow) => activeRow.chainId === row.chainId)).map((row) => row.name);

	return (
		<div className="space-y-3">
			{suggestion ? (
				<section className="relative overflow-hidden rounded-xl border border-[#d7c28a]/70 bg-[#fff8ea] px-4 py-3 shadow-sm dark:border-[#8a7448]/60 dark:bg-[#1b2230]">
					<div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:radial-gradient(#0b1f3a_0.8px,transparent_0.8px)] [background-size:7px_7px]" />
					<div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="flex items-start gap-3">
							<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c4a75f]/50 bg-[#f4ead4] text-[#9b7625] dark:border-[#8a7448] dark:bg-[#242b38] dark:text-[#e5c978]">
								*
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b7625] dark:text-[#e5c978]">
									Suggested next action
								</div>
								<p className="mt-1 text-base font-medium text-text-primary">{suggestion.message}</p>
							</div>
						</div>
						{suggestion.action ? (
							<AppButton
								size="small"
								width="w-auto"
								className="h-10 px-4 text-sm"
								onClick={() => onAction(suggestion.action!)}
							>
								{suggestion.action.label}
							</AppButton>
						) : null}
					</div>
				</section>
			) : null}

			<section className="rounded-xl border border-[#e0d4bd] bg-[#fffbf2] p-4 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="text-sm font-semibold text-text-primary">Active locations</h3>
					{rows.length > activeRows.length ? (
						<button
							type="button"
							className="text-xs font-semibold text-[#8a6a22] underline-offset-4 hover:underline dark:text-[#e5c978]"
							onClick={() => setShowAll((prev) => !prev)}
						>
							{showAll ? "Hide chains" : "View all chains"}
						</button>
					) : null}
				</div>

				<div className="mt-3 flex flex-col gap-2 xl:flex-row xl:flex-wrap">
					{visibleRows.map((row) => (
						<div
							key={row.chainId}
							className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-[#e5dac6] bg-card-content-secondary px-3 py-2 text-sm text-text-secondary dark:border-menu-separator"
						>
							<span className="font-semibold text-text-primary">{row.name}</span>
							{row.isCurrent ? <LocationPill>Current</LocationPill> : null}
							{dataUnavailable && !row.isCurrent ? <LocationFact label="Data unavailable" /> : <LocationFacts row={row} />}
							{showAll && !hasAnyLocationData(row) && !dataUnavailable ? <LocationFact label="No ZCHF activity" /> : null}
						</div>
					))}
				</div>

				{!showAll && quietChains.length > 0 ? (
					<p className="mt-3 text-xs text-text-secondary">
						{isConnected
							? `Other supported chains: ${quietChains.join(", ")} - no ZCHF activity detected.`
							: `Connect wallet to detect ZCHF activity on ${quietChains.join(", ")}.`}
					</p>
				) : null}
			</section>
		</div>
	);
}

function LocationFacts({ row }: { row: ChainRow }) {
	const facts = [
		row.fpsHoldings !== null && row.fpsHoldings !== undefined ? `FPS ${formatCurrency(row.fpsHoldings, 2, 2)}` : null,
		row.walletZchf !== null && row.walletZchf !== undefined ? `Wallet ZCHF ${formatCurrency(row.walletZchf, 2, 2)}` : null,
		row.savingsZchf !== null && row.savingsZchf !== undefined && row.savingsZchf > 0
			? `Savings ${formatCurrency(row.savingsZchf, 2, 2)} ZCHF`
			: null,
		row.claimableInterestZchf !== null && row.claimableInterestZchf !== undefined && row.claimableInterestZchf > 0
			? `Interest ${formatCurrency(row.claimableInterestZchf, 2, 2)} ZCHF`
			: null,
	].filter(Boolean);

	if (facts.length === 0) return <LocationFact label="No ZCHF activity" />;

	return (
		<>
			{facts.map((fact) => (
				<LocationFact key={fact} label={fact!} />
			))}
		</>
	);
}

function LocationFact({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-2 text-xs text-text-secondary before:h-1 before:w-1 before:rounded-full before:bg-[#c4a75f]">
			{label}
		</span>
	);
}

function LocationPill({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded-full border border-[#d7c28a] bg-[#f7ecd2] px-2 py-0.5 text-[11px] font-medium text-[#80601d] dark:border-[#8a7448] dark:bg-[#242b38] dark:text-[#e5c978]">
			{children}
		</span>
	);
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}

function hasAnyLocationData(row: ChainRow) {
	return row.walletZchf !== null || row.savingsZchf !== null || row.claimableInterestZchf !== null || row.fpsHoldings !== null;
}
