import { useEffect, useState } from "react";

export function useDelayedTrue(delayMs: number) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const timeout = setTimeout(() => setReady(true), delayMs);
		return () => clearTimeout(timeout);
	}, [delayMs]);

	return ready;
}

