import { ADDRESS, BridgedFrankencoinABI, ChainId, ChainIdMain, ChainIdSide, TransferReferenceABI } from "@frankencoin/zchf";
import { getChain } from "@utils";
import { useEffect, useState } from "react";
import { Address, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { readContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../app.config";

export type TransferCcipFeeState = {
	fee: bigint;
	isLoading: boolean;
	isReady: boolean;
	error: string | null;
};

const READY_ZERO_FEE: TransferCcipFeeState = { fee: 0n, isLoading: false, isReady: true, error: null };
const WAITING_FOR_INPUT: TransferCcipFeeState = { fee: 0n, isLoading: false, isReady: false, error: null };

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
 * CCIP fee for cross-chain ZCHF moves.
 * Same-chain transfers are ready with zero CCIP fee. Cross-chain bridge actions
 * are only ready after a successful fee quote.
 */
export function useTransferCcipFee(params: {
	fromChainId: ChainId;
	toChainId: ChainId;
	recipient: string;
	amount: bigint;
}): TransferCcipFeeState {
	const { fromChainId, toChainId, recipient, amount } = params;
	const [state, setState] = useState<TransferCcipFeeState>(READY_ZERO_FEE);

	useEffect(() => {
		if (fromChainId === toChainId) {
			setState(READY_ZERO_FEE);
			return;
		}
		if (!isAddress(recipient) || amount <= 0n) {
			setState(WAITING_FOR_INPUT);
			return;
		}

		let cancelled = false;
		setState({ fee: 0n, isLoading: true, isReady: false, error: null });

		void (async () => {
			try {
				const fee = await readCcipFeeWei({
					fromChainId,
					targetChainId: toChainId,
					recipient: recipient as Address,
					amount,
				});
				if (!cancelled) setState({ fee, isLoading: false, isReady: true, error: null });
			} catch {
				if (!cancelled) setState({ fee: 0n, isLoading: false, isReady: false, error: "Bridge fee is unavailable. Try again or choose another route." });
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [amount, fromChainId, recipient, toChainId]);

	return state;
}
