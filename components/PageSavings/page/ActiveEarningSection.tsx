import AppButton from "@components/AppButton";
import ActiveEarningRow from "./ActiveEarningRow";
import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import type { EarnFormIntent } from "@components/PageSavings/earn/earnTypes";
import type { Address } from "viem";
import { zeroAddress } from "viem";
import type { ChainId } from "@frankencoin/zchf";

export type ActiveEarningSectionProps = {
	activeEarningRows: EarnChainRow[];
	selectedChainId: ChainId;
	setChainRowRef: (id: ChainId, node: HTMLDivElement | null) => void;
	onSelectChain: (id: ChainId) => void;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	earnFormIntent: EarnFormIntent;
	onConsumeEarnFormIntent: () => void;
	onSwitchChain: (chainId: ChainId) => void;
	bestStartChainId: ChainId;
};

export default function ActiveEarningSection({
	activeEarningRows,
	selectedChainId,
	setChainRowRef,
	onSelectChain,
	account,
	isConnected,
	walletChain,
	walletChainId,
	earnFormIntent,
	onConsumeEarnFormIntent,
	onSwitchChain,
	bestStartChainId,
}: ActiveEarningSectionProps) {
	return (
		<section className="space-y-3">
			<div>
				<h2 className="text-lg font-semibold text-text-primary">Your earning allocations</h2>
				<p className="mt-1 text-sm text-text-secondary">See where your ZCHF is earning and manage each chain when needed.</p>
			</div>

			{!isConnected || account === zeroAddress ? (
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-6 text-center text-sm text-text-secondary dark:border-menu-separator">
					Connect your wallet to view earning allocations.
				</div>
			) : activeEarningRows.length === 0 ? (
				<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8] px-4 py-8 text-center dark:border-menu-separator dark:bg-card-body-primary">
					<p className="text-text-primary font-medium">You are not earning on any ZCHF yet.</p>
					<p className="mt-2 text-sm text-text-secondary">Choose a chain below and deposit when you are ready.</p>
					<AppButton
						className="mt-4 min-h-[44px] w-full max-w-sm sm:mx-auto"
						width="w-full max-w-sm"
						onClick={() => onSelectChain(bestStartChainId)}
					>
						Start earning
					</AppButton>
				</div>
			) : (
				<div className="w-full space-y-4">
					{activeEarningRows.map((row) => (
						<ActiveEarningRow
							key={row.chainId}
							row={row}
							isSelected={selectedChainId === row.chainId}
							setChainRowRef={setChainRowRef}
							onSelectRow={onSelectChain}
							account={account}
							isConnected={isConnected}
							walletChain={walletChain}
							walletChainId={walletChainId}
							earnFormIntent={earnFormIntent}
							onConsumeEarnFormIntent={onConsumeEarnFormIntent}
							onSwitchChain={onSwitchChain}
						/>
					))}
				</div>
			)}
		</section>
	);
}
