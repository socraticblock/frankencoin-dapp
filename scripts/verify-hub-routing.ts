/**
 * Hub-and-spoke bridge routing — verification script.
 *
 * Confirms that `getAvailableRecipientChainIds` and `isHubAndSpokeAllowed`
 * produce the expected outputs for every supported chain, per the
 * governance announcement on lane simplification.
 *
 * Run with: yarn verify:routing
 */

import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from "viem/chains";
import { getAvailableRecipientChainIds, isHubAndSpokeAllowed } from "../utils/hubRouting";

let pass = 0;
let fail = 0;

function assertEq<T>(actual: T, expected: T, label: string): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a === e) {
		pass++;
		console.log(`  v ${label}`);
	} else {
		fail++;
		console.error(`  X ${label}\n      expected: ${e}\n      actual:   ${a}`);
	}
}

const ALL_CHAIN_IDS = [mainnet.id, polygon.id, optimism.id, arbitrum.id, base.id, avalanche.id, gnosis.id, sonic.id];
const ALL_PAIR = new Set(ALL_CHAIN_IDS.map((id) => id));

console.log("\n-- getAvailableRecipientChainIds(senderChainId, allChainIds) --");

assertEq(
	getAvailableRecipientChainIds(mainnet.id, ALL_CHAIN_IDS).sort((a, b) => a - b),
	[...ALL_PAIR].sort((a, b) => a - b),
	"Ethereum (hub) -> all 8 chains"
);

assertEq(
	getAvailableRecipientChainIds(base.id, ALL_CHAIN_IDS).sort((a, b) => a - b),
	[mainnet.id, base.id, gnosis.id].sort((a, b) => a - b),
	"Base -> [Ethereum, Base, Gnosis]"
);
assertEq(
	getAvailableRecipientChainIds(gnosis.id, ALL_CHAIN_IDS).sort((a, b) => a - b),
	[mainnet.id, base.id, gnosis.id].sort((a, b) => a - b),
	"Gnosis -> [Ethereum, Base, Gnosis]"
);

for (const { id, name } of [
	{ id: polygon.id, name: "Polygon" },
	{ id: optimism.id, name: "OP Mainnet" },
	{ id: arbitrum.id, name: "Arbitrum One" },
	{ id: avalanche.id, name: "Avalanche" },
	{ id: sonic.id, name: "Sonic" },
]) {
	assertEq(
		getAvailableRecipientChainIds(id, ALL_CHAIN_IDS),
		[mainnet.id],
		`${name} -> [Ethereum only]`
	);
}

console.log("\n-- isHubAndSpokeAllowed(senderChainId, recipientChainId) --");

for (const id of ALL_CHAIN_IDS) {
	const name = (() => {
		switch (id) {
			case mainnet.id: return "Ethereum";
			case polygon.id: return "Polygon";
			case optimism.id: return "OP Mainnet";
			case arbitrum.id: return "Arbitrum One";
			case base.id: return "Base";
			case avalanche.id: return "Avalanche";
			case gnosis.id: return "Gnosis";
			case sonic.id: return "Sonic";
			default: return `chain ${id}`;
		}
	})();
	assertEq(isHubAndSpokeAllowed(id, id), true, `${name} -> ${name} (same chain) allowed`);
}

for (const targetId of ALL_CHAIN_IDS) {
	if (targetId === mainnet.id) continue;
	const name = (() => {
		switch (targetId) {
			case polygon.id: return "Polygon";
			case optimism.id: return "OP Mainnet";
			case arbitrum.id: return "Arbitrum One";
			case base.id: return "Base";
			case avalanche.id: return "Avalanche";
			case gnosis.id: return "Gnosis";
			case sonic.id: return "Sonic";
			default: return `chain ${targetId}`;
		}
	})();
	assertEq(isHubAndSpokeAllowed(mainnet.id, targetId), true, `Ethereum -> ${name} allowed`);
}

for (const source of [polygon.id, optimism.id, arbitrum.id, base.id, avalanche.id, gnosis.id, sonic.id]) {
	const sName = (() => {
		switch (source) {
			case polygon.id: return "Polygon";
			case optimism.id: return "OP Mainnet";
			case arbitrum.id: return "Arbitrum One";
			case base.id: return "Base";
			case avalanche.id: return "Avalanche";
			case gnosis.id: return "Gnosis";
			case sonic.id: return "Sonic";
			default: return `chain ${source}`;
		}
	})();
	assertEq(isHubAndSpokeAllowed(source, mainnet.id), true, `${sName} -> Ethereum allowed`);
}

assertEq(isHubAndSpokeAllowed(base.id, gnosis.id), true, "Base -> Gnosis allowed (Gnosis<->Base lane)");
assertEq(isHubAndSpokeAllowed(gnosis.id, base.id), true, "Gnosis -> Base allowed (Gnosis<->Base lane)");

const blockedPairs: Array<[number, number, string, string]> = [
	[polygon.id, optimism.id, "Polygon", "OP Mainnet"],
	[polygon.id, arbitrum.id, "Polygon", "Arbitrum One"],
	[polygon.id, base.id, "Polygon", "Base"],
	[polygon.id, gnosis.id, "Polygon", "Gnosis"],
	[polygon.id, avalanche.id, "Polygon", "Avalanche"],
	[polygon.id, sonic.id, "Polygon", "Sonic"],
	[optimism.id, base.id, "OP Mainnet", "Base"],
	[optimism.id, gnosis.id, "OP Mainnet", "Gnosis"],
	[optimism.id, arbitrum.id, "OP Mainnet", "Arbitrum One"],
	[optimism.id, polygon.id, "OP Mainnet", "Polygon"],
	[optimism.id, avalanche.id, "OP Mainnet", "Avalanche"],
	[optimism.id, sonic.id, "OP Mainnet", "Sonic"],
	[arbitrum.id, base.id, "Arbitrum One", "Base"],
	[arbitrum.id, gnosis.id, "Arbitrum One", "Gnosis"],
	[arbitrum.id, optimism.id, "Arbitrum One", "OP Mainnet"],
	[arbitrum.id, polygon.id, "Arbitrum One", "Polygon"],
	[arbitrum.id, avalanche.id, "Arbitrum One", "Avalanche"],
	[arbitrum.id, sonic.id, "Arbitrum One", "Sonic"],
	[base.id, optimism.id, "Base", "OP Mainnet"],
	[base.id, arbitrum.id, "Base", "Arbitrum One"],
	[base.id, polygon.id, "Base", "Polygon"],
	[base.id, avalanche.id, "Base", "Avalanche"],
	[base.id, sonic.id, "Base", "Sonic"],
	[gnosis.id, optimism.id, "Gnosis", "OP Mainnet"],
	[gnosis.id, arbitrum.id, "Gnosis", "Arbitrum One"],
	[gnosis.id, polygon.id, "Gnosis", "Polygon"],
	[gnosis.id, avalanche.id, "Gnosis", "Avalanche"],
	[gnosis.id, sonic.id, "Gnosis", "Sonic"],
	[avalanche.id, sonic.id, "Avalanche", "Sonic"],
];

for (const [from, to, fromName, toName] of blockedPairs) {
	assertEq(isHubAndSpokeAllowed(from, to), false, `${fromName} -> ${toName} BLOCKED`);
}

console.log(`\n----------------`);
console.log(`  ${pass} passed, ${fail} failed`);
if (fail > 0) {
	process.exit(1);
}
process.exit(0);
