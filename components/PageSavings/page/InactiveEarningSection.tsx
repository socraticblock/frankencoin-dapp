import InactiveEarnChainPanel from "./InactiveEarnChainPanel";
import { formatCurrency } from "@utils";
import { interestCell, pickerStateLabel } from "./earnAllocationsLabels";
import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import type { Address } from "viem";
import type { ChainId } from "@frankencoin/zchf";

export type InactiveEarningSectionProps = {
	inactiveEarningRows: EarnChainRow[];
	selectedChainId: ChainId;
	setChainRowRef: (id: ChainId, node: HTMLDivElement | null) => void;
	onSelectChain: (id: ChainId) => void;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	openTransferHref: string;
	onSwitchChain: (chainId: ChainId) => void;
};

export default function InactiveEarningSection({
	inactiveEarningRows,
	selectedChainId,
	setChainRowRef,
	onSelectChain,
	account,
	isConnected,
	walletChain,
	walletChainId,
	openTransferHref,
	onSwitchChain,
}: InactiveEarningSectionProps) {
	const rowsWithWalletZchf = inactiveEarningRows.filter((row) => (row.walletZchf ?? 0) > 0);
	const rowsWithoutWalletZchf = inactiveEarningRows.filter((row) => (row.walletZchf ?? 0) <= 0);

	return (
		<section className="space-y-3 rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<h2 className="text-lg font-semibold text-text-primary">Start earning on another chain</h2>
			<p className="text-sm text-text-secondary">Choose where you want new ZCHF savings to earn.</p>
			{inactiveEarningRows.length === 0 ? (
				<div className="mt-3 rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-5 text-sm text-text-secondary dark:border-menu-separator">
					You are already earning on every supported chain.
				</div>
			) : (
				<div className="mt-3 space-y-2">
					{rowsWithWalletZchf.length > 0 ? (
						rowsWithWalletZchf.map((row) => (
							<InactiveEarningRow
								key={row.chainId}
								row={row}
								selectedChainId={selectedChainId}
								setChainRowRef={setChainRowRef}
								onSelectChain={onSelectChain}
								account={account}
								isConnected={isConnected}
								walletChain={walletChain}
								walletChainId={walletChainId}
								openTransferHref={openTransferHref}
								onSwitchChain={onSwitchChain}
							/>
						))
					) : (
						<div className="rounded-xl border border-dashed border-menu-separator p-4 text-sm text-text-secondary">
							No other chain currently has wallet ZCHF ready to deposit.
						</div>
					)}

					{rowsWithoutWalletZchf.length > 0 ? (
						<details className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary dark:border-menu-separator">
							<summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-primary">
								Other supported chains ({rowsWithoutWalletZchf.length})
							</summary>
							<div className="space-y-2 border-t border-[#eadfcd] p-3 dark:border-menu-separator">
								{rowsWithoutWalletZchf.map((row) => (
									<InactiveEarningRow
										key={row.chainId}
										row={row}
										selectedChainId={selectedChainId}
										setChainRowRef={setChainRowRef}
										onSelectChain={onSelectChain}
										account={account}
										isConnected={isConnected}
										walletChain={walletChain}
										walletChainId={walletChainId}
										openTransferHref={openTransferHref}
										onSwitchChain={onSwitchChain}
									/>
								))}
							</div>
						</details>
					) : null}
				</div>
			)}
		</section>
	);
}

function InactiveEarningRow({
	row,
	selectedChainId,
	setChainRowRef,
	onSelectChain,
	account,
	isConnected,
	walletChain,
	walletChainId,
	openTransferHref,
	onSwitchChain,
}: {
	row: EarnChainRow;
	selectedChainId: ChainId;
	setChainRowRef: (id: ChainId, node: HTMLDivElement | null) => void;
	onSelectChain: (id: ChainId) => void;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	openTransferHref: string;
	onSwitchChain: (chainId: ChainId) => void;
}) {
	const isSelected = selectedChainId === row.chainId;

	return (
		<div ref={(node) => setChainRowRef(row.chainId, node)} tabIndex={-1} className="outline-none">
			<button
				type="button"
				onClick={() => onSelectChain(row.chainId)}
				className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left text-sm transition md:flex-row md:items-center md:justify-between ${
					isSelected
						? "rounded-b-none border-[#c4a75f] bg-[#f4ead4]/80 dark:border-[#8a7448] dark:bg-[#242b38]"
						: "border-[#e0d4bd] bg-card-content-secondary hover:border-[#c4a75f]/70 dark:border-menu-separator"
				}`}
			>
				<div className="font-semibold text-text-primary">{row.name}</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary md:text-sm">
					<span>Wallet ZCHF: {formatWalletZchf(row)}</span>
					<span>Currently earning: {formatCurrency(row.savingsZchf ?? 0, 2, 2)}</span>
					<span>Interest ready: {interestCell(row)}</span>
					<span className="font-medium text-[#80601d] dark:text-[#e5c978]">{pickerStateLabel(row)}</span>
				</div>
			</button>
			{isSelected ? (
				<InactiveEarnChainPanel
					row={row}
					account={account}
					isConnected={isConnected}
					walletChain={walletChain}
					walletChainId={walletChainId}
					openTransferHref={openTransferHref}
					onSwitchChain={() => onSwitchChain(row.chainId)}
				/>
			) : null}
		</div>
	);
}

function formatWalletZchf(row: EarnChainRow) {
	if (row.walletStatus === "loaded") return formatCurrency(row.walletZchf ?? 0, 2, 2);
	if (row.walletStatus === "loading") return "...";
	return "-";
}
