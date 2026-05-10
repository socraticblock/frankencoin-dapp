import AppButton from "@components/AppButton";
import SavingsInteractionCard from "@components/PageSavings/SavingsInteractionCard";
import type { EarnFormIntent } from "@components/PageSavings/earn/earnTypes";
import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import type { Address } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import { zeroAddress } from "viem";

export type ActiveEarnChainPanelProps = {
	row: EarnChainRow;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	earnFormIntent: EarnFormIntent;
	onConsumeEarnFormIntent: () => void;
	onSwitchChain: () => void;
};

export default function ActiveEarnChainPanel({
	row,
	account,
	isConnected,
	walletChain,
	walletChainId,
	earnFormIntent,
	onConsumeEarnFormIntent,
	onSwitchChain,
}: ActiveEarnChainPanelProps) {
	const walletOnSelected = walletChainId === row.chainId;

	if (!isConnected || account === zeroAddress) {
		return (
			<div className="w-full rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator md:p-6">
				<p className="text-sm text-text-secondary">Connect your wallet to manage earning on {row.name}.</p>
			</div>
		);
	}

	if (!walletOnSelected) {
		return (
			<div className="w-full space-y-4 rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator md:p-6">
				<p className="text-sm text-text-secondary">
					Your wallet is currently connected to{" "}
					<span className="font-medium text-text-primary">{walletChain.name}</span>.
				</p>
				<p className="text-sm font-medium text-text-primary">Switch to {row.name} to manage.</p>
				<AppButton className="min-h-[48px] w-full sm:w-auto" width="w-full sm:w-auto" onClick={onSwitchChain}>
					Switch to {row.name}
				</AppButton>
			</div>
		);
	}

	return (
		<div className="w-full">
			<SavingsInteractionCard
				earnFormIntent={earnFormIntent}
				onConsumeEarnFormIntent={onConsumeEarnFormIntent}
				lockChainSelector
			/>
		</div>
	);
}
