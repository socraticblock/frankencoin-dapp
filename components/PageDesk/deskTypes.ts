import type { ChainAction } from "@components/PageHome/DetectedAcrossChainsPanel";

export type CockpitCardTone = "brass" | "blue" | "violet" | "slate" | "green";

export type CockpitCardProps = {
	title: string;
	copy: string;
	amount?: string;
	secondaryCopy?: string;
	help?: string;
	iconLabel: string;
	action?: ChainAction;
	secondaryActions?: { label: string; note: string; action?: ChainAction }[];
	tone: CockpitCardTone;
	onAction: (action: ChainAction) => void;
};

export type DeskSuggestionModel = {
	message: string;
	action?: ChainAction;
};

