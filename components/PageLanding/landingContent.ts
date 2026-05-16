export type LandingVisualKey = "desk" | "zchf" | "earn" | "move" | "borrow" | "fps";

export type LandingAction = {
	title: string;
	copy: string;
	href: string;
	label: string;
	visual: LandingVisualKey;
	tone: "blue" | "green" | "violet" | "brass";
};

export type LandingPreviewCard = {
	title: string;
	amount: string;
	copy: string;
	action: string;
	visual: LandingVisualKey;
	accent?: string;
};

export const previewCards: LandingPreviewCard[] = [
	{
		title: "Wallet ZCHF",
		amount: "3.60 ZCHF",
		copy: "Balance in your wallet",
		action: "Open wallet",
		visual: "zchf",
	},
	{
		title: "Earning",
		amount: "2,168 ZCHF",
		copy: "17.90 ZCHF interest available",
		action: "Go to Earn",
		visual: "earn",
		accent: "text-[#18b981] dark:text-[#4df0ae]",
	},
	{
		title: "Protocol Investment",
		amount: "0.00 FPS",
		copy: "No FPS invested",
		action: "Open Invest",
		visual: "fps",
	},
	{
		title: "Borrowing",
		amount: "0.00 ZCHF",
		copy: "No active borrowing",
		action: "Explore Borrowing",
		visual: "borrow",
	},
];

export const landingActions: LandingAction[] = [
	{
		title: "Buy or Sell ZCHF",
		copy: "Exchange instantly with clear route context and wallet-ready outcomes.",
		href: "/exchange",
		label: "Open exchange",
		visual: "zchf",
		tone: "blue",
	},
	{
		title: "Earn with ZCHF",
		copy: "Place ZCHF in earning and see ready interest without hunting across pages.",
		href: "/savings",
		label: "Open Earn",
		visual: "earn",
		tone: "green",
	},
	{
		title: "Move ZCHF",
		copy: "Bridge, transfer, or swap with network detail kept close to the action.",
		href: "/bridge",
		label: "Open Bridge",
		visual: "move",
		tone: "violet",
	},
	{
		title: "Borrow",
		copy: "Review collateral-backed minting with conservative language and exact position context.",
		href: "/mint",
		label: "Open Borrow",
		visual: "borrow",
		tone: "brass",
	},
	{
		title: "Invest",
		copy: "Manage FPS exposure from the same command center as ZCHF activity.",
		href: "/equity",
		label: "Open Invest",
		visual: "fps",
		tone: "brass",
	},
];

export const valueProps = [
	{
		title: "Wallet first",
		copy: "The Desk starts with connected-wallet activity and only expands into protocol-wide context when it helps you decide.",
	},
	{
		title: "Exact numbers",
		copy: "Balances, ready interest, borrowing, routes, and positions are stated plainly before wallet actions.",
	},
	{
		title: "Auditable detail",
		copy: "Simple summaries lead to chain-level allocations, transaction context, and protocol documentation.",
	},
];
