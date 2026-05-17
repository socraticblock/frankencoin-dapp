import WalletConnect from "@components/WalletConnect";
import { ChainId } from "@frankencoin/zchf";
import { getChain, shortenAddress } from "@utils";
import type { Address } from "viem";
import ChainChip from "./ChainChip";

type Props = {
	address?: Address;
	currentChainId: ChainId;
	protocolLive: boolean;
	relevantChainChips: ChainId[];
	isConnected: boolean;
	onSwitchChain: (chainId: ChainId) => void;
};

export default function DeskHeaderStatus({ address, currentChainId, protocolLive, relevantChainChips, isConnected, onSwitchChain }: Props) {
	const chain = getChain(currentChainId);
	return (
		<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/90 px-4 py-3 dark:border-menu-separator dark:bg-card-content-secondary">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
					{isConnected && address ? (
						<>
							<StatusItem label="Wallet" value={shortenAddress(address)} />
							<StatusDivider />
							<StatusItem label="Current network" value={chain.name} />
							<StatusDivider />
							<StatusItem label="Protocol data" value={protocolLive ? "Live" : "Delayed"} success={protocolLive} />
						</>
					) : (
						<span className="font-medium text-text-primary">Wallet not connected</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{relevantChainChips.map((target) => (
						<ChainChip key={`chain-chip-${target}`} label={getChain(target).name} active={target === currentChainId} onClick={() => onSwitchChain(target)} />
					))}
					{!isConnected ? (
						<div className="min-w-[170px]">
							<WalletConnect />
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function StatusItem({ label, value, success }: { label: string; value: string; success?: boolean }) {
	return (
		<span>
			{label} <span className={`font-semibold ${success ? "text-text-success" : "text-text-primary"}`}>{value}</span>
		</span>
	);
}

function StatusDivider() {
	return <span className="text-[#c4a75f]">.</span>;
}
