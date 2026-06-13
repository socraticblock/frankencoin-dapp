import { base, gnosis, mainnet } from "viem/chains";

/**
 * Hub-and-spoke bridge routing for CCIP cross-chain transfers.
 *
 * Rules (per the Frankencoin governance announcement on lane simplification):
 *   - Hub (Ethereum mainnet) can reach any chain.
 *   - Gnosis ↔ Base: direct lane preserved (meaningful liquidity on both sides).
 *   - All other side chains can only reach Ethereum.
 *
 * Pass the full list of supported chain ids so the function knows what
 * "any chain" means for the hub case.
 */
export const HUB_CHAIN_ID = mainnet.id;
export const BASE_CHAIN_ID = base.id;
export const GNOSIS_CHAIN_ID = gnosis.id;

export const getAvailableRecipientChainIds = (senderChainId: number, allChainIds: number[]): number[] => {
	if (senderChainId === HUB_CHAIN_ID) {
		return allChainIds;
	}
	if (senderChainId === BASE_CHAIN_ID || senderChainId === GNOSIS_CHAIN_ID) {
		return [HUB_CHAIN_ID, BASE_CHAIN_ID, GNOSIS_CHAIN_ID];
	}
	return [HUB_CHAIN_ID];
};

export const isHubAndSpokeAllowed = (senderChainId: number, recipientChainId: number): boolean => {
	if (senderChainId === HUB_CHAIN_ID) return true;
	if (senderChainId === recipientChainId) return true; // same-chain always allowed
	if (
		(senderChainId === BASE_CHAIN_ID && recipientChainId === GNOSIS_CHAIN_ID) ||
		(senderChainId === GNOSIS_CHAIN_ID && recipientChainId === BASE_CHAIN_ID)
	) {
		return true; // Gnosis ↔ Base exception
	}
	return recipientChainId === HUB_CHAIN_ID;
};
