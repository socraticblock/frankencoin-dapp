import { useEffect, useState } from "react";
import { CONFIG } from "../app.config";
import { Loading } from "../components/LoadingScreen";

export function useServiceStatus(): Loading[] {
	const [apiStatus, setApiStatus] = useState(false);
	const [ponderStatus, setPonderStatus] = useState(false);

	useEffect(() => {
		const fetchPonderStatus = async () => {
			try {
				const response = await fetch(`${CONFIG.ponder}/status`);
				if (response.ok) {
					setPonderStatus(true);
					return;
				}
			} catch {}

			if (CONFIG.canonicalPonder === CONFIG.ponder) {
				setPonderStatus(false);
				return;
			}

			fetch(`${CONFIG.canonicalPonder}/status`)
				.then((res) => setPonderStatus(res.ok))
				.catch(() => setPonderStatus(false));
		};

		fetch(`${CONFIG.api}/ecosystem/coinmarketcap/totalsupply`)
			.then((res) => setApiStatus(res.ok))
			.catch(() => setApiStatus(false));

		fetchPonderStatus();
	}, []);

	return [
		{ id: "ponder", title: "Ponder API", isLoaded: ponderStatus },
		{ id: "api", title: "Api", isLoaded: apiStatus },
	];
}
