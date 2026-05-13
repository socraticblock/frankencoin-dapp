import AppCard from "@components/AppCard";
import { Address, formatUnits, isAddress } from "viem";
import AppLink from "@components/AppLink";
import { useConnection } from "wagmi";
import { ContractUrl, shortenAddress, TxUrl } from "@utils";
import { SupportedChain } from "@frankencoin/zchf";
import { Hash } from "viem";

interface Props {
	mode: "transfer" | "bridge";
	amount: bigint;
	senderAddress: Address | undefined;
	recipientAddress: Address | undefined;
	fromChain: SupportedChain | undefined;
	toChain: SupportedChain | undefined;
	ccipFee: bigint;
	lastTxHash?: Hash;
	isSubmitted?: boolean;
	disabledReason?: string | null;
}

export default function TransferDetailsCard({
	mode,
	amount,
	senderAddress,
	recipientAddress,
	fromChain,
	toChain,
	ccipFee,
	lastTxHash,
	isSubmitted = false,
	disabledReason,
}: Props) {
	const { address } = useConnection();
	const isBridge = mode === "bridge";
	const hasAmount = amount > 0n;
	const hasSender = Boolean(senderAddress && isAddress(senderAddress));
	const hasRecipient = Boolean(recipientAddress && isAddress(recipientAddress));

	return (
		<AppCard>
			<div className="md:mt-4 text-lg font-bold text-center">{isBridge ? "Before you bridge" : "Before you transfer"}</div>
			<div className="p-4 flex flex-col gap-2">
				{!hasAmount ? <p className="text-sm text-text-secondary">Enter an amount to preview the transfer.</p> : null}
				{!hasRecipient ? <p className="text-sm text-text-secondary">Enter a recipient wallet.</p> : null}

				{hasAmount ? (
					<div className="flex">
						<div className="flex-1 text-text-secondary">{isBridge ? "You are moving" : "You are sending"}</div>
						<div>{Math.round(Number(formatUnits(amount, 18)) * 10000) / 10000} ZCHF</div>
					</div>
				) : null}

				<div className="flex">
					<div className="flex-1 text-text-secondary">From wallet</div>
					{hasSender && senderAddress ? (
						<AppLink className="" label={shortenAddress(senderAddress)} href={ContractUrl(senderAddress, fromChain)} external={true} />
					) : (
						<div>Connect wallet</div>
					)}
				</div>

				<div className="flex">
					<div className="flex-1 text-text-secondary">From chain</div>
					<div className="">{fromChain?.name}</div>
				</div>

				{isBridge ? (
					<div className="flex">
						<div className="flex-1 text-text-secondary">To chain</div>
						<div className="">{toChain?.name}</div>
					</div>
				) : null}

				<div className="flex">
					<div className="flex-1 text-text-secondary">Recipient wallet</div>
					{hasRecipient && recipientAddress ? (
						<AppLink className="" label={shortenAddress(recipientAddress)} href={ContractUrl(recipientAddress, toChain)} external={true} />
					) : (
						<div>Enter recipient wallet</div>
					)}
				</div>

				<div className="flex">
					<div className="flex-1 text-text-secondary">Transfer type</div>
					<div className="">{isBridge ? "Cross-chain bridge via CCIP" : "Same-chain ZCHF transfer"}</div>
				</div>
			</div>

			{isBridge ? (
				<div className="px-4 pb-4">
					<p className="text-sm text-text-secondary">
						Cross-chain transfers use CCIP and may take longer to arrive on the destination chain.
					</p>
					<p className="mt-1 text-sm text-text-secondary">CCIP handles the cross-chain delivery of ZCHF.</p>
					<div className="mt-3 flex">
						<div className="flex-1 text-text-secondary">Estimated CCIP fee</div>
						<div>
							{Math.round(Number(formatUnits(ccipFee, 18)) * 100000000) / 100000000} {fromChain?.nativeCurrency.symbol}
						</div>
					</div>
					<div className="mt-2 flex">
						<div className="flex-1 text-text-secondary">Status</div>
						<AppLink className="" label="Check CCIP status" external={true} href={`https://ccip.chain.link${address ? `/address/${address}` : ""}`} />
					</div>
				</div>
			) : null}

			{disabledReason ? <p className="px-4 pb-3 text-sm text-text-warning">{disabledReason}</p> : null}

			{isSubmitted ? (
				<div className="mx-4 mb-4 rounded-lg border border-menu-separator bg-card-content-primary p-3">
					<p className="font-semibold text-text-primary">{isBridge ? "Bridge submitted" : "Transfer submitted"}</p>
					<p className="mt-1 text-sm text-text-secondary">
						{isBridge
							? `${Math.round(Number(formatUnits(amount, 18)) * 10000) / 10000} ZCHF is moving from ${fromChain?.name} to ${toChain?.name}.`
							: `Your ZCHF transfer was submitted on ${fromChain?.name}.`}
					</p>
					{isBridge ? (
						<div className="mt-2 text-sm text-text-secondary">
							<p>Step 1: Sent from source chain</p>
							<p>Step 2: Waiting for CCIP delivery</p>
							<p>Step 3: Available on destination chain</p>
							<p className="mt-1">Track delivery in CCIP Explorer.</p>
						</div>
					) : null}
					<div className="mt-2">
						{isBridge ? (
							<AppLink className="" label="Check CCIP status" external={true} href={`https://ccip.chain.link${address ? `/address/${address}` : ""}`} />
						) : lastTxHash ? (
							<AppLink className="" label="View transaction" external={true} href={TxUrl(lastTxHash, fromChain)} />
						) : null}
					</div>
				</div>
			) : null}
		</AppCard>
	);
}
