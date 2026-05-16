import { Dispatch, SetStateAction, useState } from "react";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { WAGMI_CHAINS, WAGMI_CONFIG } from "../../app.config";
import { toast } from "react-toastify";
import { formatCurrency, shortenAddress } from "@utils";
import { renderErrorTxToast, TxToast } from "@components/TxToast";
import { useConnection, useChainId } from "wagmi";
import AppButton from "@components/AppButton";
import { Address, formatUnits, Hash, isAddress } from "viem";
import { ADDRESS, BridgedFrankencoinABI, ChainIdSide } from "@frankencoin/zchf";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import { track } from "@hooks";
import { AppKitNetwork } from "@reown/appkit/networks";
import { getRecipientSafetyError, getTransferReferenceError } from "./transferShared";

interface Props {
	recipient: Address;
	recipientChain: AppKitNetwork;
	ccipFee: bigint;
	addReference?: boolean;
	reference: string;
	amount: bigint;
	disabled?: boolean;
	buttonLabel?: string;
	setLoaded?: Dispatch<SetStateAction<boolean>>;
	onSubmitted?: (hash: Hash) => void;
}

export default function TransferActionSidechain({
	recipientChain,
	recipient,
	ccipFee,
	reference,
	addReference,
	amount,
	disabled,
	buttonLabel = "Transfer ZCHF",
	setLoaded,
	onSubmitted,
}: Props) {
	const [isAction, setAction] = useState<boolean>(false);
	const [isHidden, setHidden] = useState<boolean>(false);
	const { address } = useConnection();

	const chainId = useChainId();
	const chain = WAGMI_CHAINS.find((c) => c.id == chainId) as AppKitNetwork;
	const isSameChain = recipientChain.name.toLowerCase() == chain.name.toLowerCase();

	const validateBeforeWrite = () => {
		if (!address) return "Connect your wallet.";
		if (amount <= 0n) return "Enter an amount.";
		if (!isAddress(recipient)) return "Enter a valid recipient wallet.";
		return getRecipientSafetyError(recipient) ?? getTransferReferenceError(reference);
	};

	const handleOnClick = async function (e: any) {
		e.preventDefault();
		const validationError = validateBeforeWrite();
		if (validationError) return toast.error(validationError);

		try {
			setAction(true);

			let writeHash: Hash;

			if (isSameChain && addReference) {
				writeHash = await writeContract(WAGMI_CONFIG, {
					address: ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin,
					abi: BridgedFrankencoinABI,
					functionName: "transfer",
					args: [recipient, amount, reference],
				});
			} else if (isSameChain && !addReference) {
				writeHash = await writeContract(WAGMI_CONFIG, {
					address: ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin,
					abi: BridgedFrankencoinABI,
					functionName: "transfer",
					args: [recipient, amount],
				});
			} else {
				if (ccipFee <= 0n) {
					toast.error("Bridge fee is not ready. Try again.");
					return;
				}
				const overwriteABI = [
					{
						inputs: [
							{ internalType: "uint64", name: "targetChain", type: "uint64" },
							{ internalType: "address", name: "recipient", type: "address" },
							{ internalType: "uint256", name: "amount", type: "uint256" },
							{ internalType: "string", name: "ref", type: "string" },
						],
						name: "transfer",
						outputs: [{ internalType: "bool", name: "", type: "bool" }],
						stateMutability: "payable",
						type: "function",
					},
				] as const;

				writeHash = await writeContract(WAGMI_CONFIG, {
					address: ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin,
					abi: overwriteABI,
					functionName: "transfer",
					args: [BigInt(ADDRESS[recipientChain.id as ChainIdSide].chainSelector), recipient, amount, addReference ? reference : ""],
					value: (ccipFee * 12n) / 10n,
				});
			}

			const toastContent = [
				{ title: `Recipient: `, value: shortenAddress(recipient) },
				{ title: `Reference: `, value: reference },
				{ title: `Transfer: `, value: `${formatCurrency(formatUnits(amount, 18))} ZCHF` },
				{ title: "Transaction: ", hash: writeHash },
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: writeHash, confirmations: 1 }), {
				pending: { render: <TxToast title={`Transfer pending...`} rows={toastContent} /> },
				success: { render: <TxToast title="Transfer successful" rows={toastContent} /> },
			});

			track("zchf_transferred", { amount: formatUnits(amount, 18), chain: recipientChain.name, crossChain: !isSameChain });
			if (setLoaded != undefined) setLoaded(true);
			onSubmitted?.(writeHash);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			setAction(false);
		}
	};

	return (
		<GuardSupportedChain chain={chain}>
			<AppButton className="h-10" disabled={isHidden || disabled} isLoading={isAction} onClick={(e) => handleOnClick(e)}>
				{buttonLabel}
			</AppButton>
		</GuardSupportedChain>
	);
}
