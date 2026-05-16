import { Dispatch, SetStateAction, useState } from "react";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../../app.config";
import { toast } from "react-toastify";
import { formatCurrency, shortenAddress } from "@utils";
import { renderErrorTxToast, TxToast } from "@components/TxToast";
import { useConnection } from "wagmi";
import AppButton from "@components/AppButton";
import { Address, formatUnits, Hash, isAddress } from "viem";
import { ADDRESS, ChainIdSide, FrankencoinABI, TransferReferenceABI } from "@frankencoin/zchf";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import { track } from "@hooks";
import { mainnet } from "viem/chains";
import { useUserAllowance } from "../../hooks/useUserAllowance";
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

export default function TransferActionMainnet({
	recipientChain,
	recipient,
	ccipFee,
	reference,
	addReference = false,
	amount,
	disabled,
	buttonLabel = "Transfer ZCHF",
	setLoaded,
	onSubmitted,
}: Props) {
	const [isApproving, setApproving] = useState<boolean>(false);
	const [isAction, setAction] = useState<boolean>(false);
	const [isHidden, setHidden] = useState<boolean>(false);
	const { address } = useConnection();

	const userAllowance = useUserAllowance([{ spender: ADDRESS[mainnet.id].transferReference, chainId: mainnet.id }]);
	const allowance = userAllowance[0].allowance;
	const isSameChain = recipientChain.name.toLowerCase() == mainnet.name.toLowerCase();
	const needsReferenceContract = !isSameChain || addReference;
	const needsApproval = needsReferenceContract && allowance < amount;

	const validateBeforeWrite = () => {
		if (!address) return "Connect your wallet.";
		if (amount <= 0n) return "Enter an amount.";
		if (!isAddress(recipient)) return "Enter a valid recipient wallet.";
		return getRecipientSafetyError(recipient) ?? getTransferReferenceError(reference);
	};

	const handleApprove = async (e: any) => {
		e.preventDefault();
		const validationError = validateBeforeWrite();
		if (validationError) return toast.error(validationError);

		try {
			setApproving(true);

			const approveWriteHash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[mainnet.id].frankencoin,
				chainId: mainnet.id,
				abi: FrankencoinABI,
				functionName: "approve",
				args: [ADDRESS[mainnet.id].transferReference, amount],
			});

			const toastContent = [
				{ title: "Amount:", value: `${formatCurrency(formatUnits(amount, 18))} ZCHF` },
				{ title: "Spender: ", value: shortenAddress(ADDRESS[mainnet.id].transferReference) },
				{ title: "Transaction:", hash: approveWriteHash },
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: approveWriteHash, confirmations: 1 }), {
				pending: { render: <TxToast title={`Approving exact ZCHF amount`} rows={toastContent} /> },
				success: { render: <TxToast title={`Successfully approved exact ZCHF amount`} rows={toastContent} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			setApproving(false);
		}
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
					address: ADDRESS[mainnet.id].transferReference,
					chainId: mainnet.id,
					abi: TransferReferenceABI,
					functionName: "transfer",
					args: [recipient, amount, reference],
				});
			} else if (isSameChain && !addReference) {
				writeHash = await writeContract(WAGMI_CONFIG, {
					address: ADDRESS[mainnet.id].frankencoin,
					chainId: mainnet.id,
					abi: FrankencoinABI,
					functionName: "transfer",
					args: [recipient, amount],
				});
			} else {
				if (ccipFee <= 0n) {
					toast.error("Bridge fee is not ready. Try again.");
					return;
				}
				writeHash = await writeContract(WAGMI_CONFIG, {
					address: ADDRESS[mainnet.id].transferReference,
					chainId: mainnet.id,
					abi: TransferReferenceABI,
					functionName: "crossTransfer",
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
		<GuardSupportedChain chain={mainnet}>
			{needsApproval ? (
				<AppButton className="h-10" disabled={isHidden || disabled} isLoading={isApproving} onClick={(e) => handleApprove(e)}>
					Approve exact amount
				</AppButton>
			) : (
				<AppButton className="h-10" disabled={isHidden || disabled} isLoading={isAction} onClick={(e) => handleOnClick(e)}>
					{buttonLabel}
				</AppButton>
			)}
		</GuardSupportedChain>
	);
}
