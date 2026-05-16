import { useConnection, useReadContracts } from "wagmi";
import { decodeBigIntCall } from "@utils";
import { ADDRESS, BridgedFrankencoinABI, ChainId, ChainIdMain, ChainIdSide, FrankencoinABI } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import { Address, zeroAddress } from "viem";

export type SpenderChain = {
	spender: Address;
	chainId: ChainId;
};

export const useUserAllowance = (spenderChain: SpenderChain[], account?: Address) => {
	const { address } = useConnection();
	const owner = account || address || zeroAddress;

	const { data } = useReadContracts({
		contracts: spenderChain.map((spender) => ({
			address:
				spender.chainId === mainnet.id
					? ADDRESS[spender.chainId as ChainIdMain].frankencoin
					: ADDRESS[spender.chainId as ChainIdSide].ccipBridgedFrankencoin,
			chainId: spender.chainId,
			abi: spender.chainId === mainnet.id ? FrankencoinABI : BridgedFrankencoinABI,
			functionName: "allowance",
			args: [owner, spender.spender],
		})),
		query: { enabled: owner !== zeroAddress },
	});

	return spenderChain.map(({ spender, chainId }, idx) => {
		const result = data?.[idx];
		return {
			spender,
			chainId,
			allowance: result ? decodeBigIntCall(result) : 0n,
		};
	});
};
