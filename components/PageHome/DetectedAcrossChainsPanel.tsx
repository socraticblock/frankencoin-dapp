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
	/** When true, navigate immediately without switching the wallet (e.g. Earn opens with `chainId` context). */
	skipNetworkSwitch?: boolean;
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

type EarningSort = "interest" | "balance";

const WALLET_ZCHF_DUST_THRESHOLD = 0.01;

export default function DetectedAcrossChainsPanel({
	rows,
	currentChainId,
	isConnected,
	dataUnavailable,
	borrowedZchf,
	walletZchfComplete,
	onAction,
}: Props) {
	const [earningSort, setEarningSort] = useState<EarningSort>("interest");

	const earningRows = useMemo(() => {
		const active = rows.filter((row) => hasPositive(row.savingsZchf) || hasPositive(row.claimableInterestZchf));
		const interestDesc = (a: ChainRow, b: ChainRow) => (b.claimableInterestZchf ?? 0) - (a.claimableInterestZchf ?? 0);
		return [...active].sort((a, b) => {
			if (earningSort === "balance") return (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0) || interestDesc(a, b);
			return interestDesc(a, b) || (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0);
		});
	}, [rows, earningSort]);

	const fpsRow = useMemo(() => rows.find((row) => row.chainId === mainnet.id && hasPositive(row.fpsHoldings)), [rows]);
	const walletRows = useMemo(() => rows.filter((row) => row.walletZchfStatus === "loaded" && hasMeaningfulWalletZchf(row.walletZchf)), [rows]);
	const walletReadFailures = useMemo(() => rows.filter((row) => row.walletZchfStatus === "error"), [rows]);
	const walletReadsLoading = useMemo(() => rows.some((row) => row.walletZchfStatus === "loading"), [rows]);
	const totalEarning = earningRows.reduce((acc, row) => acc + (row.savingsZchf ?? 0), 0);
	const interestSummary = useMemo(() => {
		if (earningRows.length === 0) return { label: "Ready interest", value: "-", positive: false };
		const values = earningRows.map((r) => r.claimableInterestZchf ?? 0);
		const sum = values.reduce<number>((acc, v) => acc + v, 0);
		return { label: "Ready interest", value: `${formatCurrency(sum, 2, 2)} ZCHF`, positive: sum > 0 };
	}, [earningRows]);
	const hasBorrowing = typeof borrowedZchf === "number" && borrowedZchf > 0;
	const hasActiveAllocations = earningRows.length > 0 || walletRows.length > 0 || Boolean(fpsRow) || hasBorrowing;
	const useLedgerLayout = earningRows.length >= 3;

	if (!isConnected) return null;

	return (
		<section className="rounded-xl border border-[#e0d4bd] bg-[#fffbf2] p-5 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-xl font-semibold text-text-primary">Active Allocations</h3>
					<p className="mt-1 text-sm text-text-secondary">Only active wallet, earning, protocol investment, and borrowing positions are shown here.</p>
				</div>
				{earningRows.length >= 3 ? (
					<div className="flex rounded-lg border border-[#e0d4bd] bg-card-content-secondary p-1 dark:border-menu-separator">
						<SortButton active={earningSort === "interest"} onClick={() => setEarningSort("interest")}>Sort by interest</SortButton>
						<SortButton active={earningSort === "balance"} onClick={() => setEarningSort("balance")}>Sort by earning</SortButton>
					</div>
				) : null}
			</div>

			{!hasActiveAllocations ? (
				<div className="mt-5 rounded-xl border border-dashed border-[#e0d4bd] bg-card-content-secondary/70 p-5 text-sm leading-6 text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="font-semibold text-text-primary">No active allocations yet.</p>
					<p className="mt-1">Start by buying ZCHF, earning with ZCHF, borrowing, or investing in the protocol.</p>
				</div>
			) : useLedgerLayout ? (
				<div className="mt-5 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
					<div className="self-start">
						<EarningGroup earningRows={earningRows} totalEarning={totalEarning} interestSummary={interestSummary} dataUnavailable={dataUnavailable} onAction={onAction} />
					</div>
					<div className="space-y-4">
						{walletRows.length > 0 || walletReadsLoading || walletReadFailures.length > 0 ? (
							<WalletGroup walletRows={walletRows} walletReadsLoading={walletReadsLoading} walletReadFailures={walletReadFailures.length} walletZchfComplete={walletZchfComplete} onAction={onAction} />
						) : null}
						{fpsRow ? <ProtocolInvestmentGroup fpsRow={fpsRow} currentChainId={currentChainId} onAction={onAction} /> : null}
						{hasBorrowing ? <BorrowingGroup borrowedZchf={borrowedZchf} currentChainId={currentChainId} onAction={onAction} /> : null}
					</div>
				</div>
			) : (
				<div className="mt-5 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
					{earningRows.length > 0 ? <EarningGroup earningRows={earningRows} totalEarning={totalEarning} interestSummary={interestSummary} dataUnavailable={dataUnavailable} onAction={onAction} /> : null}
					{walletRows.length > 0 || walletReadsLoading || walletReadFailures.length > 0 ? (
						<WalletGroup walletRows={walletRows} walletReadsLoading={walletReadsLoading} walletReadFailures={walletReadFailures.length} walletZchfComplete={walletZchfComplete} onAction={onAction} />
					) : null}
					{fpsRow ? <ProtocolInvestmentGroup fpsRow={fpsRow} currentChainId={currentChainId} onAction={onAction} /> : null}
					{hasBorrowing ? <BorrowingGroup borrowedZchf={borrowedZchf} currentChainId={currentChainId} onAction={onAction} /> : null}
				</div>
			)}
		</section>
	);
}

function EarningGroup({
	earningRows,
	totalEarning,
	interestSummary,
	dataUnavailable,
	onAction,
}: {
	earningRows: ChainRow[];
	totalEarning: number;
	interestSummary: { label: string; value: string; positive: boolean };
	dataUnavailable?: boolean;
	onAction: (action: ChainAction) => void;
}) {
	const title = earningRows.length <= 1 ? "Earning" : `Earning across ${earningRows.length} chains`;
	return (
		<AllocationGroup
			title={title}
			summary={[
				{ label: "Total earning", value: earningRows.length > 0 ? `${formatCurrency(totalEarning, 2, 2)} ZCHF` : "-" },
				{ label: interestSummary.label, value: earningRows.length > 0 ? interestSummary.value : "-", positive: interestSummary.positive },
			]}
		>
			{earningRows.length === 1 ? <p className="mb-2 text-xs text-text-secondary">1 active chain</p> : null}
			{earningRows.length > 0 ? (
				<div className="divide-y divide-[#eadfcd] dark:divide-menu-separator">
					{earningRows.map((row) => <EarningAllocationRow key={row.chainId} row={row} onAction={onAction} />)}
				</div>
			) : (
				<EmptyAllocation copy={dataUnavailable ? "Earning data is unavailable." : "No active earning positions loaded."} />
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
		<AllocationGroup title="Wallet ZCHF">
			{walletRows.length > 0 ? (
				<div className="divide-y divide-[#eadfcd] dark:divide-menu-separator">
					{walletRows.map((row) => <WalletAllocationRow key={row.chainId} row={row} onAction={onAction} />)}
				</div>
			) : (
				<EmptyAllocation copy={walletReadsLoading ? "Wallet ZCHF is loading." : walletReadFailures > 0 ? "Some wallet balances could not be loaded." : "No wallet ZCHF found."} />
			)}
			{walletReadFailures > 0 ? <p className="mt-3 text-xs text-text-secondary">Some wallet balances could not be loaded.</p> : null}
			{walletZchfComplete ? <p className="mt-3 text-xs text-text-secondary">Wallet balances loaded across supported ZCHF chains.</p> : null}
		</AllocationGroup>
	);
}

function ProtocolInvestmentGroup({
	fpsRow,
	currentChainId,
	onAction,
}: {
	fpsRow: ChainRow;
	currentChainId: ChainId;
	onAction: (action: ChainAction) => void;
}) {
	return (
		<AllocationGroup title="Protocol Investment">
			<SimpleAllocationRow
				chainName="Ethereum"
				currentChainId={currentChainId}
				primary={`${formatCurrency(fpsRow.fpsHoldings ?? 0, 2, 2)} FPS`}
				action={{ label: "Manage investment", targetChainId: mainnet.id as ChainId, href: "/equity" }}
				onAction={onAction}
			/>
		</AllocationGroup>
	);
}

function BorrowingGroup({
	borrowedZchf,
	currentChainId,
	onAction,
}: {
	borrowedZchf?: number | null;
	currentChainId: ChainId;
	onAction: (action: ChainAction) => void;
}) {
	return (
		<AllocationGroup title="Borrowing">
			<SimpleAllocationRow
				currentChainId={currentChainId}
				primary={`Total borrowed: ${formatCurrency(borrowedZchf ?? 0, 2, 2)} ZCHF`}
				action={{ label: "Open Portfolio", targetChainId: currentChainId, href: "/mypositions" }}
				onAction={onAction}
			/>
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
								<div className={`mt-1 text-sm font-semibold ${item.positive ? "text-text-success" : "text-text-primary"}`}>{item.value}</div>
							</div>
						))}
					</div>
				) : null}
			</div>
			<div className="mt-3">{children}</div>
		</div>
	);
}

function EarningAllocationRow({ row, onAction }: { row: ChainRow; onAction: (action: ChainAction) => void }) {
	const interestDisplay = row.claimableInterestZchf == null ? "—" : `${formatCurrency(row.claimableInterestZchf, 2, 2)} ZCHF`;
	const earningDisplay = row.savingsZchf == null ? "—" : `${formatCurrency(row.savingsZchf, 2, 2)} ZCHF`;
	return (
		<div className="grid grid-cols-1 gap-3 py-3 text-sm md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center">
			<ChainCell name={row.name} />
			<div>
				<div className="text-xs text-text-secondary">Earning balance</div>
				<div className="font-semibold text-text-primary">{earningDisplay}</div>
			</div>
			<div>
				<div className="text-xs text-text-secondary">Ready interest</div>
				<div className={`font-semibold ${row.claimableInterestZchf != null && row.claimableInterestZchf > 0 ? "text-text-success" : "text-text-primary"}`}>{interestDisplay}</div>
			</div>
			<RowAction action={{ label: "Manage earning", targetChainId: row.chainId, href: `/savings?chainId=${row.chainId}`, skipNetworkSwitch: true }} onAction={onAction} />
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
			<RowAction action={{ label: "Open Transfer", targetChainId: row.chainId, href: "/transfer" }} helper={row.isCurrent ? undefined : `Requires ${row.name}`} onAction={onAction} />
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
	const requiresNetworkSwitch = currentChainId !== undefined && action.targetChainId !== currentChainId && Boolean(chainName);
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-[#eadfcd] bg-[#fffaf0] p-3 dark:border-menu-separator dark:bg-card-body-primary md:flex-row md:items-center md:justify-between">
			<div className="space-y-2">
				{chainName ? <ChainCell name={chainName} /> : null}
				<div className="font-semibold text-text-primary">{primary}</div>
			</div>
			<RowAction action={action} helper={requiresNetworkSwitch ? `Requires ${chainName}` : undefined} onAction={onAction} />
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
			<AppButtonSecondary size="small" width="w-auto" className="min-h-[34px] px-3 text-xs" onClick={() => onAction(action)}>{action.label}</AppButtonSecondary>
			{helper ? <span className="text-[11px] text-text-secondary">{helper}</span> : null}
		</div>
	);
}

function SortButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return <button type="button" className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-[#f4ead4] text-[#80601d] dark:bg-[#242b38] dark:text-[#e5c978]" : "text-text-secondary hover:text-text-primary"}`} onClick={onClick}>{children}</button>;
}

function EmptyAllocation({ copy }: { copy: string }) {
	return <p className="rounded-lg border border-dashed border-[#e0d4bd] p-3 text-sm text-text-secondary dark:border-menu-separator">{copy}</p>;
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}

function hasMeaningfulWalletZchf(value?: number | null) {
	return typeof value === "number" && value >= WALLET_ZCHF_DUST_THRESHOLD;
}
