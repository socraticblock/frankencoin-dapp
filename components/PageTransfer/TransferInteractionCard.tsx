import AppCard from "@components/AppCard";
import AddressInput from "@components/Input/AddressInput";
import TokenInput from "@components/Input/TokenInput";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Address, Hash, formatUnits, isAddress } from "viem";
import { useConnection, useChainId } from "wagmi";
import { WAGMI_CHAIN, WAGMI_CHAINS } from "../../app.config";
import { ChainId, SupportedChain } from "@frankencoin/zchf";
import { useRouter } from "next/router";
import AddressInputChain from "@components/Input/AddressInputChain";
import { mainnet } from "viem/chains";
import TransferActionMainnet from "./TransferActionMainnet";
import TransferActionSidechain from "./TransferActionSidechain";
import TransferDetailsCard from "./TransferDetailsCard";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import { formatCurrency, getChain } from "@utils";
import { useTransferCcipFee, useZchfChainBalances } from "@hooks";
import AppButtonSecondary from "@components/AppButtonSecondary";
import ChainLogo from "@components/ChainLogo";
import ChainBySelect from "@components/Input/ChainBySelect";
import {
	bridgeRecipientNote,
	MIN_ZCHF_FUNDED_THRESHOLD,
	orderedZchfBalanceChainNames,
} from "./transferShared";

type TransferMode = "transfer" | "bridge";

const MODE_TAB_ACTIVE = "border-button-default bg-card-content-primary text-text-primary";
const MODE_TAB_INACTIVE = "border-menu-separator text-text-secondary hover:text-text-primary";

function ModeTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${active ? MODE_TAB_ACTIVE : MODE_TAB_INACTIVE}`}
		>
			{children}
		</button>
	);
}

export default function TransferInteractionCard() {
	const router = useRouter();
	const connectedChainId = useChainId() as ChainId;
	const { address } = useConnection();
	const appKitNetwork = useAppKitNetwork();
	const isMainnetChain = connectedChainId === mainnet.id;
	const chainBalances = useZchfChainBalances(address as Address | undefined);

	const [mode, setMode] = useState<TransferMode>("transfer");
	const [fromChainId, setFromChainId] = useState<ChainId>(connectedChainId);
	const [toChainId, setToChainId] = useState<ChainId>(connectedChainId);
	const [recipient, setRecipient] = useState<string>((router.query.recipient as string) ?? "");
	const [recipientChain, setRecipientChain] = useState<SupportedChain>(WAGMI_CHAIN);

	const [refToggle, setRefToggle] = useState<boolean>(((router.query.reference as string) ?? "").length > 0);
	const [reference, setReference] = useState<string>((router.query.reference as string) ?? "");
	const [amount, setAmount] = useState<bigint>(BigInt((router.query.amount as string) ?? "0"));
	const [isLoaded, setLoaded] = useState<boolean>(false);
	const [lastTxHash, setLastTxHash] = useState<Hash | undefined>(undefined);
	const [showAllChains, setShowAllChains] = useState<boolean>(false);

	const ccipFee = useTransferCcipFee({ fromChainId, toChainId, recipient, amount });
	const balanceChainNames = useMemo(() => orderedZchfBalanceChainNames(WAGMI_CHAINS), []);

	useEffect(() => {
		setFromChainId(connectedChainId);
		if (mode === "transfer") setToChainId(connectedChainId);
	}, [connectedChainId, mode]);

	useEffect(() => {
		if (mode === "transfer") setToChainId(fromChainId);
	}, [fromChainId, mode]);

	useEffect(() => {
		setRecipientChain(getChain(toChainId));
	}, [toChainId]);

	const fromChain = getChain(fromChainId);
	const toChain = getChain(toChainId);
	const isBridge = mode === "bridge";
	const wrongChain = connectedChainId !== fromChainId;

	const fromBalance = chainBalances.find((entry) => entry.chainId === fromChainId)?.balance ?? 0n;
	const balanceRows = chainBalances.filter((entry) => balanceChainNames.includes(entry.chainName));
	const fundedBalanceRows = balanceRows.filter((entry) => entry.isLoading || entry.balance >= MIN_ZCHF_FUNDED_THRESHOLD);
	const displayBalanceRows = showAllChains ? balanceRows : fundedBalanceRows;

	const errorRecipient = () => {
		if (recipient !== "" && !isAddress(recipient)) return "Invalid recipient address";
		return "";
	};

	const errorAmount = () => {
		if (amount > fromBalance) return `No ZCHF available on ${fromChain.name}.`;
		return "";
	};

	const onChangeAmount = (value: string) => {
		setAmount(value === "" ? 0n : BigInt(value));
	};

	const switchToNetwork = (target: AppKitNetwork) => {
		appKitNetwork.switchNetwork(target);
	};

	const onChangeFromChain = (value: string) => {
		const target = WAGMI_CHAINS.find((c) => c.name === value) as AppKitNetwork | undefined;
		if (!target) return;
		setFromChainId(target.id as ChainId);
		if (mode === "transfer") setToChainId(target.id as ChainId);
		switchToNetwork(target);
	};

	const onChangeToChain = (value: string) => {
		const target = WAGMI_CHAINS.find((c) => c.name === value);
		if (!target) return;
		setToChainId(target.id as ChainId);
		const nextMode = target.id === fromChainId ? "transfer" : "bridge";
		setMode(nextMode);
		if (nextMode === "bridge" && !recipient && address) setRecipient(address);
	};

	const setTransferMode = () => {
		setMode("transfer");
		setToChainId(fromChainId);
	};

	const setBridgeMode = () => {
		setMode("bridge");
		if (toChainId === fromChainId) {
			const next = WAGMI_CHAINS.find((c) => c.id !== fromChainId);
			if (next) setToChainId(next.id as ChainId);
		}
		if (address && !recipient) setRecipient(address);
	};

	const getTransferDisabledReason = () => {
		if (!address) return "Connect your wallet to transfer or bridge ZCHF.";
		if (wrongChain) return `Switch your wallet to ${fromChain.name}.`;
		if (!amount || amount <= 0n) return "Enter an amount.";
		if (!recipient) return "Enter a recipient wallet.";
		if (!isAddress(recipient)) return "Enter a valid recipient wallet.";
		if (fromBalance < amount) return `No ZCHF available on ${fromChain.name}.`;
		if (isBridge && fromChainId === toChainId) return "Choose a different destination chain to bridge.";
		return null;
	};

	const disabledReason = getTransferDisabledReason();
	const isDisabled = disabledReason !== null || (refToggle && reference.length === 0);
	const buttonLabel = wrongChain ? `Switch to ${fromChain.name}` : isBridge ? "Bridge ZCHF" : "Transfer ZCHF";
	const detailsTitle = isBridge ? "Bridge details" : "Transfer details";
	const previewTitleMode = isBridge ? "bridge" : "transfer";
	const amountLabel = isBridge ? `Amount to bridge to ${toChain.name}` : "Amount";

	const handleUseChainAsSource = (chainItemId: ChainId) => {
		const target = WAGMI_CHAINS.find((c) => c.id === chainItemId) as AppKitNetwork | undefined;
		setFromChainId(chainItemId);
		if (mode === "transfer") setToChainId(chainItemId);
		if (mode === "bridge" && toChainId === chainItemId) {
			const fallback = WAGMI_CHAINS.find((c) => c.id !== chainItemId);
			if (fallback) setToChainId(fallback.id as ChainId);
		}
		if (target) switchToNetwork(target);
	};

	const chainSelectNames = useMemo(() => WAGMI_CHAINS.map((c) => c.name), []);

	return (
		<section className="grid grid-cols-1 gap-4 mx-auto lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
			<AppCard>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-2">
						<ModeTabButton active={mode === "transfer"} onClick={setTransferMode}>
							Transfer
						</ModeTabButton>
						<ModeTabButton active={mode === "bridge"} onClick={setBridgeMode}>
							Bridge
						</ModeTabButton>
					</div>
					<p className="text-sm text-text-secondary">
						{isBridge ? "Move ZCHF from one chain to another using CCIP." : "Send ZCHF to another wallet on the same chain."}
					</p>

					<div className="rounded-lg border border-menu-separator p-3">
						<p className="text-sm font-semibold text-text-primary">Your ZCHF balances</p>
						<div className="mt-2 space-y-2">
							{displayBalanceRows.length === 0 ? (
								<div className="rounded-md bg-card-content-primary px-3 py-2 text-sm text-text-secondary">
									No chain has at least 0.1 ZCHF.
								</div>
							) : (
								displayBalanceRows.map((entry) => {
									const isSource = entry.chainId === fromChainId;
									return (
										<div
											key={`zchf-balance-${entry.chainId}`}
											className="flex items-center justify-between rounded-md bg-card-content-primary px-3 py-2"
										>
											<div className="flex items-center gap-2">
												<ChainLogo chain={entry.chainName.toLowerCase()} size={4} />
												<span className="text-sm text-text-primary">{entry.chainName}</span>
											</div>
											<div className="flex items-center gap-3">
												<span className="text-sm text-text-primary">
													{entry.isLoading ? "Loading..." : `${formatCurrency(formatUnits(entry.balance, 18), 2, 2)} ZCHF`}
												</span>
												<AppButtonSecondary
													width="w-auto"
													size="small"
													disabled={isSource}
													onClick={() => handleUseChainAsSource(entry.chainId)}
												>
													{isSource ? "Selected" : "Select"}
												</AppButtonSecondary>
											</div>
										</div>
									);
								})
							)}
						</div>
						<button
							type="button"
							className="mt-2 text-sm text-text-secondary underline underline-offset-2"
							onClick={() => setShowAllChains((prev) => !prev)}
						>
							{showAllChains ? "Show only funded chains" : "Show all chains"}
						</button>
					</div>

					<div className="mt-4 text-lg font-bold text-center">{detailsTitle}</div>

					<div className={`grid grid-cols-1 gap-2 ${isBridge ? "md:grid-cols-2" : ""}`}>
						<div>
							<p className="mb-1 text-sm text-text-secondary">From chain</p>
							<ChainBySelect chains={chainSelectNames} chain={fromChain.name} chainOnChange={onChangeFromChain} />
						</div>
						{isBridge ? (
							<div>
								<p className="mb-1 text-sm text-text-secondary">To chain</p>
								<ChainBySelect chains={chainSelectNames} chain={toChain.name} chainOnChange={onChangeToChain} />
							</div>
						) : null}
					</div>

					<AddressInputChain label="From wallet" disabled={true} value={address} chain={fromChain.name} onChangeChain={onChangeFromChain} />

					<AddressInput
						label="Recipient wallet"
						placeholder="0x1a2b3c..."
						value={recipient}
						onChange={setRecipient}
						own={mode === "bridge" ? address : undefined}
						ownLabel={mode === "bridge" ? "Use connected wallet" : "Own"}
						error={errorRecipient()}
						isTextLeft={true}
						note={isBridge ? bridgeRecipientNote(address, recipient) : undefined}
					/>

					<TokenInput
						symbol="ZCHF"
						label={amountLabel}
						chain={fromChain.name}
						value={amount.toString()}
						digit={18}
						onChange={onChangeAmount}
						max={fromBalance}
						reset={0n}
						limit={fromBalance}
						limitDigit={18}
						limitLabel={`Available on ${fromChain.name}:`}
						limitCurrency="ZCHF"
						error={errorAmount()}
					/>

					{refToggle ? (
						<AddressInput
							label="Reference / note optional"
							placeholder="Invoice 123"
							value={reference}
							onChange={setReference}
							isTextLeft={true}
							reset=""
							note="Optional note for your transfer history."
						/>
					) : (
						<button type="button" className="text-sm text-text-secondary underline underline-offset-2" onClick={() => setRefToggle(true)}>
							Add reference / note optional
						</button>
					)}

					{isMainnetChain ? (
						<TransferActionMainnet
							recipientChain={recipientChain}
							recipient={recipient as Address}
							ccipFee={ccipFee}
							addReference={refToggle}
							reference={reference}
							amount={amount}
							disabled={isDisabled}
							buttonLabel={buttonLabel}
							onSubmitted={setLastTxHash}
							setLoaded={setLoaded}
						/>
					) : (
						<TransferActionSidechain
							recipientChain={recipientChain}
							addReference={refToggle}
							ccipFee={ccipFee}
							recipient={recipient as Address}
							reference={reference}
							amount={amount}
							disabled={isDisabled}
							buttonLabel={buttonLabel}
							onSubmitted={setLastTxHash}
							setLoaded={setLoaded}
						/>
					)}
				</div>
			</AppCard>

			<TransferDetailsCard
				mode={previewTitleMode}
				amount={amount}
				senderAddress={address}
				recipientAddress={recipient as Address}
				fromChain={fromChain}
				toChain={toChain}
				ccipFee={ccipFee}
				isSubmitted={isLoaded}
				lastTxHash={lastTxHash}
				disabledReason={disabledReason}
			/>
		</section>
	);
}
