export type JourneyStationId =
	| "thesis"
	| "zchf"
	| "collateral"
	| "oracleFree"
	| "challenge"
	| "earn"
	| "fps"
	| "responsibility";

export type JourneyStation = {
	id: JourneyStationId;
	step: number;
	start: number;
	end: number;
	eyebrow: string;
	headline: string;
	body: string[];
	caution?: string;
	learnMore?: { label: string; href: string };
	exampleCard?: { label: string; value: string }[];
};

export type CameraKeyframe = {
	id: JourneyStationId;
	position: [number, number, number];
	target: [number, number, number];
};

export const journeyStations: JourneyStation[] = [
	{
		id: "thesis",
		step: 1,
		start: 0.0,
		end: 0.12,
		eyebrow: "Step 1",
		headline: "From research to protocol",
		body: [
			"Frankencoin was conceived as part of Luzius Meisser's PhD thesis at the University of Zurich.",
			"The idea: a Swiss-franc stablecoin designed around collateral, market challenges, reserves, and defensive veto rights.",
		],
		learnMore: { label: "Read the thesis abstract", href: "https://docs.frankencoin.com" },
	},
	{
		id: "zchf",
		step: 2,
		start: 0.12,
		end: 0.24,
		eyebrow: "Step 2",
		headline: "ZCHF is a digital Swiss franc",
		body: [
			"ZCHF is designed to track 1 CHF, but it is not a bank deposit and not a hard guarantee.",
			"It is created by smart contracts when users lock collateral.",
		],
		caution: "Soft peg, not bank guarantee.",
	},
	{
		id: "collateral",
		step: 3,
		start: 0.24,
		end: 0.36,
		eyebrow: "Step 3",
		headline: "How ZCHF is born",
		body: [
			"A user locks collateral and mints ZCHF. \"Mint\" describes what the contract does.",
			"\"Borrow\" reminds the user that the position must be repaid or renewed to get collateral back.",
		],
		exampleCard: [
			{ label: "Total position size", value: "3,000 ZCHF" },
			{ label: "Reserve retained", value: "300 ZCHF" },
			{ label: "Upfront interest", value: "60 ZCHF" },
			{ label: "Sent to wallet", value: "2,640 ZCHF" },
		],
	},
	{
		id: "oracleFree",
		step: 4,
		start: 0.36,
		end: 0.48,
		eyebrow: "Step 4",
		headline: "No central price oracle",
		body: [
			"Many DeFi systems ask an oracle for prices.",
			"Frankencoin instead uses market challenges to test whether positions are still safely backed.",
		],
		caution: "Oracle-free does not mean risk-free. It changes the type of risk.",
	},
	{
		id: "challenge",
		step: 5,
		start: 0.48,
		end: 0.6,
		eyebrow: "Step 5",
		headline: "A challenge is a market test",
		body: [
			"If someone believes a position is not safe enough at its challenge price, they can challenge it.",
			"The market then tests whether the collateral can cover the position.",
		],
		caution: "A challenge is not an FPS vote. It is the market testing the collateral.",
	},
	{
		id: "earn",
		step: 6,
		start: 0.6,
		end: 0.72,
		eyebrow: "Step 6",
		headline: "Where savings yield comes from",
		body: [
			"Saved ZCHF is not secretly lent out.",
			"The protocol credits savings interest from the equity pool according to the current savings rate. The rate can change.",
		],
		caution: "Interest starts after the protocol delay. Future rates are not guaranteed.",
	},
	{
		id: "fps",
		step: 7,
		start: 0.72,
		end: 0.86,
		eyebrow: "Step 7",
		headline: "FPS is the equity and risk layer",
		body: [
			"FPS holders can benefit when the protocol earns fees or liquidation profits.",
			"They can lose value when the system absorbs losses. They also help protect Frankencoin by vetoing bad new proposals.",
		],
		caution: "FPS is not just a governance token.",
	},
	{
		id: "responsibility",
		step: 8,
		start: 0.86,
		end: 1.0,
		eyebrow: "Step 8",
		headline: "Your role depends on how you use ZCHF",
		body: [
			"Holders watch peg and bridge risk. Savers watch rates and withdrawal choices.",
			"Borrowers watch challenge price and maturity. FPS holders watch equity health and veto windows.",
		],
	},
];

export const cameraKeyframes: CameraKeyframe[] = [
	{ id: "thesis", position: [0, 1.2, 8], target: [0, 0.6, 0] },
	{ id: "zchf", position: [2.8, 1.4, 6], target: [0.5, 0.4, 0] },
	{ id: "collateral", position: [-3, 1.8, 5], target: [-1, 0.5, 0] },
	{ id: "oracleFree", position: [0, 3.2, 6], target: [0, 0, 0] },
	{ id: "challenge", position: [3.6, 1.2, 4.8], target: [1, 0.2, 0] },
	{ id: "earn", position: [-2.8, 1.5, 4.5], target: [-0.5, 0.4, 0] },
	{ id: "fps", position: [2.2, 2.0, 5], target: [0.4, 0.4, 0] },
	{ id: "responsibility", position: [0, 1.4, 7], target: [0, 0.5, 0] },
];

export function getActiveStation(progress: number): JourneyStation {
	const station = journeyStations.find((s) => progress >= s.start && progress < s.end);
	return station ?? journeyStations[journeyStations.length - 1];
}

export function getStationOpacity(progress: number, station: JourneyStation): number {
	const range = station.end - station.start;
	const center = (station.start + station.end) / 2;
	const halfRange = range / 2;
	const distance = Math.abs(progress - center);
	const fade = 1 - distance / halfRange;
	return Math.max(0, Math.min(1, fade));
}
