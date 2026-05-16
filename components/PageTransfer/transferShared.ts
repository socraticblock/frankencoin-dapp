import { ChainId } from "@frankencoin/zchf";
import { TransferReferenceQuery } from "@frankencoin/api";
import { AppKitNetwork } from "@reown/appkit/networks";
import { isAddress, parseUnits, zeroAddress } from "viem";
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from "viem/chains";
import { getChainByChainSelector, normalizeAddress } from "@utils";

/** Chains where we show ZCHF balance cards and history chain filter (matches app-supported ZCHF deployments). */
export const BALANCE_DISPLAY_CHAIN_IDS: readonly ChainId[] = [
	mainnet.id as ChainId,
	base.id as ChainId,
	polygon.id as ChainId,
	arbitrum.id as ChainId,
	optimism.id as ChainId,
	gnosis.id as ChainId,
	avalanche.id as ChainId,
	sonic.id as ChainId,
];

/** @deprecated Use BALANCE_DISPLAY_CHAIN_IDS */
export const ZCHF_BALANCE_CHAIN_IDS = BALANCE_DISPLAY_CHAIN_IDS;

/** Chains where same-chain ZCHF transfer is offered (token must exist on-chain). */
export const TRANSFER_SUPPORTED_CHAIN_IDS = BALANCE_DISPLAY_CHAIN_IDS;

/** Chains with tested CCIP bridge lanes for ZCHF (selector + bridge contract). */
export const BRIDGE_SUPPORTED_CHAIN_IDS = BALANCE_DISPLAY_CHAIN_IDS;

export const MIN_ZCHF_FUNDED_THRESHOLD = parseUnits("0.1", 18);
export const TRANSFER_REFERENCE_MAX_LENGTH = 120;

export function orderedZchfBalanceChainNames(chains: readonly AppKitNetwork[]): string[] {
	const byId = new Map(chains.map((c) => [c.id, c.name]));
	return BALANCE_DISPLAY_CHAIN_IDS.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
}

export function orderedChainNamesForIds(chains: readonly AppKitNetwork[], chainIds: readonly ChainId[]): string[] {
	const byId = new Map(chains.map((c) => [c.id, c.name]));
	return chainIds.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
}

export function transferIsBridge(item: TransferReferenceQuery): boolean {
	const targetId = getChainByChainSelector(item.targetChain).id;
	return targetId !== item.chainId;
}

export function transferDirection(item: TransferReferenceQuery, connectedAddress: string): "sent" | "received" {
	return normalizeAddress(item.from) === normalizeAddress(connectedAddress) ? "sent" : "received";
}

export function sanitizeTransferReference(value: string): string {
	return value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, TRANSFER_REFERENCE_MAX_LENGTH);
}

export function getTransferReferenceError(value: string): string | null {
	if (value.length > TRANSFER_REFERENCE_MAX_LENGTH) return `Reference must be ${TRANSFER_REFERENCE_MAX_LENGTH} characters or less.`;
	if (/[\x00-\x1F\x7F]/.test(value)) return "Reference cannot contain control characters.";
	return null;
}

export function getRecipientSafetyError(recipient: string): string | null {
	if (!recipient) return null;
	if (!isAddress(recipient)) return "Invalid recipient address";
	if (recipient.toLowerCase() === zeroAddress) return "Zero address cannot receive ZCHF.";
	return null;
}

export function getRecipientSafetyNote(address: string | undefined, recipient: string): string | undefined {
	if (!recipient || !isAddress(recipient)) return undefined;
	if (address && recipient.toLowerCase() === address.toLowerCase()) return "Warning: this is your connected wallet.";
	return undefined;
}

/** Helper under recipient field in Bridge mode. */
export function bridgeRecipientNote(address: string | undefined, recipient: string): string | undefined {
	if (!recipient) return "Enter recipient wallet address.";
	if (address && recipient.toLowerCase() === address.toLowerCase()) return "Receiving wallet: your connected wallet.";
	if (isAddress(recipient)) return "Receiving wallet: custom address.";
	return "Enter valid wallet address.";
}

export const TRANSFER_HISTORY_HEADERS = ["Date", "Type", "Route", "Direction", "Counterparty", "Amount", "Status"] as const;

export function sortTransferHistory(
	list: TransferReferenceQuery[],
	tab: string,
	reverse: boolean,
	connectedAddress: string
): TransferReferenceQuery[] {
	const headers = TRANSFER_HISTORY_HEADERS;
	const sortingList = [...list];

	if (tab === headers[0]) {
		sortingList.sort((a, b) => b.created - a.created);
	} else if (tab === headers[1]) {
		sortingList.sort((a, b) => {
			const aType = transferIsBridge(a) ? "bridge" : "transfer";
			const bType = transferIsBridge(b) ? "bridge" : "transfer";
			return aType.localeCompare(bType);
		});
	} else if (tab === headers[2]) {
		sortingList.sort((a, b) => a.chainId - b.chainId);
	} else if (tab === headers[3]) {
		sortingList.sort((a, b) => {
			const aDirection = transferDirection(a, connectedAddress);
			const bDirection = transferDirection(b, connectedAddress);
			return aDirection.localeCompare(bDirection);
		});
	} else if (tab === headers[4]) {
		sortingList.sort((a, b) => a.to.localeCompare(b.to));
	} else if (tab === headers[5]) {
		sortingList.sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));
	}

	return reverse ? sortingList.reverse() : sortingList;
}
