export type MtPelerinTab = "buy" | "sell" | "swap";

export const MTP_NETWORKS = [
	{ value: "base_mainnet", label: "Base" },
	{ value: "mainnet", label: "Ethereum" },
	{ value: "xdai_mainnet", label: "Gnosis" },
] as const;

export type MtPelerinNetwork = (typeof MTP_NETWORKS)[number]["value"];

const MTP_WIDGET_BASE_URL = "https://widget.mtpelerin.com/";
const MTP_ALLOWED_NETWORKS = MTP_NETWORKS.map((item) => item.value).join(",");

const MTP_FLOW_DEFAULTS: Record<MtPelerinTab, (network: MtPelerinNetwork) => Record<string, string>> = {
	buy: (network) => ({
		crys: "ZCHF",
		bsc: "CHF",
		bdc: "ZCHF",
		bsa: "100",
		dnet: network,
	}),
	sell: (network) => ({
		crys: "ZCHF",
		ssc: "ZCHF",
		sdc: "CHF",
		ssa: "100",
		snet: network,
	}),
	swap: (network) => ({
		crys: "USDC,ZCHF",
		wsc: "USDC",
		wdc: "ZCHF",
		wsa: "100",
		snet: network,
		dnet: network,
	}),
};

export function getMtPelerinActivationKey() {
	const key = process.env.NEXT_PUBLIC_MTP_ACTIVATION_KEY?.trim() || null;
	return { key };
}

export function buildMtPelerinWidgetUrl(tab: MtPelerinTab, network: MtPelerinNetwork) {
	const activation = getMtPelerinActivationKey();
	if (!activation.key) return null;

	const params = new URLSearchParams({
		_ctkn: activation.key,
		type: "web",
		lang: "en",
		tabs: tab,
		tab,
		net: network,
		nets: MTP_ALLOWED_NETWORKS,
		curs: "CHF,EUR,USD",
	});

	for (const [key, value] of Object.entries(MTP_FLOW_DEFAULTS[tab](network))) {
		params.set(key, value);
	}

	// TODO V2: generate a random 4-digit code, request a wallet signature for
	// `MtPelerin-${code}`, base64 encode the signature, then pass addr, code,
	// hash, and chain once address validation is intentionally automated.
	return `${MTP_WIDGET_BASE_URL}?${params.toString()}`;
}
