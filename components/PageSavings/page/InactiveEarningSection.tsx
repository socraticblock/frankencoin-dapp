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
					{inactiveEarningRows.map((row) => {
						const isSelected = selectedChainId === row.chainId;
						return (
							<div
								key={row.chainId}
								ref={(node) => setChainRowRef(row.chainId, node)}
								tabIndex={-1}
								className="outline-none"
							>
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
										<span>
											Wallet ZCHF:{" "}
											{row.walletStatus === "loaded"
												? `${formatCurrency(row.walletZchf ?? 0, 2, 2)}`
												: row.walletStatus === "loading"
													? "…"
													: row.walletStatus === "error"
														? "—"
														: "—"}
										</span>
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
					})}
				</div>
			)}
		</section>
	);
}
