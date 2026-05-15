import TableHeader from "../Table/TableHead";
import TableBody from "../Table/TableBody";
import Table from "../Table";
import TableRowEmpty from "../Table/TableRowEmpty";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import { PositionQuery, PriceQueryObjectArray } from "@frankencoin/api";
import { Address, formatUnits } from "viem";
import { normalizeAddress } from "../../utils/format";
import { useEffect, useState } from "react";
import PositionRollerRow from "./PositionRollerRow";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import { mainnet } from "viem/chains";
import AppButton from "@components/AppButton";
import { useRouter as useNavigation } from "next/navigation";

type PositionRollerTableParams = {
	position: PositionQuery;
	challengeSize: bigint;
};

export default function PositionRollerTable({ position }: PositionRollerTableParams) {
	const navigate = useNavigation();

	const headers: string[] = ["Position", "Liquidation Price", "Annual Interest", "Maturity", "ZCHF needed from wallet"];
	const [tab, setTab] = useState<string>(headers[3]);
	const [reverse, setReverse] = useState<boolean>(false);
	const [list, setList] = useState<PositionQuery[]>([]);

	const positions = useSelector((state: RootState) => state.positions.list.list);
	const challengesPosMap = useSelector((state: RootState) => state.challenges.positions.map);
	const prices = useSelector((state: RootState) => state.prices.coingecko);

	const matchingPositions = positions.filter((p) => {
		const pid: Address = normalizeAddress(p.position);
		const isChallenged: boolean = (challengesPosMap[pid] || []).filter((c) => c.status == "Active").length > 0;
		return (
			p.version == 2 &&
			normalizeAddress(p.collateral) === normalizeAddress(position.collateral) &&
			p.expiration > position.expiration && // also excludes same position
			!p.closed &&
			!p.denied &&
			BigInt(p.availableForClones) > BigInt(position.minted) &&
			!isChallenged
		);
	});

	const sorted: PositionQuery[] = sortPositions({
		positions: matchingPositions,
		prices,
		headers,
		tab,
		reverse,
	});

	useEffect(() => {
		const idList = list.map((l) => l.position).join("_");
		const idSorted = sorted.map((l) => l.position).join("_");
		if (idList != idSorted) setList(sorted);
	}, [list, sorted]);

	const handleTabOnChange = function (e: string) {
		if (tab === e) {
			setReverse(!reverse);
		} else {
			if (e === headers[1]) setReverse(true);
			else setReverse(false);

			setTab(e);
		}
	};

	const handleClick = function (position: PositionQuery) {
		const slug = `?source=${normalizeAddress(position.position)}&chain=ethereum`;
		navigate.push("/mint/create" + slug);
	};

	return (
		<>
			<div className="mb-3 rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-3 text-sm text-text-secondary dark:border-menu-separator">
				<div className="font-semibold text-text-primary">How Roll / Merge pays interest</div>
				<p className="mt-1">
					Rolling moves the old debt into the selected target position. The upfront interest for the next period is
					included in the new loan. <span className="font-semibold text-text-primary">ZCHF needed from wallet</span> only
					shows the shortfall that cannot be covered by the target position.
				</p>
				<p className="mt-1">
					0.00 ZCHF means no extra wallet ZCHF is needed: the target already has enough borrowing room, either because
					its liquidation / challenge price is higher or because the collateral is not fully used. Collateral is not sold
					during a normal Roll / Merge.
				</p>
				<p className="mt-1 text-xs">
					Cooldown only matters when more borrowing room must be created by raising the liquidation / challenge price. If
					a target is already in cooldown, the row shows the remaining cooldown time and cannot be used yet.
				</p>
			</div>
			<Table>
				<TableHeader headers={headers} tab={tab} reverse={reverse} tabOnChange={handleTabOnChange} actionCol />
				<TableBody>
					{list.length == 0 ? (
						<TableRowEmpty>
							{
								<div className={`flex flex-col`}>
									<div className="">No open positions available for rolling.</div>
									<div className="mt-4">
										<AppButton className="h-10" onClick={() => handleClick(position)}>
											Propose with new Parameter
										</AppButton>
									</div>
								</div>
							}
						</TableRowEmpty>
					) : (
						list.map((pos) => <PositionRollerRow headers={headers} tab={tab} source={position} target={pos} key={pos.position} />)
					)}
				</TableBody>
			</Table>
		</>
	);
}

type SortPositions = {
	positions: PositionQuery[];
	prices: PriceQueryObjectArray;
	headers: string[];
	tab: string;
	reverse: boolean;
};

function sortPositions(params: SortPositions): PositionQuery[] {
	const { positions, prices, headers, tab, reverse } = params;
	let sortingList = [...positions]; // make it writeable

	if (tab === headers[0]) {
		// sort position address
		sortingList.sort((a, b) => a.position.localeCompare(b.position));
	} else if (tab === headers[1]) {
		// sort for liq. price
		sortingList.sort((a, b) => {
			const calc = function (p: PositionQuery) {
				const liqPrice: number = parseFloat(formatUnits(BigInt(p.price), 36 - p.collateralDecimals));
				return liqPrice;
			};
			return calc(b) - calc(a);
		});
	} else if (tab === headers[2]) {
		// sort for interest
		sortingList.sort((a, b) => {
			return b.annualInterestPPM - a.annualInterestPPM;
		});
	} else if (tab === headers[3]) {
		// sort for maturity
		sortingList.sort((a, b) => {
			return b.expiration - a.expiration;
		});
	} else if (tab === headers[4]) {
		// sort for wallet ZCHF shortfall
		// sortingList.sort((a, b) => {
		// 	return b.expiration - a.expiration; // FIXME: correct logic
		// });
	}

	return reverse ? sortingList.reverse() : sortingList;
}
