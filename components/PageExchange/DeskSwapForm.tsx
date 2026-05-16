import AppNotice from "@components/AppNotice";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { needsEthereumUsdtResetApproval } from "./deskSwapApproval";
import { useAccount, useChainId, useReadContract, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import type { Address, Hex } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import { WAGMI_CHAINS } from "../../app.config";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import { requestDeskQuote, type DeskQuoteResponse } from "../../utils/cowDeskQuote";
import {
	COW_ORDER_TYPES,
	COW_VAULT_RELAYER_ADDRESS,
	buildDeskOrderSubmission,
	buildDeskOrderToSign,
	getCowOrderDomain,
	isDeskExecutionRoute,
	requestDeskOrderStatus,
	submitDeskOrder,
} from "../../utils/cowDeskOrder";
import {
	getAllowedDeskChainsForMode,
	getDefaultDeskChainForMode,
	getDeskChain,
	getDeskCounterAssets,
	getDeskRoute,
	modeFromDeskSelection,
	type DeskAsset,
	type DeskSwapMode,
	type DeskSwapSide,
} from "../../utils/exchangeAssets";

const ERC20_ABI = [
	{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
	{
		type: "function",
		name: "allowance",
		stateMutability: "view",
		inputs: [
			{ name: "owner", type: "address" },
			{ name: "spender", type: "address" },
		],
		outputs: [{ name: "allowance", type: "uint256" }],
	},
	{
		type: "function",
		name: "approve",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "success", type: "bool" }],
	},
] as const;

const BALANCE_DISPLAY_DECIMALS = 6;
const QUOTE_DISPLAY_DECIMALS = 6;

type QuoteState = { status: "idle" | "ready" | "blocked"; message: string };

function parseChainId(value: string, mode: DeskSwapMode): ChainId {
	const id = Number(value);
	return getAllowedDeskChainsForMode(mode).find((chain) => chain.chainId === id)?.chainId ?? getDefaultDeskChainForMode(mode);
}

function getChainLabel(chainId: number) {
	return chainId === 1 ? "Ethereum" : chainId === 8453 ? "Base" : "the selected network";
}

function normalizeDecimalInput(value: string, decimals: number) {
	const normalized = value.replace(/,/g, ".");
	const [integerPart, ...fractionParts] = normalized.split(".");
	const integer = integerPart.replace(/\D/g, "");
	const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, decimals);
	return normalized.includes(".") ? `${integer || "0"}.${fraction}` : integer;
}

function getAmountValidation(amount: string, asset: DeskAsset | null) {
	if (!amount) return null;
	if (!asset) return "This route is not available in ZCHF Desk.";
	if (!/^\d+(\.\d+)?$/.test(amount)) return "Enter a valid amount.";
	if ((amount.split(".")[1] ?? "").length > asset.decimals) return `${asset.symbol} supports up to ${asset.decimals} decimals.`;
	try {
		if (parseUnits(amount, asset.decimals) <= 0n) return "Enter an amount greater than zero.";
	} catch {
		return "Enter a valid amount.";
	}
	return null;
}

function trimDecimalZeros(value: string) {
	return value.includes(".") ? value.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0*$/, "") : value;
}

function formatDisplayDecimal(value: string, maxFractionDigits: number) {
	const isNegative = value.startsWith("-");
	const [integerRaw, fractionRaw = ""] = (isNegative ? value.slice(1) : value).split(".");
	const integer = (integerRaw || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const fraction = fractionRaw.slice(0, maxFractionDigits).replace(/0+$/, "");
	if (fraction) return `${isNegative ? "-" : ""}${integer}.${fraction}`;
	if (fractionRaw && /[1-9]/.test(fractionRaw)) return `${isNegative ? "-" : ""}<0.${"0".repeat(Math.max(0, maxFractionDigits - 1))}1`;
	return `${isNegative ? "-" : ""}${integer}`;
}

function formatTokenAmount(value: bigint | string, decimals: number, maxFractionDigits = QUOTE_DISPLAY_DECIMALS) {
	return formatDisplayDecimal(formatUnits(typeof value === "bigint" ? value : BigInt(value), decimals), maxFractionDigits);
}

function shortenIdentifier(value: string, head = 8, tail = 6) {
	return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function getApproximateRate({ sellAmountBeforeFee, buyAmount, sellAsset, buyAsset }: { sellAmountBeforeFee: string | null; buyAmount?: string; sellAsset: DeskAsset | null; buyAsset?: DeskAsset }) {
	if (!sellAmountBeforeFee || !buyAmount || !sellAsset || !buyAsset) return null;
	const sell = Number(formatUnits(BigInt(sellAmountBeforeFee), sellAsset.decimals));
	const buy = Number(formatUnits(BigInt(buyAmount), buyAsset.decimals));
	if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy <= 0) return null;
	return `1 ${sellAsset.symbol} ≈ ${formatDisplayDecimal((buy / sell).toFixed(QUOTE_DISPLAY_DECIMALS), QUOTE_DISPLAY_DECIMALS)} ${buyAsset.symbol}`;
}

function getQuoteExpirationLabel(value?: string) {
	if (!value) return null;
	const milliseconds = new Date(value).getTime() - Date.now();
	if (!Number.isFinite(milliseconds)) return null;
	if (milliseconds <= 0) return "Quote expired";
	if (milliseconds < 60_000) return "Expires in less than 1 minute";
	const minutes = Math.ceil(milliseconds / 60_000);
	return `Expires in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function getOrderStatusLabel(value: any) {
	const raw = value?.status?.status ?? value?.status ?? value?.order?.status ?? value?.order?.class ?? null;
	return typeof raw === "string" ? raw : "submitted";
}

function isOrderComplete(value: any) {
	return ["traded", "filled", "fulfilled"].includes(getOrderStatusLabel(value).toLowerCase());
}

function isOrderExpiredOrCancelled(value: any) {
	return ["expired", "cancelled", "canceled"].includes(getOrderStatusLabel(value).toLowerCase());
}

function isOrderTerminal(value: any) {
	return isOrderComplete(value) || isOrderExpiredOrCancelled(value);
}

function getFriendlyError(error: unknown, fallback: string) {
	console.error(error);
	const message = error instanceof Error ? error.message : String(error ?? "");
	const lower = message.toLowerCase();
	if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected by user")) return lower.includes("sign") ? "Trade confirmation was cancelled. No trade was submitted." : "Token permission was cancelled. You can try again when ready.";
	if (lower.includes("eip-712") || lower.includes("typed data") || lower.includes("1271")) return "This wallet could not sign the CoW order with EIP-712. Smart-contract wallet support will be added separately.";
	if (lower.includes("expired")) return "Quote expired. Refresh the quote and try again.";
	if (lower.includes("cow") || lower.includes("order submission")) return "CoW could not accept this order. Try a smaller amount or refresh the quote.";
	return fallback;
}

function getRouteExplanation(mode: DeskSwapMode) {
	return mode === "get-zchf"
		? "Buy ZCHF: you pay crypto already in your wallet and receive ZCHF."
		: "Sell ZCHF: you sell ZCHF and receive the selected crypto token.";
}

function TokenLogo({ asset }: { asset: DeskAsset }) {
	// eslint-disable-next-line @next/next/no-img-element
	return <img src={asset.logoURI} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-white object-contain" />;
}

function TokenSelectCard({ asset, assets, label, onChange }: { asset: DeskAsset | null; assets: DeskAsset[]; label: string; onChange: (id: string) => void }) {
	return (
		<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-text-secondary">{label}</p>
				<p className="text-xs font-semibold text-text-secondary">Choose token</p>
			</div>
			<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-3 py-3 dark:border-menu-separator">
				{asset ? <TokenLogo asset={asset} /> : null}
				<div className="min-w-0 flex-1">
					<select value={asset?.id ?? ""} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-base font-semibold leading-5 text-text-primary outline-none">
						{assets.map((option) => (
							<option key={option.id} value={option.id}>
								{option.recommended ? `${option.symbol} - suggested` : option.symbol}
							</option>
						))}
					</select>
					{asset ? <p className="mt-0.5 truncate text-xs leading-4 text-text-secondary">{asset.name}</p> : null}
				</div>
			</div>
		</div>
	);
}

function LockedAssetCard({ asset, label }: { asset: DeskAsset | null; label: string }) {
	return (
		<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-text-secondary">{label}</p>
				<span className="rounded-full bg-card-content-primary px-2 py-1 text-xs font-semibold text-text-secondary">Locked</span>
			</div>
			{asset ? (
				<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-3 py-3 dark:border-menu-separator">
					<TokenLogo asset={asset} />
					<div className="min-w-0">
						<p className="text-base font-semibold leading-5 text-text-primary">{asset.symbol}</p>
						<p className="mt-0.5 truncate text-xs leading-4 text-text-secondary">{asset.name}</p>
					</div>
				</div>
			) : (
				<div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">Asset unavailable</div>
			)}
		</div>
	);
}

export default function DeskSwapForm() {
	const connectedChainId = useChainId();
	const { address, isConnected } = useAccount();
	const appKitNetwork = useAppKitNetwork();
	const [side, setSide] = useState<DeskSwapSide>("buy");
	const mode = modeFromDeskSelection(side);
	const [chainId, setChainId] = useState<ChainId>(getDefaultDeskChainForMode(mode));
	const counterAssets = useMemo(() => getDeskCounterAssets(mode, chainId), [chainId, mode]);
	const [counterAssetId, setCounterAssetId] = useState<string>(counterAssets[0]?.id ?? "");
	const [amount, setAmount] = useState<string>("");
	const [quote, setQuote] = useState<DeskQuoteResponse | null>(null);
	const [quoteError, setQuoteError] = useState<string | null>(null);
	const [isQuoteLoading, setIsQuoteLoading] = useState(false);
	const [isRefreshingAfterApproval, setIsRefreshingAfterApproval] = useState(false);
	const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);
	const [executionError, setExecutionError] = useState<string | null>(null);
	const [submittedOrderUid, setSubmittedOrderUid] = useState<string | null>(null);
	const [orderStatus, setOrderStatus] = useState<any | null>(null);
	const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
	const [isCheckingOrderStatus, setIsCheckingOrderStatus] = useState(false);
	const pendingUsdtExactApproval = useRef(false);
	const skipPostApprovalRefresh = useRef(false);

	const route = useMemo(() => getDeskRoute(mode, chainId, counterAssetId), [chainId, counterAssetId, mode]);
	const sellAsset = route?.sellAsset ?? null;
	const isExecutionRoute = Boolean(route && isDeskExecutionRoute(chainId, mode, counterAssetId));
	const selectedChain = getDeskChain(chainId);
	const allowedChains = getAllowedDeskChainsForMode(mode);
	const selectedCounterAsset = route?.counterAsset ?? counterAssets.find((asset) => asset.id === counterAssetId) ?? null;
	const isConnectedToRouteChain = connectedChainId === chainId;
	const amountValidation = useMemo(() => getAmountValidation(amount, sellAsset), [amount, sellAsset]);
	const quoteState = getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, amountValidation, route });
	const sellAmountPreview = route && amount ? `${amount} ${route.sellAsset.symbol}` : "Enter amount";
	const amountLabel = side === "buy" ? "Amount to pay" : "Amount to sell";
	const routeExplanation = getRouteExplanation(mode);

	const { data: sellBalance, isLoading: isBalanceLoading } = useReadContract({
		address: sellAsset?.address,
		abi: ERC20_ABI,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		chainId,
		query: { enabled: Boolean(address && sellAsset?.address) },
	});

	const orderToSign = useMemo(() => {
		if (!quote || !address || !isExecutionRoute) return null;
		return buildDeskOrderToSign({ quote, from: address as Address, receiver: address as Address });
	}, [quote, address, isExecutionRoute]);
	const requiredSellAmount = orderToSign ? BigInt(orderToSign.sellAmount) : null;
	const { data: sellAllowance, isLoading: isAllowanceLoading, refetch: refetchAllowance } = useReadContract({
		address: sellAsset?.address,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: address ? [address, COW_VAULT_RELAYER_ADDRESS] : undefined,
		chainId,
		query: { enabled: Boolean(address && sellAsset?.address && isExecutionRoute && requiredSellAmount !== null) },
	});
	const { writeContractAsync, data: approvalHash, isPending: isApprovalWalletPending } = useWriteContract();
	const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash, chainId });
	const { signTypedDataAsync, isPending: isSignaturePending } = useSignTypedData();

	const hasEnoughAllowance = sellAllowance !== undefined && requiredSellAmount !== null && sellAllowance >= requiredSellAmount;
	const sellAmountBeforeFee = useMemo(() => {
		if (!amount || !sellAsset || amountValidation) return null;
		try {
			return parseUnits(amount, sellAsset.decimals).toString();
		} catch {
			return null;
		}
	}, [amount, amountValidation, sellAsset]);
	const formattedSellAmount = sellAmountBeforeFee && sellAsset ? `${formatTokenAmount(sellAmountBeforeFee, sellAsset.decimals)} ${sellAsset.symbol}` : null;
	const totalSold = orderToSign?.sellAmount && route ? `${formatTokenAmount(orderToSign.sellAmount, route.sellAsset.decimals)} ${route.sellAsset.symbol}` : null;
	const estimatedReceive = quote?.quote?.buyAmount && quote.buyAsset ? `${formatTokenAmount(quote.quote.buyAmount, quote.buyAsset.decimals)} ${quote.buyAsset.symbol}` : null;
	const minimumReceive = orderToSign?.buyAmount && quote?.buyAsset ? `${formatTokenAmount(orderToSign.buyAmount, quote.buyAsset.decimals)} ${quote.buyAsset.symbol}` : null;
	const feeAmount = quote?.quote?.feeAmount && quote.sellAsset ? `${formatTokenAmount(quote.quote.feeAmount, quote.sellAsset.decimals)} ${quote.sellAsset.symbol}` : null;
	const quoteRate = getApproximateRate({ sellAmountBeforeFee, buyAmount: quote?.quote?.buyAmount, sellAsset, buyAsset: quote?.buyAsset });
	const quoteExpirationLabel = getQuoteExpirationLabel(quote?.expiration);
	const buyPreview = estimatedReceive ?? (route ? `${route.buyAsset.symbol} after quote` : "Route unavailable");
	const isQuoteExpired = orderToSign?.validTo ? orderToSign.validTo <= Math.floor(Date.now() / 1000) : false;
	const hasInsufficientBalance = sellBalance !== undefined && sellAmountBeforeFee !== null && BigInt(sellAmountBeforeFee) > sellBalance;
	const isWaitingForBalance = Boolean(address && route && sellAmountBeforeFee && isConnectedToRouteChain && isBalanceLoading);
	const isBalanceUnavailable = Boolean(address && route && sellAmountBeforeFee && isConnectedToRouteChain && !isBalanceLoading && sellBalance === undefined);
	const canRequestQuote = Boolean(address && route && sellAmountBeforeFee && isConnectedToRouteChain && sellBalance !== undefined && !hasInsufficientBalance && !amountValidation);
	const orderStatusLabel = orderStatus ? getOrderStatusLabel(orderStatus) : null;
	const isOrderCompleted = orderStatus ? isOrderComplete(orderStatus) : false;
	const isOrderExpired = orderStatus ? isOrderExpiredOrCancelled(orderStatus) : false;
	const canSwitchRouteChain = Boolean(isConnected && route && !isConnectedToRouteChain);
	const canRetryQuote = Boolean(quoteError && route && amount && !isQuoteLoading);
	const canRefreshExpiredQuote = Boolean(isExecutionRoute && isQuoteExpired && route && amount && !isQuoteLoading);
	const canApprove = Boolean(isExecutionRoute && route && orderToSign && address && estimatedReceive && !isQuoteExpired && !hasEnoughAllowance && !hasInsufficientBalance && !isApprovalWalletPending && !isApprovalConfirming && !isAllowanceLoading);
	const canSignAndSubmit = Boolean(isExecutionRoute && route && quote && orderToSign && address && estimatedReceive && !isQuoteExpired && hasEnoughAllowance && !hasInsufficientBalance && !isApprovalConfirming && !isSignaturePending && !isSubmittingOrder && !submittedOrderUid);
	const canUsePrimaryAction = canSwitchRouteChain || canRetryQuote || canRefreshExpiredQuote || canApprove || canSignAndSubmit || Boolean(submittedOrderUid && !isOrderCompleted);

	const { actionTitle, actionDescription } = (() => {
		if (!route) return { actionTitle: "Route unavailable", actionDescription: "Choose another route." };
		if (!isConnected || !address) return { actionTitle: "Connect wallet", actionDescription: "Connect your wallet to get a live quote." };
		if (!isConnectedToRouteChain) return { actionTitle: `Switch to ${getChainLabel(chainId)}`, actionDescription: `This trade route is available on ${getChainLabel(chainId)}.` };
		if (amountValidation) return { actionTitle: "Enter a valid amount", actionDescription: amountValidation };
		if (!amount || !sellAmountBeforeFee) return { actionTitle: "Enter amount", actionDescription: side === "buy" ? "Choose how much you want to pay." : "Choose how much you want to sell." };
		if (hasInsufficientBalance && sellAsset) return { actionTitle: `Insufficient ${sellAsset.symbol} balance`, actionDescription: `Lower the amount or add more ${sellAsset.symbol} to your wallet.` };
		if (isWaitingForBalance || isBalanceLoading) return { actionTitle: "Loading balance", actionDescription: "Checking your wallet balance." };
		if (isRefreshingAfterApproval) return { actionTitle: "Refreshing quote…", actionDescription: "Approval confirmed. Getting a fresh quote before trading." };
		if (isQuoteLoading) return { actionTitle: "Checking route…", actionDescription: "Looking for a live CoW quote." };
		if (quoteError) return { actionTitle: "Try again", actionDescription: "Refresh the quote or try another amount." };
		if (!estimatedReceive) return { actionTitle: "Checking route…", actionDescription: "Looking for a live CoW quote." };
		if (isQuoteExpired) return { actionTitle: "Refresh quote", actionDescription: "This quote is no longer active." };
		if (isOrderCompleted) return { actionTitle: "Trade completed", actionDescription: `You can find your ${route.buyAsset.symbol} in your wallet.` };
		if (isOrderExpired) return { actionTitle: "Refresh quote", actionDescription: "This quote or order is no longer active." };
		if (isAllowanceLoading) return { actionTitle: "Checking permission", actionDescription: "Checking whether CoW Protocol can use this token for the trade." };
		if (isApprovalWalletPending) return { actionTitle: "Confirm in wallet", actionDescription: "Your wallet will ask you to approve token permission." };
		if (isApprovalConfirming) return { actionTitle: `Approving ${route.sellAsset.symbol} permission…`, actionDescription: `Waiting for confirmation on ${selectedChain?.label ?? "the selected chain"}.` };
		if (isSignaturePending) return { actionTitle: "Sign in wallet", actionDescription: "This signs the CoW order and will execute your trade on-chain." };
		if (isSubmittingOrder) return { actionTitle: "Submitting order…", actionDescription: "Sending your signed order to CoW Protocol." };
		if (submittedOrderUid) return isCheckingOrderStatus ? { actionTitle: "Checking settlement…", actionDescription: "Refreshing the latest CoW order status." } : { actionTitle: "Waiting for CoW solvers to settle the trade.", actionDescription: "" };
		if (!hasEnoughAllowance) return { actionTitle: `Allow CoW Protocol to use up to ${totalSold ?? formattedSellAmount ?? sellAmountPreview}`, actionDescription: "This does not trade yet." };
		if (totalSold && minimumReceive) return { actionTitle: `Sell ${totalSold} for at least ${minimumReceive}`, actionDescription: "" };
		return { actionTitle: "Confirm trade", actionDescription: "You will confirm this in your wallet." };
	})();

	useEffect(() => {
		const fallback = getDefaultDeskChainForMode(mode);
		const allowed = getAllowedDeskChainsForMode(mode);
		if (!allowed.some((chain) => chain.chainId === chainId)) setChainId(fallback);
	}, [chainId, mode]);

	useEffect(() => {
		if (!counterAssets.some((asset) => asset.id === counterAssetId)) setCounterAssetId(counterAssets[0]?.id ?? "");
	}, [counterAssetId, counterAssets]);

	const switchWalletToChain = (nextChainId: ChainId) => {
		const target = WAGMI_CHAINS.find((chain) => chain.id === nextChainId) as AppKitNetwork | undefined;
		if (!target || connectedChainId === nextChainId) return;
		const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
		Promise.resolve(appKitNetwork.switchNetwork(target)).catch(() => null).finally(() => {
			if (typeof window !== "undefined") window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
		});
	};

	const onChainChange = (value: string) => {
		const nextChainId = parseChainId(value, mode);
		setChainId(nextChainId);
		switchWalletToChain(nextChainId);
	};

	const onSideChange = (nextSide: DeskSwapSide) => {
		setSide(nextSide);
		setAmount("");
	};

	const onMaxClick = () => {
		if (!sellAsset || sellBalance === undefined) return;
		setAmount(trimDecimalZeros(formatUnits(sellBalance, sellAsset.decimals)));
	};

	const refreshQuote = () => {
		setQuote(null);
		setQuoteError(null);
		setQuoteRefreshKey((value) => value + 1);
	};

	async function approveSellToken() {
		if (!sellAsset || !orderToSign) return;
		const requiredAmount = BigInt(orderToSign.sellAmount);
		try {
			setExecutionError(null);
			if (needsEthereumUsdtResetApproval(chainId, sellAsset.address, sellAllowance, requiredAmount)) {
				pendingUsdtExactApproval.current = true;
				skipPostApprovalRefresh.current = true;
				await writeContractAsync({ address: sellAsset.address, abi: ERC20_ABI, functionName: "approve", args: [COW_VAULT_RELAYER_ADDRESS, 0n], chainId });
				return;
			}
			await writeContractAsync({ address: sellAsset.address, abi: ERC20_ABI, functionName: "approve", args: [COW_VAULT_RELAYER_ADDRESS, requiredAmount], chainId });
		} catch (error) {
			pendingUsdtExactApproval.current = false;
			skipPostApprovalRefresh.current = false;
			setExecutionError(getFriendlyError(error, "Approval failed."));
		}
	}

	async function signAndSubmitOrder() {
		if (!quote || !orderToSign || !address || !route) return;
		if (isQuoteExpired) return setExecutionError("Quote expired. Refresh the quote and try again.");
		try {
			setExecutionError(null);
			const signature = await signTypedDataAsync({
				domain: getCowOrderDomain(chainId),
				types: COW_ORDER_TYPES,
				primaryType: "Order",
				message: { ...orderToSign, sellAmount: BigInt(orderToSign.sellAmount), buyAmount: BigInt(orderToSign.buyAmount), feeAmount: 0n },
			});
			const submission = buildDeskOrderSubmission({ order: orderToSign, quote, from: address as Address, signature: signature as Hex });
			if (!submission) throw new Error("Quote is missing the order id. Refresh the quote and try again.");
			setIsSubmittingOrder(true);
			const result = await submitDeskOrder({ chainId, mode, counterAssetId, order: submission });
			if (!result.orderUid) throw new Error("CoW accepted the request but did not return an order id.");
			setSubmittedOrderUid(result.orderUid);
		} catch (error) {
			setExecutionError(getFriendlyError(error, "Order submission failed."));
		} finally {
			setIsSubmittingOrder(false);
		}
	}

	async function refreshOrderStatus() {
		if (!submittedOrderUid) return;
		try {
			setExecutionError(null);
			setIsCheckingOrderStatus(true);
			setOrderStatus(await requestDeskOrderStatus(chainId, submittedOrderUid));
		} catch (error) {
			setExecutionError(getFriendlyError(error, "Could not refresh order status."));
		} finally {
			setIsCheckingOrderStatus(false);
		}
	}

	async function onPrimaryAction() {
		setExecutionError(null);
		if (canSwitchRouteChain) return switchWalletToChain(chainId);
		if (canRetryQuote || canRefreshExpiredQuote || (isOrderExpired && submittedOrderUid)) return refreshQuote();
		if (canApprove) return approveSellToken();
		if (canSignAndSubmit) return signAndSubmitOrder();
		if (submittedOrderUid && !isOrderCompleted) await refreshOrderStatus();
	}

	useEffect(() => {
		setExecutionError(null);
		setSubmittedOrderUid(null);
		setOrderStatus(null);
	}, [chainId, mode, counterAssetId, amount, quote]);

	useEffect(() => {
		if (!isApprovalConfirmed) return;
		if (pendingUsdtExactApproval.current) {
			pendingUsdtExactApproval.current = false;
			if (!sellAsset || !orderToSign) return;
			const requiredAmount = BigInt(orderToSign.sellAmount);
			void writeContractAsync({ address: sellAsset.address, abi: ERC20_ABI, functionName: "approve", args: [COW_VAULT_RELAYER_ADDRESS, requiredAmount], chainId })
				.catch((error) => setExecutionError(getFriendlyError(error, "Approval failed.")))
				.finally(() => {
					skipPostApprovalRefresh.current = false;
					refetchAllowance();
				});
			return;
		}
		if (skipPostApprovalRefresh.current) {
			skipPostApprovalRefresh.current = false;
			refetchAllowance();
			return;
		}
		setIsRefreshingAfterApproval(true);
		refetchAllowance();
		refreshQuote();
	}, [chainId, isApprovalConfirmed, orderToSign, refetchAllowance, sellAsset, writeContractAsync]);

	useEffect(() => {
		if (!submittedOrderUid || (orderStatus && isOrderTerminal(orderStatus))) return;
		let cancelled = false;
		let interval: number | null = null;
		const poll = async () => {
			try {
				setIsCheckingOrderStatus(true);
				const result = await requestDeskOrderStatus(chainId, submittedOrderUid);
				if (!cancelled) {
					setOrderStatus(result);
					if (isOrderTerminal(result) && interval) window.clearInterval(interval);
				}
			} catch (error) {
				if (!cancelled) setExecutionError(getFriendlyError(error, "Could not refresh order status."));
			} finally {
				if (!cancelled) setIsCheckingOrderStatus(false);
			}
		};
		poll();
		interval = window.setInterval(poll, 10_000);
		return () => {
			cancelled = true;
			if (interval) window.clearInterval(interval);
		};
	}, [chainId, orderStatus, submittedOrderUid]);

	useEffect(() => {
		setQuote(null);
		setQuoteError(null);
		setIsQuoteLoading(false);
		if (!canRequestQuote || !address || !route || !sellAmountBeforeFee) return setIsRefreshingAfterApproval(false);
		let cancelled = false;
		const timeout = window.setTimeout(async () => {
			setIsQuoteLoading(true);
			try {
				const result = await requestDeskQuote({ chainId, mode, counterAssetId, sellAmountBeforeFee, from: address, receiver: address });
				if (!cancelled) setQuote(result);
			} catch (error) {
				if (!cancelled) setQuoteError(error instanceof Error ? error.message : "Quote request failed.");
			} finally {
				if (!cancelled) {
					setIsQuoteLoading(false);
					setIsRefreshingAfterApproval(false);
				}
			}
		}, 700);
		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [address, canRequestQuote, chainId, counterAssetId, mode, quoteRefreshKey, route, sellAmountBeforeFee]);

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Crypto swap quote</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Swap crypto and ZCHF</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Use supported wallet crypto to buy ZCHF, or sell ZCHF back to crypto. Quotes are powered by CoW Protocol.</p>
				</div>
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-3 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="font-semibold text-text-primary">Looking for FPS or WFPS?</p>
					<p className="mt-1 max-w-sm text-xs leading-5">Use Invest to mint, redeem, wrap, or unwrap Frankencoin Pool Shares.</p>
					<Link href="/equity" className="mt-2 inline-flex text-xs font-semibold text-text-primary underline decoration-[#c4a75f] underline-offset-4">Open Invest</Link>
				</div>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">What do you want to do?</p>
					<div className="mt-2 grid grid-cols-2 gap-2">
						{(["buy", "sell"] as DeskSwapSide[]).map((item) => (
							<button key={item} type="button" onClick={() => onSideChange(item)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${side === item ? "border-[#c4a75f] bg-button-default text-white" : "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"}`}>
								{item === "buy" ? "Buy ZCHF" : "Sell ZCHF"}
							</button>
						))}
					</div>
				</div>

				<label className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
					<span className="text-xs uppercase tracking-wider text-text-secondary">Network</span>
					<select value={chainId} onChange={(event) => onChainChange(event.target.value)} className="mt-2 min-h-[42px] w-full rounded-lg border border-[#e0d4bd] bg-card-content-primary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator">
						{allowedChains.map((chain) => (
							<option key={chain.chainId} value={chain.chainId}>{chain.recommended ? `${chain.label} - recommended` : `${chain.label} - higher gas`}</option>
						))}
					</select>
					<p className="mt-2 text-xs leading-5 text-text-secondary">{selectedChain?.note}</p>
				</label>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{side === "buy" ? <TokenSelectCard asset={selectedCounterAsset} assets={counterAssets} label="You pay" onChange={setCounterAssetId} /> : <LockedAssetCard asset={route?.sellAsset ?? null} label="You sell" />}
						{side === "buy" ? <LockedAssetCard asset={route?.buyAsset ?? null} label="You receive" /> : <TokenSelectCard asset={selectedCounterAsset} assets={counterAssets} label="You receive" onChange={setCounterAssetId} />}
					</div>

					<label className="mt-4 block">
						<span className="mb-1 block text-sm font-medium text-text-secondary">{amountLabel}</span>
						<div className="flex min-h-[48px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white transition hover:border-[#c4a75f] focus-within:border-[#c4a75f] dark:border-menu-separator dark:bg-card-content-primary">
							<input value={amount} onChange={(event) => setAmount(normalizeDecimalInput(event.target.value, sellAsset?.decimals ?? 18))} placeholder="0.00" inputMode="decimal" aria-invalid={Boolean(amountValidation)} className="min-w-0 flex-1 bg-transparent px-4 text-lg font-semibold text-text-primary outline-none placeholder:text-text-secondary/50" />
							<button type="button" onClick={onMaxClick} disabled={!sellAsset || sellBalance === undefined} className="border-l border-[#e0d4bd] px-4 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-menu-separator">Max</button>
						</div>
						<p className="mt-2 text-xs text-text-secondary">{isBalanceLoading ? "Loading balance…" : sellAsset && sellBalance !== undefined ? `Balance: ${formatTokenAmount(sellBalance, sellAsset.decimals, BALANCE_DISPLAY_DECIMALS)} ${sellAsset.symbol}` : "Connect your wallet to see balance."}</p>
						{amountValidation ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-200">{amountValidation}</p> : null}
					</label>

					<AppNotice variant="neutral" message="Need ZCHF on another chain? Buy or swap into ZCHF here, then use Bridge to move it." />
				</div>

				<div className="rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Route preview</p>
					<h3 className="mt-1 text-lg font-semibold text-text-primary">{side === "buy" ? "Buy" : "Sell"} ZCHF</h3>
					<p className="mt-2 text-sm leading-6 text-text-secondary">{routeExplanation}</p>

					<div className="mt-4 space-y-3 rounded-xl border border-[#e0d4bd] bg-card-content-primary p-4 dark:border-menu-separator">
						{[
							["Chain", selectedChain?.label ?? "Unsupported"],
							["You pay", formattedSellAmount ?? sellAmountPreview],
							...(totalSold ? [["Total sold if filled", totalSold]] : []),
							["Estimated receive", buyPreview],
							...(minimumReceive ? [["Minimum receive", minimumReceive], ["Slippage protection", "0.5%"]] : []),
							...(feeAmount ? [["CoW fee estimate", feeAmount]] : []),
							...(quoteRate ? [["Rate", quoteRate]] : []),
						].map(([label, value]) => (
							<div key={label} className="flex items-center justify-between gap-3 text-sm">
								<span className="text-text-secondary">{label}</span>
								<span className="text-right font-semibold text-text-primary">{value}</span>
							</div>
						))}

						<div className="border-t border-[#e0d4bd] pt-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							{amountValidation ? <p className="font-medium text-amber-700 dark:text-amber-200">{amountValidation}</p> : hasInsufficientBalance ? <p className="font-medium text-amber-700 dark:text-amber-200">This route may be available, but your wallet balance is too low.</p> : isWaitingForBalance ? <p>Loading wallet balance before checking the route…</p> : isBalanceUnavailable ? <p className="font-medium text-amber-700 dark:text-amber-200">Wallet balance is unavailable right now. Reconnect your wallet or try again in a moment.</p> : isQuoteLoading ? <p>Checking route…</p> : quoteError ? <p className="font-medium text-amber-700 dark:text-amber-200">{quoteError}</p> : estimatedReceive ? <div><p className="font-semibold text-text-primary">Quote found</p><p className="mt-1">This route can execute now. First allow CoW Protocol to use {route?.sellAsset.symbol}, then confirm the trade in your wallet.</p>{quoteExpirationLabel ? <p className="mt-1">{quoteExpirationLabel}</p> : null}{isQuoteExpired ? <p className="mt-1 font-medium text-amber-700 dark:text-amber-200">Quote expired. Refresh the quote and try again.</p> : null}</div> : <p>{quoteState.message}</p>}
						</div>
					</div>

					{executionError ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">{executionError}</div> : null}
					{submittedOrderUid ? (
						<div className="mt-4 rounded-xl border border-[#e0d4bd] bg-card-content-primary px-4 py-3 text-sm leading-6 text-text-secondary dark:border-menu-separator">
							<p className="font-semibold text-text-primary">{isOrderCompleted ? "Trade completed" : "Waiting for settlement"}</p>
							<p className="mt-1">{isOrderCompleted ? `You can find your ${route?.buyAsset.symbol ?? "tokens"} in your wallet.` : "CoW solvers are working on your trade."}</p>
							<p className="mt-1" title={submittedOrderUid}>Order ID: {shortenIdentifier(submittedOrderUid)}</p>
							<p className="mt-1">Status: {isCheckingOrderStatus ? "checking..." : orderStatusLabel ?? "submitted"}</p>
							<a href={`https://explorer.cow.fi/search/${submittedOrderUid}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-text-primary underline decoration-[#c4a75f] underline-offset-4 hover:opacity-80">Open in CoW Explorer</a>
							{isOrderExpired ? <p className="mt-2 font-medium text-amber-700 dark:text-amber-200">Order expired. Refresh the quote and try again.</p> : null}
						</div>
					) : null}

					<button type="button" onClick={onPrimaryAction} disabled={!canUsePrimaryAction} className={`mt-4 min-h-[58px] w-full rounded-xl px-4 py-3 text-center transition ${isOrderCompleted ? "cursor-default border border-[#c4a75f] bg-card-content-primary text-text-primary" : canUsePrimaryAction ? "bg-button-default text-white hover:opacity-90" : "cursor-not-allowed bg-card-content-primary text-text-secondary opacity-70 dark:bg-card-content-primary"}`}>
						<span className="block text-sm font-semibold leading-5">{actionTitle}</span>
						{actionDescription ? <span className={`mt-1 block text-xs font-medium leading-5 ${canUsePrimaryAction && !isOrderCompleted ? "text-white/80" : "text-text-secondary"}`}>{actionDescription}</span> : null}
					</button>
				</div>
			</div>
		</section>
	);
}

function getQuoteState({ isConnected, isConnectedToRouteChain, address, amount, amountValidation, route }: { isConnected: boolean; isConnectedToRouteChain: boolean; address?: string; amount: string; amountValidation: string | null; route: ReturnType<typeof getDeskRoute> }): QuoteState {
	if (!route) return { status: "blocked", message: "This route is not available in ZCHF Desk." };
	if (!isConnected || !address) return { status: "blocked", message: "Connect your wallet to preview a personalized quote." };
	if (!isConnectedToRouteChain) return { status: "blocked", message: `Switch your wallet to ${getChainLabel(route.sellAsset.chainId)} for this route.` };
	if (!amount || Number(amount) <= 0) return { status: "idle", message: "Enter an amount to check this route." };
	if (amountValidation) return { status: "blocked", message: amountValidation };
	return { status: "ready", message: `This route is ready to check: ${route.sellAsset.symbol} -> ${route.buyAsset.symbol}.` };
}
