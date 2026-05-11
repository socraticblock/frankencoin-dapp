import React, { useEffect, useState } from "react";
import AppCard from "@components/AppCard";
import AppButton from "@components/AppButton";
import TokenInputSelect from "@components/Input/TokenInputSelect";
import { TxToast, renderErrorTxToast } from "@components/TxToast";
import { track, usePoolStats } from "@hooks";
import { ADDRESS, EquityABI, FPSWrapperABI } from "@frankencoin/zchf";
import { WAGMI_CONFIG } from "../../app.config";
import { erc20Abi, formatUnits, zeroAddress } from "viem";
import { useConnection, useReadContract, useReadContracts } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { mainnet } from "viem/chains";
import { formatBigInt, shortenAddress } from "@utils";
import { toast } from "react-toastify";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";

type EquityAction = "Mint FPS" | "Redeem FPS" | "Wrap FPS" | "Unwrap WFPS";

const ACTIONS: EquityAction[] = ["Mint FPS", "Redeem FPS", "Wrap FPS", "Unwrap WFPS"];
const SECONDS_PER_DAY = 86_400n;
const REDEMPTION_DURATION = SECONDS_PER_DAY * 90n;

function formatTokenAmount(amount: bigint) {
	return Math.round(parseFloat(formatUnits(amount, 18)) * 10000) / 10000;
}

function formatDaysLeft(seconds: bigint) {
	if (seconds <= 0n) return "Ready";

	const days = (seconds + SECONDS_PER_DAY - 1n) / SECONDS_PER_DAY;
	return `${days.toString()} day${days === 1n ? "" : "s"}`;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-text-secondary">{label}</span>
			<span className="text-right font-medium text-text-primary">{value}</span>
		</div>
	);
}

export default function EquityInteractionCard() {
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
	const showMintDisabledHelper =
		isMint &&
		!isApproving &&
		!isInvesting &&
		!showMintNoZchfHelper &&
		amount === 0n &&
		!error;

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
				pending: { render: <TxToast title="Approving ZCHF" rows={rows} /> },
				success: { render: <TxToast title="Successfully Approved ZCHF" rows={rows} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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
				pending: { render: <TxToast title="Approving FPS" rows={rows} /> },
				success: { render: <TxToast title="Successfully Approved FPS" rows={rows} /> },
			});
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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
				pending: { render: <TxToast title="Minting FPS" rows={rows} /> },
				success: { render: <TxToast title="Successfully Minted FPS" rows={rows} /> },
			});

			track("fps_invested", { zchf: formatBigInt(amount), fps: formatBigInt(estimatedFps) });
			setAmount(0n);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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
				pending: { render: <TxToast title="Redeeming FPS" rows={rows} /> },
				success: { render: <TxToast title="Successfully Redeemed FPS" rows={rows} /> },
			});

			track("fps_redeemed", { fps: formatBigInt(amount), zchf: formatBigInt(estimatedZchf) });
			setAmount(0n);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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
				pending: { render: <TxToast title="Wrapping FPS" rows={rows} /> },
				success: { render: <TxToast title="Successfully Wrapped FPS" rows={rows} /> },
			});

			track("fps_wrapped", { amount: formatBigInt(amount) });
			setAmount(0n);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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
				pending: { render: <TxToast title="Unwrapping WFPS" rows={rows} /> },
				success: { render: <TxToast title="Successfully Unwrapped WFPS" rows={rows} /> },
			});

			track("fps_unwrapped", { amount: formatBigInt(amount) });
			setAmount(0n);
		} catch (error) {
			toast.error(renderErrorTxToast(error));
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

	return (
		<AppCard className="p-4">
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="text-lg font-semibold text-text-primary">Choose an FPS action</h2>
					<p className="mt-1 text-sm text-text-secondary">{actionCopy}</p>
					{isRedeem ? (
						<p className="mt-2 text-sm text-text-secondary">
							{poolStats.equityCanRedeem
								? "Your average holding duration is above 90 days. Direct redemption is available."
								: "Direct redemption is not ready yet. You can still transfer, wrap, or sell FPS through available market routes."}
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
					{ACTIONS.map((item) => (
						<button
							key={item}
							type="button"
							className={`rounded-lg border px-3 py-2 text-sm transition ${
								action === item
									? "border-button-default bg-card-content-primary font-semibold text-text-primary"
									: "border-menu-separator text-text-secondary hover:text-text-primary"
							}`}
							onClick={() => setAction(item)}
						>
							{item}
						</button>
					))}
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
					<div className="space-y-4">
						<TokenInputSelect
							max={fromBalance}
							min={0n}
							symbol={fromSymbol}
							symbolOptions={[fromSymbol]}
							symbolOnChange={() => {}}
							onChange={onChangeAmount}
							value={amount.toString()}
							error={error}
							placeholder={`${fromSymbol} amount`}
							label={inputLabel}
							limit={fromBalance}
							limitDigit={18}
							limitLabel={isMint ? "Wallet ZCHF balance" : "Balance"}
						/>

						<TokenInputSelect
							symbol={toSymbol}
							symbolOptions={[toSymbol]}
							symbolOnChange={() => {}}
							hideMaxLabel
							output={formatTokenAmount(outputAmount).toFixed(4)}
							label={outputLabel}
							disabled={true}
							limit={
								isMint
									? poolStats.equityBalance
									: isUnwrap
										? poolStats.equityBalance
										: isRedeem
											? poolStats.frankenBalance
											: wfpsBalance
							}
							limitDigit={18}
							limitLabel={
								isMint
									? "Current FPS balance"
									: isRedeem
										? "Wallet ZCHF balance"
										: isWrap
											? "Current WFPS balance"
											: "Current FPS balance"
							}
						/>

						{showMintMoreWarning ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
								Adding new FPS can lower your average holding duration and may delay direct protocol redemption.
							</div>
						) : null}

						{showMintNoZchfHelper ? (
							<p className="text-sm text-text-secondary">No ZCHF available in this wallet.</p>
						) : showMintDisabledHelper ? (
							<p className="text-sm text-text-secondary">Enter an amount of ZCHF to mint FPS.</p>
						) : null}

						<GuardSupportedChain chain={mainnet}>
							<AppButton
								isLoading={isApproving || isInvesting || isRedeeming || isWrapping || isUnwrapping}
								disabled={buttonDisabled}
								onClick={handlePrimaryAction}
							>
								{buttonText}
							</AppButton>
						</GuardSupportedChain>
					</div>

					<aside className="rounded-xl border border-menu-separator bg-card-content-primary p-4">
						<h3 className="font-semibold text-text-primary">Before you sign</h3>
						<p className="mt-2 text-sm text-text-secondary">{previewCopy}</p>
						{isMint || isRedeem ? (
							<p className="mt-2 text-sm text-text-secondary">The protocol pricing formula includes a 0.3% mint/redeem adjustment.</p>
						) : null}
						<div className="mt-4 space-y-2">
							{isMint ? (
								<>
									<PreviewRow label="ZCHF provided" value={`${formatBigInt(amount)} ZCHF`} />
									<PreviewRow label="Estimated FPS received" value={`${formatBigInt(estimatedFps)} FPS`} />
									<PreviewRow label="Protocol pricing adjustment" value="0.3%" />
									<PreviewRow label="New FPS balance" value={`${formatBigInt(poolStats.equityBalance + estimatedFps)} FPS`} />
								</>
							) : isRedeem ? (
								<>
									<PreviewRow label="FPS redeemed" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="Estimated ZCHF received" value={`${formatBigInt(estimatedZchf)} ZCHF`} />
									<PreviewRow label="Protocol pricing adjustment" value="0.3%" />
									<PreviewRow
										label="Remaining FPS balance"
										value={`${formatBigInt(amount > poolStats.equityBalance ? 0n : poolStats.equityBalance - amount)} FPS`}
									/>
								</>
							) : isWrap ? (
								<>
									<PreviewRow label="FPS wrapped" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="WFPS received" value={`${formatBigInt(amount)} WFPS`} />
									<PreviewRow label="Rate" value="1 FPS = 1 WFPS" />
								</>
							) : (
								<>
									<PreviewRow label="WFPS unwrapped" value={`${formatBigInt(amount)} WFPS`} />
									<PreviewRow label="FPS received" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="Rate" value="1 WFPS = 1 FPS" />
								</>
							)}
						</div>
					</aside>
				</div>
			</div>
		</AppCard>
	);
}
