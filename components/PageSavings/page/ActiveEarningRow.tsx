import AppButtonSecondary from "@components/AppButtonSecondary";
import ActiveEarnChainPanel from "./ActiveEarnChainPanel";
import { interestCell } from "./earnAllocationsLabels";
import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import type { EarnFormIntent } from "@components/PageSavings/earn/earnTypes";
import { formatCurrency } from "@utils";
import type { Address } from "viem";
import type { ChainId } from "@frankencoin/zchf";

export type ActiveEarningRowProps = {
	row: EarnChainRow;
	isSelected: boolean;
	setChainRowRef: (id: ChainId, node: HTMLDivElement | null) => void;
	onSelectRow: (id: ChainId) => void;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	earnFormIntent: EarnFormIntent;
	onConsumeEarnFormIntent: () => void;
	onSwitchChain: (chainId: ChainId) => void;
};

export default function ActiveEarningRow({
	row,
	isSelected,
	setChainRowRef,
	onSelectRow,
	account,
	isConnected,
	walletChain,
	walletChainId,
	earnFormIntent,
	onConsumeEarnFormIntent,
	onSwitchChain,
}: ActiveEarningRowProps) {
	return (
		<div
			key={row.chainId}
			ref={(node) => setChainRowRef(row.chainId, node)}
			tabIndex={-1}
			className="outline-none"
		>
			<div className="w-full rounded-2xl border border-[#e0d4bd] bg-[#fffdf8] p-5 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary md:p-6">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
					<button
						type="button"
						onClick={() => onSelectRow(row.chainId)}
						className="min-w-0 flex-1 space-y-3 rounded-xl text-left outline-none ring-[#c4a75f] ring-offset-2 ring-offset-[#fffdf8] transition hover:opacity-95 focus-visible:ring-2 dark:ring-offset-card-content-secondary"
					>
						<div className="text-lg font-semibold text-text-primary">{row.name}</div>
						<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-10 sm:gap-y-2">
							<div>
								<div className="text-xs font-medium uppercase tracking-wide text-text-secondary">Earning</div>
								<div className="mt-1 text-base font-semibold tabular-nums text-text-primary">
									{formatCurrency(row.savingsZchf ?? 0, 2, 2)} ZCHF
								</div>
							</div>
							<div>
								<div className="text-xs font-medium uppercase tracking-wide text-text-secondary">Interest ready</div>
								<div className="mt-1 text-base font-semibold tabular-nums text-text-primary">{interestCell(row)}</div>
							</div>
						</div>
					</button>
					<div className="flex w-full flex-shrink-0 flex-col gap-2 lg:w-auto lg:justify-end">
						<AppButtonSecondary
							className="min-h-[44px] w-full lg:min-w-[10rem] lg:w-44"
							width="w-full lg:w-44"
							onClick={() => onSelectRow(row.chainId)}
						>
							Manage
						</AppButtonSecondary>
					</div>
				</div>
				{isSelected ? (
					<div className="mt-6 border-t border-[#eadfcd] pt-6 dark:border-menu-separator">
						<ActiveEarnChainPanel
							row={row}
							account={account}
							isConnected={isConnected}
							walletChain={walletChain}
							walletChainId={walletChainId}
							earnFormIntent={earnFormIntent}
							onConsumeEarnFormIntent={onConsumeEarnFormIntent}
							onSwitchChain={() => onSwitchChain(row.chainId)}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}
