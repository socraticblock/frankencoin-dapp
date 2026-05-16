import { mainnet } from "viem/chains";
import type { Address } from "viem";

export const ETHEREUM_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as const;

export function needsEthereumUsdtResetApproval(chainId: number, tokenAddress: Address, currentAllowance: bigint | undefined, requiredAmount: bigint) {
	return (
		chainId === mainnet.id &&
		tokenAddress.toLowerCase() === ETHEREUM_USDT_ADDRESS.toLowerCase() &&
		currentAllowance !== undefined &&
		currentAllowance > 0n &&
		currentAllowance < requiredAmount
	);
}
