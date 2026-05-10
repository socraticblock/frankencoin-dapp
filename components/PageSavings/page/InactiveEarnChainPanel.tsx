import AppButton from "@components/AppButton";
import FundingActions from "./FundingActions";
import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import type { Address } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import { zeroAddress } from "viem";

export type InactiveEarnChainPanelProps = {
	row: EarnChainRow;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	openTransferHref: string;
	onSwitchChain: () => void;
};

export default function InactiveEarnChainPanel({
	row,
	account,
	isConnected,
	walletChain,
	walletChainId,
	openTransferHref,
	onSwitchChain,
}: InactiveEarnChainPanelProps) {
	const walletOnSelected = walletChainId === row.chainId;
	const hasWalletZchf = (row.walletZchf ?? 0) > 0;
	const statusLine = hasWalletZchf ? `Ready to start earning on ${row.name}.` : `Add ZCHF on ${row.name} to start earning.`;

	if (!isConnected || account === zeroAddress) {
		return (
			<div className="rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 dark:border-[#8a7448] md:p-5">
				<p className="text-sm text-text-secondary">Connect your wallet to view funding options for {row.name}.</p>
			</div>
		);
	}

	if (!walletOnSelected) {
		return (
			<div className="space-y-4 rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 dark:border-[#8a7448] md:p-5">
				<p className="text-sm text-text-secondary">
					Your wallet is currently connected to{" "}
					<span className="font-medium text-text-primary">{walletChain.name}</span>.
				</p>
				<p className="text-sm font-medium text-text-primary">Switch to {row.name} to fund this chain.</p>
				<AppButton className="min-h-[48px] w-full sm:w-auto" width="w-full sm:w-auto" onClick={onSwitchChain}>
					Switch to {row.name}
				</AppButton>
			</div>
		);
	}

	return (
		<div className="rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 shadow-sm dark:border-[#8a7448] md:p-5">
			<FundingActions statusLine={statusLine} openTransferHref={openTransferHref} />
		</div>
	);
}
