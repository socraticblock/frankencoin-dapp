import { ADDRESS, BridgedFrankencoinABI, ChainId, ChainIdMain, ChainIdSide, TransferReferenceABI } from "@frankencoin/zchf";
import { getChain } from "@utils";
import { useEffect, useState } from "react";
import { Address, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { readContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../app.config";

async function readCcipFeeWei(params: {
	fromChainId: ChainId;
	targetChainId: ChainId;
	recipient: Address;
	amount: bigint;
}): Promise<bigint> {
	const { fromChainId, targetChainId, recipient, amount } = params;
	const targetChain = getChain(targetChainId);
	const selector = BigInt(ADDRESS[targetChain.id as ChainIdSide].chainSelector);

	if (fromChainId === mainnet.id) {
		return readContract(WAGMI_CONFIG, {
			address: ADDRESS[fromChainId as ChainIdMain].transferReference,
			chainId: fromChainId,
			abi: TransferReferenceABI,
			functionName: "getCCIPFee",
			args: [selector, recipient, amount, true],
		});
	}

	return readContract(WAGMI_CONFIG, {
		address: ADDRESS[fromChainId as ChainIdSide].ccipBridgedFrankencoin,
		chainId: fromChainId,
		abi: BridgedFrankencoinABI,
		functionName: "getCCIPFee",
		args: [selector, recipient, amount, true],
	});
}

/**
 * CCIP fee for cross-chain ZCHF moves. Returns 0 when same-chain or inputs invalid.
 */
export function useTransferCcipFee(params: {
	fromChainId: ChainId;
	toChainId: ChainId;
	recipient: string;
	amount: bigint;
}): bigint {
	const { fromChainId, toChainId, recipient, amount } = params;
	const [ccipFee, setCcipFee] = useState<bigint>(0n);

	useEffect(() => {
		if (fromChainId === toChainId) {
			setCcipFee(0n);
			return;
		}
		if (!isAddress(recipient)) {
			setCcipFee(0n);
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const fee = await readCcipFeeWei({
					fromChainId,
					targetChainId: toChainId,
					recipient: recipient as Address,
					amount,
				});
				if (!cancelled) setCcipFee(fee);
			} catch {
				if (!cancelled) setCcipFee(0n);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [amount, fromChainId, recipient, toChainId]);

	return ccipFee;
}
