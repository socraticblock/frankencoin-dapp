export type MtPelerinTab = "buy" | "sell" | "swap";

export type MtPelerinNetwork =
	| "base_mainnet"
	| "mainnet"
	| "xdai_mainnet";

export const MTP_DEV_ACTIVATION_KEY = "bec6626e-8913-497d-9835-6e6ae9edb144";

export const MTP_NETWORKS: { value: MtPelerinNetwork; label: string }[] = [
	{ value: "base_mainnet", label: "Base" },
	{ value: "mainnet", label: "Ethereum" },
	{ value: "xdai_mainnet", label: "Gnosis" },
];

const MTP_WIDGET_BASE_URL = "https://widget.mtpelerin.com/";

export function getMtPelerinActivationKey() {
	const configuredKey = process.env.NEXT_PUBLIC_MTP_ACTIVATION_KEY?.trim();
	if (configuredKey) return { key: configuredKey, usingDevFallback: false };
	if (process.env.NODE_ENV !== "production") return { key: MTP_DEV_ACTIVATION_KEY, usingDevFallback: true };
	return { key: null, usingDevFallback: false };
}

export function buildMtPelerinWidgetUrl(tab: MtPelerinTab, network: MtPelerinNetwork) {
	const activation = getMtPelerinActivationKey();
	if (!activation.key) return null;

	const params = new URLSearchParams({
		_ctkn: activation.key,
		type: "web",
		lang: "en",
		tabs: "buy,sell,swap",
		crys: "ZCHF",
		curs: "CHF,EUR,USD",
		nets: MTP_NETWORKS.map((item) => item.value).join(","),
		net: network,
		tab,
	});

	if (tab === "buy") {
		params.set("bdc", "ZCHF");
		params.set("bsc", "CHF");
		params.set("dnet", network);
	}

	if (tab === "sell") {
		params.set("ssc", "ZCHF");
		params.set("sdc", "CHF");
		params.set("snet", network);
	}

	if (tab === "swap") {
		params.set("wdc", "ZCHF");
		params.set("dnet", network);
	}

	// TODO V2: generate a random 4-digit code, request a wallet signature for
	// `MtPelerin-${code}`, base64 encode the signature, then pass addr, code,
	// hash, and chain once address validation is intentionally automated.
	return `${MTP_WIDGET_BASE_URL}?${params.toString()}`;
}
