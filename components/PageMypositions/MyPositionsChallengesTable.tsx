import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import Table from "@components/Table";
import TableHeader from "@components/Table/TableHead";
import TableBody from "@components/Table/TableBody";
import TableRowEmpty from "@components/Table/TableRowEmpty";
import MyPositionsChallengesRow from "./MyPositionsChallengesRow";
import { Address, formatUnits } from "viem";
import { normalizeAddress } from "../../utils/format";
import {
	ChallengesQueryItem,
	PositionQuery,
	PositionsQueryObjectArray,
} from "@frankencoin/api";
import { useEffect, useState } from "react";

type Props = {
	account: Address;
	challengesOverride?: ChallengesQueryItem[];
};

export default function MyPositionsChallengesTable({ account, challengesOverride }: Props) {
	const headers: string[] = ["Size", "Averted", "Proceeds", "Succeeded", "Rewards"];
	const [tab, setTab] = useState<string>(headers[0]);
	const [reverse, setReverse] = useState<boolean>(false);
	const [list, setList] = useState<ChallengesQueryItem[]>([]);

	const challenges = useSelector((state: RootState) => state.challenges.list.list);
	const positions = useSelector((state: RootState) => state.positions.mapping.map);
	const accountId = normalizeAddress(account);

	const ownedPositionIds = new Set(
		Object.values(positions)
			.filter((p) => normalizeAddress(p.owner) === accountId && !p.closed && !p.denied)
			.map((p) => normalizeAddress(p.position))
	);
	const matchingChallenges =
		challengesOverride ??
		challenges.filter((c) => c.status === "Active" && ownedPositionIds.has(normalizeAddress(c.position)));

	const sorted: ChallengesQueryItem[] = sortChallenges({
		challenges: matchingChallenges,
		positions,
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
			setReverse(false);
			setTab(e);
		}
	};

	return (
		<Table>
			<TableHeader headers={headers} tab={tab} reverse={reverse} tabOnChange={handleTabOnChange} actionCol />
			<TableBody>
				{list.length == 0 ? (
					<TableRowEmpty>{"You do not have any challenges yet."}</TableRowEmpty>
				) : (
					list.map((c) => <MyPositionsChallengesRow headers={headers} tab={tab} key={c.id} challenge={c} />)
				)}
			</TableBody>
		</Table>
	);
}

type SortChallenges = {
	challenges: ChallengesQueryItem[];
	positions: PositionsQueryObjectArray;
	headers: string[];
	tab: string;
	reverse: boolean;
};

function sortChallenges(params: SortChallenges): ChallengesQueryItem[] {
	const { challenges, positions, headers, tab, reverse } = params;
	const sortedChallenges = [...challenges];

	if (tab === headers[0]) {
		// challenge size
		sortedChallenges.sort((a, b) => {
			const calc = function (c: ChallengesQueryItem) {
				const pos: PositionQuery = positions[normalizeAddress(c.position)];
				if (!pos) return 0;
				try {
					return parseFloat(formatUnits(safeBigInt(c.size), safeDecimals(pos.collateralDecimals)));
				} catch {
					return 0;
				}
			};
			return calc(b) - calc(a);
		});
	} else if (tab === headers[1]) {
		// FIXME: unchanged sorting, add feature if needed
	} else if (tab === headers[2]) {
		// FIXME: unchanged sorting, add feature if needed
	} else if (tab === headers[3]) {
		// FIXME: unchanged sorting, add feature if needed
	} else if (tab === headers[4]) {
		// FIXME: unchanged sorting, add feature if needed
	}

	return reverse ? sortedChallenges.reverse() : sortedChallenges;
}

function safeBigInt(value: unknown, fallback = 0n) {
	try {
		if (typeof value === "bigint") return value;
		if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
		if (typeof value === "string" && value.trim() !== "") return BigInt(value);
		return fallback;
	} catch {
		return fallback;
	}
}

function safeDecimals(value: unknown, fallback = 18) {
	const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
	return Math.min(36, Math.max(0, Math.trunc(parsed)));
}
