import AppCard from "@components/AppCard";
import TokenInputChain from "@components/Input/TokenInputChain";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide, FrankencoinABI, SavingsABI } from "@frankencoin/zchf";
import { useConnection, useBlockNumber, useChainId } from "wagmi";
import { Address, isAddress, parseUnits, zeroAddress } from "viem";
import { useEffect, useRef, useState } from "react";
import SavingsDetailsCard from "./SavingsDetailsCard";
import { readContract } from "wagmi/actions";
import { WAGMI_CHAINS, WAGMI_CONFIG } from "../../app.config";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import SavingsActionInterest from "./SavingsActionInterest";
import SavingsActionSave from "./SavingsActionSave";
import SavingsActionWithdraw from "./SavingsActionWithdraw";
import AppToggle from "@components/AppToggle";
import AddressInput from "@components/Input/AddressInput";
import SavingsActionSaveOnBehalf from "./SavingsActionSaveOnBehalf";
import { ContractUrl, getChain, normalizeAddress, shortenAddress } from "@utils";
import { useRouter } from "next/router";
import AppLink from "@components/AppLink";
import { AppKitNetwork } from "@reown/appkit/networks";
import { useAppKitNetwork } from "@reown/appkit/react";
import AppChainBadge from "@components/AppChainBadge";

export type EarnFormIntent = "collect" | "deposit" | "withdraw" | null;

type SavingsInteractionCardProps = {
	earnFormIntent?: EarnFormIntent;
	onConsumeEarnFormIntent?: () => void;
	lockChainSelector?: boolean;
};

export default function SavingsInteractionCard({
	earnFormIntent = null,
	onConsumeEarnFormIntent,
	lockChainSelector = false,
}: SavingsInteractionCardProps) {
	const onConsumeRef = useRef(onConsumeEarnFormIntent);
	onConsumeRef.current = onConsumeEarnFormIntent;

	const { status } = useSelector((state: RootState) => state.savings.savingsInfo);
	const chainId = useChainId() as ChainId;
	const chain = getChain(chainId);
	const AppKitNetwork = useAppKitNetwork();

	const [amount, setAmount] = useState(0n);
	const [error, setError] = useState("");
	const [isLoaded, setLoaded] = useState<boolean>(false);

	const [userBalance, setUserBalance] = useState(0n);
	const [userSavingsBalance, setUserSavingsBalance] = useState(0n);
	const [userSavingsTicks, setUserSavingsTicks] = useState(0n);
	const [userSavingsInterest, setUserSavingsInterest] = useState(0n);
	const [userSavingsLocktime, setUserSavingsLocktime] = useState(0n);
	const [userSavingsReferrer, setUserSavingsReferrer] = useState<Address>(zeroAddress);
	const [userSavingsReferralFeePPM, setUserSavingsReferralFeePPM] = useState(0n);
	const [userSavingsReferralFees, setUserSavingsReferralFees] = useState(0n);
	const [newReferrer, setNewReferrer] = useState<Address | undefined>(undefined);
	const [newReferralFeePPM, setNewReferralFeePPM] = useState(0n);
	const [currentTicks, setCurrentTicks] = useState(0n);
	const [onbehalfToggle, setOnbehalfToggle] = useState(false);
	const [onbehalfAddress, setOnbehalfAddress] = useState("");
	const [onbehalfError, setOnbehalfError] = useState("");

	const frankencoinAddress =
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].frankencoin : ADDRESS[chainId as ChainIdSide].ccipBridgedFrankencoin;
	const savingsAdresse = normalizeAddress(
		chainId == 1 ? ADDRESS[chainId as ChainIdMain].savingsReferral : ADDRESS[chainId as ChainIdSide].ccipBridgedSavings
	);

	const chainStatus = status?.[chainId]?.[savingsAdresse];

	const { data } = useBlockNumber({ watch: true });
	const { address } = useConnection();
	const router = useRouter();

	const queryAddress: Address = normalizeAddress(String(router.query.address));
	const account = isAddress(queryAddress) ? queryAddress : address ?? zeroAddress;

	const queryReferrer: Address = router.query.referrer as Address;
	const queryReferralFeePPM: string = router.query.referralFeePPM as string;

	const fromSymbol = "ZCHF";
	const change: bigint = amount - (userSavingsBalance + userSavingsInterest);
	const direction: boolean = amount >= userSavingsBalance + userSavingsInterest;
	const hasActionableFunds = userBalance > 0n || userSavingsBalance > 0n || userSavingsInterest > 0n;
	// ---------------------------------------------------------------------------

	useEffect(() => {
		if (queryReferrer != undefined && queryReferrer.length != 0) {
			if (isAddress(queryReferrer)) {
				setNewReferrer(queryReferrer);
			}
		}
		if (queryReferralFeePPM != undefined && queryReferralFeePPM.length != 0) {
			if (BigInt(queryReferralFeePPM) > 0n) {
				setNewReferralFeePPM(BigInt(queryReferralFeePPM));
			}
		}
	}, [queryReferrer, queryReferralFeePPM]);

	useEffect(() => {
		if (!isAddress(account)) return;
		if (!chainStatus) return;

		const fetchAsync = async function () {
			const _balance = await readContract(WAGMI_CONFIG, {
				address: frankencoinAddress,
				chainId: chainId,
				abi: FrankencoinABI,
				functionName: "balanceOf",
				args: [account],
			});
			setUserBalance(_balance);

			const [_userSavings, _userTicks] = await readContract(WAGMI_CONFIG, {
				address: savingsAdresse,
				chainId: chainId,
				abi: SavingsABI,
				functionName: "savings",
				args: [account],
			});
			setUserSavingsBalance(_userSavings);
			setUserSavingsTicks(_userTicks);

			const _current = await readContract(WAGMI_CONFIG, {
				address: savingsAdresse,
				chainId: chainId,
				abi: SavingsABI,
				functionName: "currentTicks",
			});
			setCurrentTicks(_current);

			const safeRate = BigInt(chainStatus.rate || 0);
			const _locktime = safeRate > 0n && _userTicks >= _current ? (_userTicks - _current) / safeRate : 0n;
			setUserSavingsLocktime(_locktime);

			const _tickDiff = _current - _userTicks;
			const _interest = _userTicks == 0n || _locktime > 0 ? 0n : (_tickDiff * _userSavings) / (1_000_000n * 365n * 24n * 60n * 60n);

			setUserSavingsInterest(_interest);

			const [, , _referrer, _referralFeePPM] = await readContract(WAGMI_CONFIG, {
				address: savingsAdresse,
				chainId,
				abi: SavingsABI,
				functionName: "savings",
				args: [account],
			});

			setUserSavingsReferrer(_referrer);
			setUserSavingsReferralFeePPM(BigInt(_referralFeePPM));

			const _fee = (_interest * BigInt(_referralFeePPM)) / 1_000_000n;
			setUserSavingsReferralFees(_fee);

			if (!isLoaded) {
				setAmount(_userSavings);
				setLoaded(true);
			}
		};

		fetchAsync();
	}, [data, account, isLoaded, frankencoinAddress, savingsAdresse, chainStatus, chainId]);

	useEffect(() => {
		setLoaded(false);
	}, [account]);

	useEffect(() => {
		if (isAddress(onbehalfAddress) || onbehalfAddress == "") {
			setOnbehalfError("");
		} else {
			setOnbehalfError("Address is not valid.");
		}
	}, [onbehalfAddress]);

	useEffect(() => {
		if (amount > userBalance + (!onbehalfToggle ? userSavingsBalance + userSavingsInterest : 0n)) {
			setError(`Not enough ${fromSymbol} in your wallet.`);
		} else {
			setError("");
		}
	}, [amount, onbehalfToggle, userBalance, userSavingsBalance, userSavingsInterest]);

	useEffect(() => {
		if (!earnFormIntent || !isLoaded || onbehalfToggle) return;
		if (earnFormIntent === "collect") {
			setAmount(userSavingsBalance);
		} else if (earnFormIntent === "deposit") {
			const bump = userBalance > 0n ? (userBalance >= parseUnits("0.01", 18) ? parseUnits("0.01", 18) : userBalance) : 0n;
			const maxTarget = userSavingsBalance + userSavingsInterest + userBalance;
			const next = userSavingsBalance + userSavingsInterest + bump;
			setAmount(next > maxTarget ? maxTarget : next > userSavingsBalance + userSavingsInterest ? next : userSavingsBalance + userSavingsInterest);
		} else if (earnFormIntent === "withdraw") {
			setAmount(0n);
		}
		onConsumeRef.current?.();
	}, [earnFormIntent, isLoaded, onbehalfToggle, userBalance, userSavingsBalance, userSavingsInterest]);

	// ---------------------------------------------------------------------------

	const onChangeChain = (value: string) => {
		if (lockChainSelector) return;
		const chain = WAGMI_CHAINS.find((c) => c.name == value) as AppKitNetwork;
		if (chain != undefined) AppKitNetwork.switchNetwork(chain);
	};

	const onChangeAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setAmount(valueBigInt);
	};

	return (
		<section className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
			{!chainStatus ? (
				<AppCard>
					<div className="text-text-secondary">Savings data is loading for this chain. Please wait a moment.</div>
				</AppCard>
			) : null}
			<AppCard>
				<div className="flex items-center justify-between gap-3">
					<div className="text-lg font-bold">{!onbehalfToggle ? "Earn with ZCHF" : "Save for another address"}</div>
					<AppChainBadge label={`Saving on ${chain.name}`} />
				</div>

				<div className="mt-8">
					<TokenInputChain
						label={!onbehalfToggle ? "Your savings" : "You save"}
						chain={chain.name}
						min={!onbehalfToggle ? BigInt("0") : undefined}
						max={!onbehalfToggle ? userBalance + userSavingsBalance + userSavingsInterest : userBalance}
						reset={!onbehalfToggle ? userSavingsBalance : 0n}
						symbol={fromSymbol}
						placeholder={fromSymbol + " Amount"}
						value={amount.toString()}
						onChange={onChangeAmount}
						error={error}
						limit={userBalance}
						limitDigit={18}
						limitLabel="Balance"
						onChangeChain={onChangeChain}
						lockChainSelector={lockChainSelector}
						tokenLogo={"ZCHF"}
					/>
				</div>

				<div className="">
					{onbehalfToggle ? (
						<AddressInput
							label="To address"
							placeholder="0x1a2b3c..."
							error={onbehalfError}
							value={onbehalfAddress}
							onChange={setOnbehalfAddress}
						/>
					) : null}
					<AppToggle disabled={false} label="Custom target address" enabled={onbehalfToggle} onChange={setOnbehalfToggle} />
				</div>

				<div className="mx-auto my-4 w-full flex-col flex gap-4">
					{!onbehalfToggle && isLoaded && !hasActionableFunds ? (
						<div className="rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
							Add ZCHF on {chain.name} to start earning.
						</div>
					) : onbehalfToggle ? (
						<SavingsActionSaveOnBehalf
							disabled={onbehalfError != "" || onbehalfAddress == ""}
							savingsModule={savingsAdresse}
							amount={amount}
							onBehalf={onbehalfAddress as Address}
						/>
					) : userSavingsInterest > 0 && amount == userSavingsBalance ? (
						<SavingsActionInterest
							disabled={!!error}
							savingsModule={savingsAdresse}
							balance={userSavingsBalance}
							interest={userSavingsInterest}
							newReferrer={newReferrer}
							newReferralFeePPM={newReferralFeePPM}
						/>
					) : amount > userSavingsBalance ? (
						<SavingsActionSave
							disabled={!!error}
							savingsModule={savingsAdresse}
							amount={amount}
							interest={userSavingsInterest}
							newReferrer={newReferrer}
							newReferralFeePPM={newReferralFeePPM}
						/>
					) : (
						<SavingsActionWithdraw
							disabled={userSavingsBalance == 0n || !!error}
							savingsModule={savingsAdresse}
							balance={amount}
							change={change}
							newReferrer={newReferrer}
							newReferralFeePPM={newReferralFeePPM}
						/>
					)}
				</div>

				{newReferrer ? (
					<div className="flex mt-8">
						<div className={`flex-1 text-text-secondary`}>
							<span className="font-semibold">Notice: </span>
							You are about to set a referrer{" "}
							<AppLink
								className="pr-2"
								label={shortenAddress(newReferrer)}
								href={ContractUrl(newReferrer, chain)}
								external={true}
							/>
							who will receive <span className="font-semibold">{Math.round(Number(newReferralFeePPM / 1000n)) / 10}%</span> of
							your earned interest.
						</div>
					</div>
				) : null}
			</AppCard>

			{!onbehalfToggle && isLoaded && !hasActionableFunds ? null : (
				<SavingsDetailsCard
					account={account}
					chain={chain}
					balance={userSavingsBalance}
					change={isLoaded && !onbehalfToggle ? change : 0n}
					direction={direction}
					interest={isLoaded && !onbehalfToggle ? userSavingsInterest : 0n}
					locktime={userSavingsLocktime}
					referrer={userSavingsReferrer}
					referralFeePPM={userSavingsReferralFeePPM}
					referralFees={userSavingsReferralFees}
				/>
			)}
		</section>
	);
}
