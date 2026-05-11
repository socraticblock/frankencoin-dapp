import React, { useEffect, useMemo, useState } from "react";
import { ADDRESS, EquityABI, FPSWrapperABI } from "@frankencoin/zchf";
import { track, usePoolStats } from "@hooks";
import { TxToast, renderErrorTxToast } from "@components/TxToast";
import { WAGMI_CONFIG } from "../../app.config";
import { erc20Abi, zeroAddress } from "viem";
import { useConnection, useReadContract, useReadContracts } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { mainnet } from "viem/chains";
import { formatBigInt, shortenAddress } from "@utils";
import { toast } from "react-toastify";
import { EquityAction, REDEMPTION_DURATION, formatDaysLeft } from "./equityActionShared";

export function useEquityActionController() {
	const [action, setAction] = useState<EquityAction>("Mint FPS");
	const [amount, setAmount] = useState(0n);
	const [error, setError] = useState("");
	const [isApproving, setApproving] = useState(false);
	const [isInvesting, setInvesting] = useState(false);
	const [isRedeeming, setRedeeming] = useState(false);
	const [isWrapping, setWrapping] = useState(false);
	const [isUnwrapping, setUnwrapping] = useState(false);

	const { address } = useConnection();
	const account = address || zeroAddress;
	const chainId = mainnet.id;
	const poolStats = usePoolStats();
	const redemptionLeft = poolStats.equityCanRedeem ? 0n : REDEMPTION_DURATION - poolStats.equityHoldingDuration;

	const { data: fpsResult } = useReadContract({
		address: ADDRESS[chainId].equity,
		chainId,
		abi: EquityABI,
		functionName: "calculateShares",
		args: [amount],
	});

	const { data: frankenResult } = useReadContract({
		address: ADDRESS[chainId].equity,
		chainId,
		abi: EquityABI,
		functionName: "calculateProceeds",
		args: [amount],
	});

	const { data: wrapperData } = useReadContracts({
		contracts: [
			{
				address: ADDRESS[chainId].equity,
				chainId,
				abi: erc20Abi,
				functionName: "allowance",
				args: [account, ADDRESS[chainId].wFPS],
			},
			{
				address: ADDRESS[chainId].wFPS,
				chainId,
				abi: erc20Abi,
				functionName: "balanceOf",
				args: [account],
			},
		],
	});

	const estimatedFps = (fpsResult as bigint | undefined) || 0n;
	const estimatedZchf = (frankenResult as bigint | undefined) || 0n;
	const fpsAllowance = wrapperData?.[0]?.result ? BigInt(String(wrapperData[0].result)) : 0n;
	const wfpsBalance = wrapperData?.[1]?.result ? BigInt(String(wrapperData[1].result)) : 0n;

	const isMint = action === "Mint FPS";
	const isRedeem = action === "Redeem FPS";
	const isWrap = action === "Wrap FPS";
	const isUnwrap = action === "Unwrap WFPS";
	const fromSymbol = isMint ? "ZCHF" : isRedeem || isWrap ? "FPS" : "WFPS";
	const toSymbol = isMint || isUnwrap ? "FPS" : isRedeem ? "ZCHF" : "WFPS";
	const fromBalance = isMint ? poolStats.frankenBalance : isUnwrap ? wfpsBalance : poolStats.equityBalance;
	const outputAmount = isMint ? estimatedFps : isRedeem ? estimatedZchf : amount;
	const outputLabel = isMint ? "Estimated FPS received" : isRedeem ? "Estimated ZCHF received" : isWrap ? "WFPS received" : "FPS received";
	const inputLabel = isMint
		? "Amount of ZCHF to invest"
		: isRedeem
		  ? "Amount of FPS to redeem"
		  : isWrap
		    ? "Amount of FPS to wrap"
		    : "Amount of WFPS to unwrap";
	const actionCopy = isMint
		? "Provide ZCHF to the protocol equity reserve and receive newly minted FPS."
		: isRedeem
		  ? "Direct redemption burns FPS and sends ZCHF from protocol equity."
		  : isWrap
		    ? "Wrapping converts FPS into WFPS 1:1. This does not require the 90-day direct redemption period."
		    : "Unwrapping converts WFPS back into FPS 1:1.";
	const previewCopy = isMint
		? "You provide ZCHF to the protocol equity reserve. The protocol mints FPS based on its current pricing formula."
		: isRedeem
		  ? "You burn FPS through the protocol. The protocol sends ZCHF from equity capital."
		  : isWrap
		    ? "You convert FPS into WFPS 1:1. No direct redemption readiness is required."
		    : "You convert WFPS back into FPS 1:1.";
	const buttonText = isMint
		? amount > poolStats.frankenAllowance
			? "Approve ZCHF"
			: "Mint FPS"
		: isRedeem
		  ? poolStats.equityCanRedeem
				? "Redeem FPS"
				: `Redeem available in ${formatDaysLeft(redemptionLeft)}`
		  : isWrap
		    ? amount > fpsAllowance
				? "Approve FPS"
				: "Wrap FPS"
		    : "Unwrap WFPS";
	const buttonDisabled = amount === 0n || !!error || (isRedeem && !poolStats.equityCanRedeem);
	const showMintMoreWarning = poolStats.equityBalance > 0n && amount > 0n && isMint;
	const showMintNoZchfHelper = isMint && !isApproving && !isInvesting && poolStats.frankenBalance === 0n;
	const showMintDisabledHelper = isMint && !isApproving && !isInvesting && !showMintNoZchfHelper && amount === 0n && !error;
	const isBusy = isApproving || isInvesting || isRedeeming || isWrapping || isUnwrapping;

	useEffect(() => {
		setAmount(0n);
		setError("");
	}, [action]);

	const onChangeAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setAmount(valueBigInt);
		if (valueBigInt > fromBalance) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else {
			setError("");
		}
	};

	const handleApproveZCHF = async () => {
		try {
			setApproving(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].frankencoin,
				chainId,
				abi: erc20Abi,
				functionName: "approve",
				args: [ADDRESS[chainId].equity, amount],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} ZCHF` },
				{ title: "Spender:", value: shortenAddress(ADDRESS[chainId].equity) },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Approving ZCHF", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Approved ZCHF", rows }) },
			});
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setApproving(false);
		}
	};

	const handleApproveFPS = async () => {
		try {
			setApproving(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].equity,
				chainId,
				abi: erc20Abi,
				functionName: "approve",
				args: [ADDRESS[chainId].wFPS, amount],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} FPS` },
				{ title: "Spender:", value: shortenAddress(ADDRESS[chainId].wFPS) },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Approving FPS", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Approved FPS", rows }) },
			});
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setApproving(false);
		}
	};

	const handleMint = async () => {
		try {
			setInvesting(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].equity,
				chainId,
				abi: EquityABI,
				functionName: "invest",
				args: [amount, estimatedFps],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} ZCHF` },
				{ title: "Shares:", value: `${formatBigInt(estimatedFps)} FPS` },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Minting FPS", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Minted FPS", rows }) },
			});
			track("fps_invested", { zchf: formatBigInt(amount), fps: formatBigInt(estimatedFps) });
			setAmount(0n);
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setInvesting(false);
		}
	};

	const handleRedeem = async () => {
		try {
			setRedeeming(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].equity,
				chainId,
				abi: EquityABI,
				functionName: "redeem",
				args: [account, amount],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} FPS` },
				{ title: "Receive:", value: `${formatBigInt(estimatedZchf)} ZCHF` },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Redeeming FPS", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Redeemed FPS", rows }) },
			});
			track("fps_redeemed", { fps: formatBigInt(amount), zchf: formatBigInt(estimatedZchf) });
			setAmount(0n);
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setRedeeming(false);
		}
	};

	const handleWrap = async () => {
		try {
			setWrapping(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].wFPS,
				chainId,
				abi: FPSWrapperABI,
				functionName: "depositFor",
				args: [account, amount],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} FPS` },
				{ title: "Receive:", value: `${formatBigInt(amount)} WFPS` },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Wrapping FPS", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Wrapped FPS", rows }) },
			});
			track("fps_wrapped", { amount: formatBigInt(amount) });
			setAmount(0n);
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setWrapping(false);
		}
	};

	const handleUnwrap = async () => {
		try {
			setUnwrapping(true);
			const hash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].wFPS,
				chainId,
				abi: FPSWrapperABI,
				functionName: "withdrawTo",
				args: [account, amount],
			});
			const rows = [
				{ title: "Amount:", value: `${formatBigInt(amount)} WFPS` },
				{ title: "Receive:", value: `${formatBigInt(amount)} FPS` },
				{ title: "Transaction:", hash },
			];
			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash, confirmations: 1 }), {
				pending: { render: React.createElement(TxToast, { title: "Unwrapping WFPS", rows }) },
				success: { render: React.createElement(TxToast, { title: "Successfully Unwrapped WFPS", rows }) },
			});
			track("fps_unwrapped", { amount: formatBigInt(amount) });
			setAmount(0n);
		} catch (err) {
			toast.error(renderErrorTxToast(err));
		} finally {
			setUnwrapping(false);
		}
	};

	const handlePrimaryAction = () => {
		if (isMint && amount > poolStats.frankenAllowance) return handleApproveZCHF();
		if (isMint) return handleMint();
		if (isRedeem) return handleRedeem();
		if (isWrap && amount > fpsAllowance) return handleApproveFPS();
		if (isWrap) return handleWrap();
		return handleUnwrap();
	};

	const outputLimitAmount = useMemo(() => {
		if (isMint || isUnwrap) return poolStats.equityBalance;
		if (isRedeem) return poolStats.frankenBalance;
		return wfpsBalance;
	}, [isMint, isRedeem, isUnwrap, poolStats.equityBalance, poolStats.frankenBalance, wfpsBalance]);

	const outputLimitLabel = useMemo(() => {
		if (isMint) return "Current FPS balance";
		if (isRedeem) return "Wallet ZCHF balance";
		if (isWrap) return "Current WFPS balance";
		return "Current FPS balance";
	}, [isMint, isRedeem, isWrap]);

	return {
		action,
		setAction,
		amount,
		error,
		onChangeAmount,
		isMint,
		isRedeem,
		isWrap,
		isUnwrap,
		fromSymbol,
		toSymbol,
		fromBalance,
		outputAmount,
		inputLabel,
		outputLabel,
		actionCopy,
		previewCopy,
		buttonText,
		buttonDisabled,
		isBusy,
		showMintMoreWarning,
		showMintNoZchfHelper,
		showMintDisabledHelper,
		poolStats,
		estimatedFps,
		estimatedZchf,
		outputLimitAmount,
		outputLimitLabel,
		handlePrimaryAction,
	};
}
