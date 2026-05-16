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
	getRecipientSafetyError,
	getRecipientSafetyNote,
	getTransferReferenceError,
	MIN_ZCHF_FUNDED_THRESHOLD,
	orderedZchfBalanceChainNames,
	sanitizeTransferReference,
	TRANSFER_REFERENCE_MAX_LENGTH,
} from "./transferShared";

type TransferMode = "transfer" | "bridge";
type Props = { initialMode?: TransferMode; lockedMode?: TransferMode };

const MODE_TAB_ACTIVE = "border-button-default bg-card-content-primary text-text-primary";
const MODE_TAB_INACTIVE = "border-menu-separator text-text-secondary hover:text-text-primary";

function fallbackDestination(source: ChainId): ChainId {
	return (WAGMI_CHAINS.find((chain) => chain.id !== source)?.id ?? source) as ChainId;
}

function parseAmountQuery(value: unknown): bigint {
	return typeof value === "string" && /^\d+$/.test(value) ? BigInt(value) : 0n;
}

function ModeTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${active ? MODE_TAB_ACTIVE : MODE_TAB_INACTIVE}`}>
			{children}
		</button>
	);
}

export default function TransferInteractionCard({ initialMode = "transfer", lockedMode }: Props) {
	const router = useRouter();
	const connectedChainId = useChainId() as ChainId;
	const { address, isConnected } = useConnection();
	const appKitNetwork = useAppKitNetwork();
	const startMode = lockedMode ?? initialMode;
	const chainBalances = useZchfChainBalances(address as Address | undefined);

	const [mode, setMode] = useState<TransferMode>(startMode);
	const [fromChainId, setFromChainId] = useState<ChainId>(connectedChainId);
	const [toChainId, setToChainId] = useState<ChainId>(() => (startMode === "bridge" ? fallbackDestination(connectedChainId) : connectedChainId));
	const [recipient, setRecipient] = useState<string>((router.query.recipient as string) ?? "");
	const [recipientChain, setRecipientChain] = useState<SupportedChain>(WAGMI_CHAIN);

	const [refToggle, setRefToggle] = useState<boolean>(((router.query.reference as string) ?? "").length > 0);
	const [reference, setReference] = useState<string>(sanitizeTransferReference((router.query.reference as string) ?? ""));
	const [amount, setAmount] = useState<bigint>(() => parseAmountQuery(router.query.amount));
	const [isLoaded, setLoaded] = useState<boolean>(false);
	const [lastTxHash, setLastTxHash] = useState<Hash | undefined>(undefined);
	const [showAllChains, setShowAllChains] = useState<boolean>(false);

	const ccipFeeState = useTransferCcipFee({ fromChainId, toChainId, recipient, amount });
	const balanceChainNames = useMemo(() => orderedZchfBalanceChainNames(WAGMI_CHAINS), []);
	const recipientSafetyError = getRecipientSafetyError(recipient);
	const referenceError = getTransferReferenceError(reference);

	useEffect(() => {
		if (!lockedMode) return;
		setMode(lockedMode);
		if (lockedMode === "transfer") setToChainId(fromChainId);
		if (lockedMode === "bridge" && toChainId === fromChainId) setToChainId(fallbackDestination(fromChainId));
	}, [fromChainId, lockedMode, toChainId]);

	useEffect(() => {
		setFromChainId(connectedChainId);
		if (mode === "transfer") setToChainId(connectedChainId);
		if (mode === "bridge" && toChainId === connectedChainId) setToChainId(fallbackDestination(connectedChainId));
	}, [connectedChainId, mode, toChainId]);

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

	const errorRecipient = () => recipientSafetyError ?? "";

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
		const nextFrom = target.id as ChainId;
		setFromChainId(nextFrom);
		if (mode === "transfer") setToChainId(nextFrom);
		if (mode === "bridge" && toChainId === nextFrom) setToChainId(fallbackDestination(nextFrom));
		switchToNetwork(target);
	};

	const onChangeToChain = (value: string) => {
		const target = WAGMI_CHAINS.find((c) => c.name === value);
		if (!target) return;
		if (isBridge && target.id === fromChainId) return;
		setToChainId(target.id as ChainId);
		if (!lockedMode) setMode(target.id === fromChainId ? "transfer" : "bridge");
		if (target.id !== fromChainId && !recipient && address) setRecipient(address);
	};

	const setTransferMode = () => {
		if (lockedMode) return;
		setMode("transfer");
		setToChainId(fromChainId);
	};

	const setBridgeMode = () => {
		if (lockedMode) return;
		setMode("bridge");
		if (toChainId === fromChainId) setToChainId(fallbackDestination(fromChainId));
		if (address && !recipient) setRecipient(address);
	};

	const getTransferDisabledReason = () => {
		if (!address) return isBridge ? "Connect your wallet to bridge ZCHF." : "Connect your wallet to transfer ZCHF.";
		if (wrongChain) return `Switch your wallet to ${fromChain.name}.`;
		if (!amount || amount <= 0n) return "Enter an amount.";
		if (!recipient) return "Enter a recipient wallet.";
		if (recipientSafetyError) return recipientSafetyError;
		if (referenceError) return referenceError;
		if (fromBalance < amount) return `No ZCHF available on ${fromChain.name}.`;
		if (isBridge && fromChainId === toChainId) return "Choose a different destination chain to bridge.";
		if (isBridge && ccipFeeState.isLoading) return "Loading bridge fee.";
		if (isBridge && !ccipFeeState.isReady) return ccipFeeState.error ?? "Bridge fee is not ready yet.";
		return null;
	};

	const disabledReason = getTransferDisabledReason();
	const isDisabled = disabledReason !== null || (refToggle && reference.length === 0);
	const buttonLabel = wrongChain ? `Switch to ${fromChain.name}` : isBridge ? "Bridge ZCHF" : "Transfer ZCHF";
	const detailsTitle = isBridge ? "Bridge details" : "Transfer details";
	const previewTitleMode = isBridge ? "bridge" : "transfer";
	const amountLabel = isBridge ? `Amount to bridge to ${toChain.name}` : "Amount";
	const chainSelectNames = useMemo(() => WAGMI_CHAINS.map((c) => c.name), []);
	const destinationChainNames = useMemo(() => WAGMI_CHAINS.filter((c) => c.id !== fromChainId).map((c) => c.name), [fromChainId]);
	const useMainnetAction = fromChainId === mainnet.id;

	const handleUseChainAsSource = (chainItemId: ChainId) => {
		const target = WAGMI_CHAINS.find((c) => c.id === chainItemId) as AppKitNetwork | undefined;
		setFromChainId(chainItemId);
		if (mode === "transfer") setToChainId(chainItemId);
		if (mode === "bridge" && toChainId === chainItemId) setToChainId(fallbackDestination(chainItemId));
		if (target) switchToNetwork(target);
	};

	return (
		<section className="grid grid-cols-1 gap-4 mx-auto lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
			<AppCard>
				<div className="space-y-4">
					{lockedMode ? (
						<div className="rounded-lg border border-menu-separator bg-card-content-primary px-3 py-2">
							<p className="text-sm font-semibold text-text-primary">{isBridge ? "Bridge ZCHF" : "Transfer ZCHF"}</p>
							<p className="mt-1 text-sm text-text-secondary">{isBridge ? "Move ZCHF from one chain to another using CCIP." : "Send ZCHF to another wallet on the same chain."}</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-2 gap-2">
								<ModeTabButton active={mode === "transfer"} onClick={setTransferMode}>Transfer</ModeTabButton>
								<ModeTabButton active={mode === "bridge"} onClick={setBridgeMode}>Bridge</ModeTabButton>
							</div>
							<p className="text-sm text-text-secondary">{isBridge ? "Move ZCHF from one chain to another using CCIP." : "Send ZCHF to another wallet on the same chain."}</p>
						</>
					)}

					<div className="rounded-lg border border-menu-separator p-3">
						<p className="text-sm font-semibold text-text-primary">Your ZCHF balances</p>
						<div className="mt-2 space-y-2">
							{displayBalanceRows.length === 0 ? (
								<div className="rounded-md bg-card-content-primary px-3 py-2 text-sm text-text-secondary">
									{isConnected ? "No chain has at least 0.1 ZCHF." : "Connect wallet to view ZCHF balances."}
								</div>
							) : (
								displayBalanceRows.map((entry) => {
									const isSource = entry.chainId === fromChainId;
									return (
										<div key={`zchf-balance-${entry.chainId}`} className="flex items-center justify-between rounded-md bg-card-content-primary px-3 py-2">
											<div className="flex items-center gap-2">
												<ChainLogo chain={entry.chainName.toLowerCase()} size={4} />
												<span className="text-sm text-text-primary">{entry.chainName}</span>
											</div>
											<div className="flex items-center gap-3">
												<span className="text-sm text-text-primary">{entry.isLoading ? "Loading..." : `${formatCurrency(formatUnits(entry.balance, 18), 2, 2)} ZCHF`}</span>
												<AppButtonSecondary width="w-auto" size="small" disabled={isSource} onClick={() => handleUseChainAsSource(entry.chainId)}>{isSource ? "Selected" : "Select"}</AppButtonSecondary>
											</div>
										</div>
									);
								})
							)}
						</div>
						<button type="button" className="mt-2 text-sm text-text-secondary underline underline-offset-2" onClick={() => setShowAllChains((prev) => !prev)}>{showAllChains ? "Show only funded chains" : "Show all chains"}</button>
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
								<ChainBySelect chains={destinationChainNames} chain={toChain.name} chainOnChange={onChangeToChain} />
							</div>
						) : null}
					</div>

					<AddressInputChain label="From wallet" disabled={true} value={address} chain={fromChain.name} onChangeChain={onChangeFromChain} />

					<AddressInput label="Recipient wallet" placeholder="0x1a2b3c..." value={recipient} onChange={setRecipient} own={mode === "bridge" ? address : undefined} ownLabel={mode === "bridge" ? "Use connected wallet" : "Own"} error={errorRecipient()} isTextLeft={true} note={(isBridge ? bridgeRecipientNote(address, recipient) : undefined) ?? getRecipientSafetyNote(address, recipient)} />

					<TokenInput symbol="ZCHF" label={amountLabel} chain={fromChain.name} value={amount.toString()} digit={18} onChange={onChangeAmount} max={fromBalance} reset={0n} limit={fromBalance} limitDigit={18} limitLabel={`Available on ${fromChain.name}:`} limitCurrency="ZCHF" error={errorAmount()} />

					{refToggle ? (
						<AddressInput label="Reference / note optional" placeholder="Invoice 123" value={reference} onChange={(value) => setReference(sanitizeTransferReference(value))} isTextLeft={true} reset="" note={`${reference.length}/${TRANSFER_REFERENCE_MAX_LENGTH} characters`} />
					) : (
						<button type="button" className="text-sm text-text-secondary underline underline-offset-2" onClick={() => setRefToggle(true)}>Add reference / note optional</button>
					)}

					{useMainnetAction ? (
						<TransferActionMainnet recipientChain={recipientChain} recipient={recipient as Address} ccipFee={ccipFeeState.fee} addReference={refToggle} reference={reference} amount={amount} disabled={isDisabled} buttonLabel={buttonLabel} onSubmitted={setLastTxHash} setLoaded={setLoaded} />
					) : (
						<TransferActionSidechain recipientChain={recipientChain} addReference={refToggle} ccipFee={ccipFeeState.fee} recipient={recipient as Address} reference={reference} amount={amount} disabled={isDisabled} buttonLabel={buttonLabel} onSubmitted={setLastTxHash} setLoaded={setLoaded} />
					)}
				</div>
			</AppCard>

			<TransferDetailsCard mode={previewTitleMode} amount={amount} senderAddress={address} recipientAddress={recipient as Address} fromChain={fromChain} toChain={toChain} ccipFee={ccipFeeState.fee} isSubmitted={isLoaded} lastTxHash={lastTxHash} disabledReason={disabledReason} />
		</section>
	);
}
