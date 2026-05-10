import { Dispatch, SetStateAction, useState } from "react";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../../app.config";
import { toast } from "react-toastify";
import { formatCurrency, getChain } from "@utils";
import { renderErrorTxToast, TxToast } from "@components/TxToast";
import { useConnection, useChainId } from "wagmi";
import AppButton from "@components/AppButton";
import { Address, formatUnits } from "viem";
import { track } from "@hooks";
import { ChainId, SavingsABI } from "@frankencoin/zchf";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";

interface Props {
	savingsModule: Address;
	targetSavingsAmount: bigint;
	displayActionAmount: bigint;
	disabled?: boolean;
	setLoaded?: (val: boolean) => Dispatch<SetStateAction<boolean>>;
	buttonLabel?: string;
}

export default function SavingsActionWithdraw({
	savingsModule,
	targetSavingsAmount,
	displayActionAmount,
	disabled,
	setLoaded,
	buttonLabel = "Withdraw ZCHF",
}: Props) {
	const [isAction, setAction] = useState<boolean>(false);
	const [isHidden, setHidden] = useState<boolean>(false);
	const account = useConnection();
	const chainId = useChainId() as ChainId;
	const chain = getChain(chainId);

	const handleOnClick = async function (e: any) {
		e.preventDefault();
		if (!account.address) return;

		try {
			setAction(true);

			const writeHash = await writeContract(WAGMI_CONFIG, {
				address: savingsModule,
				chainId: chainId,
				abi: SavingsABI,
				functionName: "adjust",
				args: [targetSavingsAmount],
			});

			const actionLabel = buttonLabel === "Withdraw all to wallet" ? "Total received in wallet: " : "Amount received in wallet: ";
			const toastContent = [
				{
					title: `Target earning balance: `,
					value: `${formatCurrency(formatUnits(targetSavingsAmount, 18))} ZCHF`,
				},
				{
					title: actionLabel,
					value: `${formatCurrency(formatUnits(displayActionAmount, 18))} ZCHF`,
				},
				{
					title: "Transaction: ",
					hash: writeHash,
				},
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: writeHash, confirmations: 1 }), {
				pending: {
					render: <TxToast title={`Withdrawing from savings...`} rows={toastContent} />,
				},
				success: {
					render: <TxToast title="Successfully withdrawn" rows={toastContent} />,
				},
			});

			track("savings_withdrawn", { amount: formatUnits(displayActionAmount, 18) });
			setHidden(true);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
		} finally {
			if (setLoaded != undefined) setLoaded(false);
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
