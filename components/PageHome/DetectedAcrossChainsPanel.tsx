import AppButton from "@components/AppButton";
import ChainLogo from "@components/ChainLogo";
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
	const supportedChainsLabel = quietChains.join(", ");

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

			<section className="rounded-xl border border-[#e0d4bd] bg-[#fffbf2] p-5 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-semibold text-text-primary">Active locations</h3>
						<p className="mt-1 text-sm text-text-secondary">Where your ZCHF, savings, and FPS currently live.</p>
					</div>
					{rows.length > activeRows.length ? (
						<button
							type="button"
							className="text-sm font-semibold text-[#8a6a22] underline-offset-4 hover:underline dark:text-[#e5c978]"
							onClick={() => setShowAll((prev) => !prev)}
						>
							{showAll ? "Hide chains" : "View all chains"}
						</button>
					) : null}
				</div>

				<div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
					{visibleRows.map((row) => (
						<LocationCard key={row.chainId} row={row} dataUnavailable={dataUnavailable} showEmptyState={showAll} />
					))}
				</div>

				{!showAll && quietChains.length > 0 ? (
					<div className="mt-4 border-t border-[#eadfcd] pt-4 dark:border-menu-separator">
						<p className="text-xs text-text-secondary">
							{isConnected
								? `Other supported chains: ${supportedChainsLabel}`
								: `Other supported chains: ${supportedChainsLabel}`}
						</p>
					</div>
				) : null}
			</section>
		</div>
	);
}

function LocationCard({ row, dataUnavailable, showEmptyState }: { row: ChainRow; dataUnavailable?: boolean; showEmptyState: boolean }) {
	const facts = getLocationFacts(row);
	const accentClass = row.isCurrent
		? "border-[#d8bf86] shadow-[inset_2px_0_0_0_#c9a54f]"
		: hasPositive(row.savingsZchf) || hasPositive(row.claimableInterestZchf)
		? "border-blue-200 shadow-[inset_2px_0_0_0_#2563eb] dark:border-blue-900"
		: "border-[#e6dbca]";

	return (
		<div
			className={`rounded-2xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(251,246,237,0.92))] p-4 shadow-sm dark:bg-card-body-primary ${accentClass} dark:border-menu-separator`}
		>
			<div className="flex items-center gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e3d6c1] bg-[#f7f1e6] dark:border-menu-separator dark:bg-card-content-primary">
					<ChainLogo chain={row.name.toLowerCase()} size={6} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-[22px] font-semibold leading-none text-text-primary">{row.name}</div>
					<div className="mt-2 flex flex-wrap gap-2">
						{row.isCurrent ? <LocationPill>Current</LocationPill> : null}
						{hasPositive(row.fpsHoldings) ? <LocationPill variant="brass">FPS</LocationPill> : null}
						{hasPositive(row.savingsZchf) ? <LocationPill variant="blue">Savings</LocationPill> : null}
						{hasPositive(row.claimableInterestZchf) ? <LocationPill variant="green">Interest</LocationPill> : null}
					</div>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
				{dataUnavailable && !row.isCurrent ? <LocationMetric tone="muted" label="Data unavailable" /> : null}
				{!dataUnavailable && facts.map((fact) => <LocationMetric key={`${row.chainId}-${fact.label}`} {...fact} />)}
				{!dataUnavailable && facts.length === 0 && showEmptyState ? <LocationMetric tone="muted" label="No ZCHF activity" /> : null}
			</div>
		</div>
	);
}

function LocationMetric({ label, tone = "default" }: { label: string; tone?: "default" | "positive" | "muted" }) {
	const dotClass = tone === "positive" ? "bg-[#0e9f6e]" : tone === "muted" ? "bg-[#c4b59a] dark:bg-[#6f6a5f]" : "bg-[#b49349]";

	return (
		<span className="inline-flex items-center gap-2 text-base text-text-primary">
			<span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
			{label}
		</span>
	);
}

function LocationPill({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "brass" | "blue" | "green" }) {
	const pillClass = {
		default: "border-[#d7c28a] bg-[#f7ecd2] text-[#80601d] dark:border-[#8a7448] dark:bg-[#242b38] dark:text-[#e5c978]",
		brass: "border-[#dcc490] bg-[#f9f0da] text-[#896521] dark:border-[#8a7448] dark:bg-[#242b38] dark:text-[#e5c978]",
		blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300",
		green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
	}[variant];

	return <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${pillClass}`}>{children}</span>;
}

function getLocationFacts(row: ChainRow) {
	return [
		row.fpsHoldings !== null && row.fpsHoldings !== undefined ? { label: `FPS ${formatCurrency(row.fpsHoldings, 2, 2)}` } : null,
		row.walletZchf !== null && row.walletZchf !== undefined ? { label: `Wallet ZCHF ${formatCurrency(row.walletZchf, 2, 2)}` } : null,
		row.savingsZchf !== null && row.savingsZchf !== undefined && row.savingsZchf > 0
			? { label: `Savings ${formatCurrency(row.savingsZchf, 2, 2)} ZCHF` }
			: null,
		row.claimableInterestZchf !== null && row.claimableInterestZchf !== undefined && row.claimableInterestZchf > 0
			? { label: `Interest ${formatCurrency(row.claimableInterestZchf, 2, 2)} ZCHF`, tone: "positive" as const }
			: null,
	].filter(Boolean) as { label: string; tone?: "default" | "positive" }[];
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}
