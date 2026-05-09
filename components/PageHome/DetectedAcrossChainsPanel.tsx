import AppButton from "@components/AppButton";
import AppButtonSecondary from "@components/AppButtonSecondary";
import ChainLogo from "@components/ChainLogo";
import { formatCurrency } from "@utils";
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
	status: "Current network" | "No ZCHF activity" | "Data unavailable";
	walletZchfStatus?: "loading" | "loaded" | "error" | "unsupported";
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
	borrowedZchf?: number | null;
	walletZchfComplete?: boolean;
	suggestion?: {
		message: string;
		action?: ChainAction;
	};
	onAction: (action: ChainAction) => void;
}

type SavingsSort = "interest" | "balance";

export default function DetectedAcrossChainsPanel({
	rows,
	currentChainId,
	dataUnavailable,
	borrowedZchf,
	walletZchfComplete,
	suggestion,
	onAction,
}: Props) {
	const [savingsSort, setSavingsSort] = useState<SavingsSort>("interest");

	const savingsRows = useMemo(() => {
		const active = rows.filter(
			(row) =>
				hasPositive(row.savingsZchf) ||
				hasPositive(row.claimableInterestZchf) ||
				(row.claimableInterestZchf === null && hasPositive(row.savingsZchf))
		);
		const interestDesc = (a: ChainRow, b: ChainRow) =>
			(b.claimableInterestZchf ?? Number.NEGATIVE_INFINITY) - (a.claimableInterestZchf ?? Number.NEGATIVE_INFINITY);
		return [...active].sort((a, b) => {
			if (savingsSort === "balance") {
				return (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0) || interestDesc(a, b);
			}
			return interestDesc(a, b) || (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0);
		});
	}, [rows, savingsSort]);

	const fpsRow = useMemo(() => rows.find((row) => row.chainId === mainnet.id && hasPositive(row.fpsHoldings)), [rows]);
	const walletRows = useMemo(() => {
		const positiveRows = rows.filter((row) => row.walletZchfStatus === "loaded" && hasPositive(row.walletZchf));
		const currentRow = rows.find((row) => row.isCurrent && row.walletZchfStatus === "loaded");
		if (currentRow && !positiveRows.some((row) => row.chainId === currentRow.chainId)) return [...positiveRows, currentRow];
		return positiveRows;
	}, [rows]);
	const walletReadFailures = useMemo(() => rows.filter((row) => row.walletZchfStatus === "error"), [rows]);
	const walletReadsLoading = useMemo(() => rows.some((row) => row.walletZchfStatus === "loading"), [rows]);
	const totalSavings = savingsRows.reduce((acc, row) => acc + (row.savingsZchf ?? 0), 0);
	const interestSummary = useMemo(() => {
		if (savingsRows.length === 0) return { label: "Claimable interest", value: "-", positive: false };
		const values = savingsRows.map((r) => r.claimableInterestZchf);
		if (values.some((v) => v === null || v === undefined)) {
			return { label: "Claimable interest", value: "Interest data is loading.", positive: false };
		}
		const sum = values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
		return { label: "Claimable interest", value: `${formatCurrency(sum, 2, 2)} ZCHF`, positive: sum > 0 };
	}, [savingsRows]);
	const hasBorrowing = typeof borrowedZchf === "number" && borrowedZchf > 0;
	const useLedgerLayout = savingsRows.length >= 3;

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
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h3 className="text-xl font-semibold text-text-primary">Active Allocations</h3>
						<p className="mt-1 text-sm text-text-secondary">Manage where your ZCHF, savings, FPS, and borrowing live.</p>
					</div>
					{savingsRows.length >= 3 ? (
						<div className="flex rounded-lg border border-[#e0d4bd] bg-card-content-secondary p-1 dark:border-menu-separator">
							<SortButton active={savingsSort === "interest"} onClick={() => setSavingsSort("interest")}>
								Sort by interest
							</SortButton>
							<SortButton active={savingsSort === "balance"} onClick={() => setSavingsSort("balance")}>
								Sort by balance
							</SortButton>
						</div>
					) : null}
				</div>

				{useLedgerLayout ? (
					<div className="mt-5 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
						<div className="self-start">
							<SavingsGroup savingsRows={savingsRows} totalSavings={totalSavings} interestSummary={interestSummary} dataUnavailable={dataUnavailable} onAction={onAction} />
						</div>
						<div className="space-y-4">
							<WalletGroup
								walletRows={walletRows}
								walletReadsLoading={walletReadsLoading}
								walletReadFailures={walletReadFailures.length}
								walletZchfComplete={walletZchfComplete}
								onAction={onAction}
							/>
							<InvestmentsGroup fpsRow={fpsRow} currentChainId={currentChainId} onAction={onAction} />
							<BorrowingGroup hasBorrowing={hasBorrowing} borrowedZchf={borrowedZchf} currentChainId={currentChainId} onAction={onAction} />
						</div>
					</div>
				) : (
					<div className="mt-5 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
						<SavingsGroup savingsRows={savingsRows} totalSavings={totalSavings} interestSummary={interestSummary} dataUnavailable={dataUnavailable} onAction={onAction} />
						<WalletGroup
							walletRows={walletRows}
							walletReadsLoading={walletReadsLoading}
							walletReadFailures={walletReadFailures.length}
							walletZchfComplete={walletZchfComplete}
							onAction={onAction}
						/>
						<InvestmentsGroup fpsRow={fpsRow} currentChainId={currentChainId} onAction={onAction} />
						<BorrowingGroup hasBorrowing={hasBorrowing} borrowedZchf={borrowedZchf} currentChainId={currentChainId} onAction={onAction} />
					</div>
				)}
			</section>
		</div>
	);
}

function SavingsGroup({
	savingsRows,
	totalSavings,
	interestSummary,
	dataUnavailable,
	onAction,
}: {
	savingsRows: ChainRow[];
	totalSavings: number;
	interestSummary: { label: string; value: string; positive: boolean };
	dataUnavailable?: boolean;
	onAction: (action: ChainAction) => void;
}) {
	const title = savingsRows.length <= 1 ? "Savings" : `Savings across ${savingsRows.length} chains`;
	return (
		<AllocationGroup
			title={title}
			summary={[
				{ label: "Total savings", value: savingsRows.length > 0 ? `${formatCurrency(totalSavings, 2, 2)} ZCHF` : "-" },
				{
					label: interestSummary.label,
					value: savingsRows.length > 0 ? interestSummary.value : "-",
					positive: interestSummary.positive,
				},
			]}
		>
			{savingsRows.length === 1 ? (
				<p className="mb-2 text-xs text-text-secondary">1 active chain</p>
			) : null}
			{savingsRows.length > 0 ? (
				<div className="divide-y divide-[#eadfcd] dark:divide-menu-separator">
					{savingsRows.map((row) => (
						<SavingsAllocationRow key={row.chainId} row={row} onAction={onAction} />
					))}
				</div>
			) : (
				<EmptyAllocation copy={dataUnavailable ? "Savings data is unavailable." : "No active savings positions loaded."} />
			)}
		</AllocationGroup>
	);
}

function WalletGroup({
	walletRows,
	walletReadsLoading,
	walletReadFailures,
	walletZchfComplete,
	onAction,
}: {
	walletRows: ChainRow[];
	walletReadsLoading: boolean;
	walletReadFailures: number;
	walletZchfComplete?: boolean;
	onAction: (action: ChainAction) => void;
}) {
	return (
		<AllocationGroup title="Wallet">
			{walletRows.length > 0 ? (
				<div className="divide-y divide-[#eadfcd] dark:divide-menu-separator">
					{walletRows.map((row) => (
						<WalletAllocationRow key={row.chainId} row={row} onAction={onAction} />
					))}
				</div>
			) : (
				<EmptyAllocation
					copy={
						walletReadsLoading
							? "Wallet ZCHF is loading."
							: walletReadFailures > 0
							? "Some wallet balances could not be loaded."
							: "No wallet ZCHF found across supported chains."
					}
				/>
			)}
			{walletReadFailures > 0 ? <p className="mt-3 text-xs text-text-secondary">Some wallet balances could not be loaded.</p> : null}
			{walletZchfComplete ? <p className="mt-3 text-xs text-text-secondary">Wallet balances loaded across supported ZCHF chains.</p> : null}
		</AllocationGroup>
	);
}

function InvestmentsGroup({
	fpsRow,
	currentChainId,
	onAction,
}: {
	fpsRow?: ChainRow;
	currentChainId: ChainId;
	onAction: (action: ChainAction) => void;
}) {
	return (
		<AllocationGroup title="Investments">
			{fpsRow ? (
				<SimpleAllocationRow
					chainName="Ethereum"
					currentChainId={currentChainId}
					primary={`${formatCurrency(fpsRow.fpsHoldings ?? 0, 2, 2)} FPS`}
					action={{ label: "Open Invest", targetChainId: mainnet.id as ChainId, href: "/equity" }}
					onAction={onAction}
				/>
			) : (
				<EmptyAllocation copy="No FPS investment." />
			)}
		</AllocationGroup>
	);
}

function BorrowingGroup({
	hasBorrowing,
	borrowedZchf,
	currentChainId,
	onAction,
}: {
	hasBorrowing: boolean;
	borrowedZchf?: number | null;
	currentChainId: ChainId;
	onAction: (action: ChainAction) => void;
}) {
	return (
		<AllocationGroup title="Borrowing">
			{hasBorrowing ? (
				<SimpleAllocationRow
					currentChainId={currentChainId}
					primary={`Total borrowed: ${formatCurrency(borrowedZchf!, 2, 2)} ZCHF`}
					action={{ label: "Open Portfolio", targetChainId: currentChainId, href: "/mypositions" }}
					onAction={onAction}
				/>
			) : (
				<EmptyAllocation copy={borrowedZchf === null ? "Borrowing data is loading." : "No active borrowing."} />
			)}
		</AllocationGroup>
	);
}

function AllocationGroup({
	title,
	summary,
	children,
}: {
	title: string;
	summary?: { label: string; value: string; positive?: boolean }[];
	children: React.ReactNode;
}) {
	return (
		<div className="self-start h-auto rounded-xl border border-[#e6dbca] bg-card-content-secondary p-4 shadow-sm dark:border-menu-separator">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<h4 className="text-base font-semibold text-text-primary">{title}</h4>
				{summary && summary.length > 0 ? (
					<div className="flex flex-wrap gap-4 text-right text-xs text-text-secondary">
						{summary.map((item) => (
							<div key={item.label}>
								<div>{item.label}</div>
								<div className={`mt-1 text-sm font-semibold ${item.positive ? "text-text-success" : "text-text-primary"}`}>
									{item.value}
								</div>
							</div>
						))}
					</div>
				) : null}
			</div>
			<div className="mt-3">{children}</div>
		</div>
	);
}

function SavingsAllocationRow({ row, onAction }: { row: ChainRow; onAction: (action: ChainAction) => void }) {
	const interestDisplay =
		row.claimableInterestZchf === null || row.claimableInterestZchf === undefined
			? "—"
			: `${formatCurrency(row.claimableInterestZchf, 2, 2)} ZCHF`;
	const savingsDisplay =
		row.savingsZchf === null || row.savingsZchf === undefined ? "—" : `${formatCurrency(row.savingsZchf, 2, 2)} ZCHF`;
	return (
		<div className="grid grid-cols-1 gap-3 py-3 text-sm md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center">
			<ChainCell name={row.name} />
			<div>
				<div className="text-xs text-text-secondary">Savings</div>
				<div className="font-semibold text-text-primary">{savingsDisplay}</div>
			</div>
			<div>
				<div className="text-xs text-text-secondary">Interest</div>
				<div
					className={`font-semibold ${
						row.claimableInterestZchf != null && row.claimableInterestZchf > 0 ? "text-text-success" : "text-text-primary"
					}`}
				>
					{interestDisplay}
				</div>
			</div>
			<RowAction
				action={{ label: "Open Earn", targetChainId: row.chainId, href: "/savings" }}
				helper={row.isCurrent ? undefined : `Requires ${row.name}`}
				onAction={onAction}
			/>
		</div>
	);
}

function WalletAllocationRow({ row, onAction }: { row: ChainRow; onAction: (action: ChainAction) => void }) {
	return (
		<div className="grid grid-cols-1 gap-3 py-3 text-sm md:grid-cols-[1.2fr_1fr_auto] md:items-center">
			<ChainCell name={row.name} />
			<div>
				<div className="text-xs text-text-secondary">Wallet ZCHF</div>
				<div className="font-semibold text-text-primary">{formatCurrency(row.walletZchf ?? 0, 2, 2)} ZCHF</div>
			</div>
			<RowAction
				action={{ label: "Open Transfer", targetChainId: row.chainId, href: "/transfer" }}
				helper={row.isCurrent ? undefined : `Requires ${row.name}`}
				onAction={onAction}
			/>
		</div>
	);
}

function SimpleAllocationRow({
	chainName,
	currentChainId,
	primary,
	action,
	onAction,
}: {
	chainName?: string;
	currentChainId?: ChainId;
	primary: string;
	action: ChainAction;
	onAction: (action: ChainAction) => void;
}) {
	const requiresNetworkSwitch =
		currentChainId !== undefined && action.targetChainId !== currentChainId && Boolean(chainName);
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-[#eadfcd] bg-[#fffaf0] p-3 dark:border-menu-separator dark:bg-card-body-primary md:flex-row md:items-center md:justify-between">
			<div className="space-y-2">
				{chainName ? <ChainCell name={chainName} /> : null}
				<div className="font-semibold text-text-primary">{primary}</div>
			</div>
			<RowAction
				action={action}
				helper={requiresNetworkSwitch ? `Requires ${chainName}` : undefined}
				onAction={onAction}
			/>
		</div>
	);
}

function ChainCell({ name }: { name: string }) {
	return (
		<div className="flex items-center gap-2">
			<ChainLogo chain={name.toLowerCase()} size={5} />
			<span className="font-semibold text-text-primary">{name}</span>
		</div>
	);
}

function RowAction({ action, helper, onAction }: { action: ChainAction; helper?: string; onAction: (action: ChainAction) => void }) {
	return (
		<div className="flex flex-col gap-1 md:items-end">
			<AppButtonSecondary size="small" width="w-auto" className="min-h-[34px] px-3 text-xs" onClick={() => onAction(action)}>
				{action.label}
			</AppButtonSecondary>
			{helper ? <span className="text-[11px] text-text-secondary">{helper}</span> : null}
		</div>
	);
}

function SortButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
				active ? "bg-[#f4ead4] text-[#80601d] dark:bg-[#242b38] dark:text-[#e5c978]" : "text-text-secondary hover:text-text-primary"
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function EmptyAllocation({ copy }: { copy: string }) {
	return (
		<p className="rounded-lg border border-dashed border-[#e0d4bd] p-3 text-sm text-text-secondary dark:border-menu-separator">
			{copy}
		</p>
	);
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}
