import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Address, isAddress } from "viem";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0];
	return value;
}

function getSearchParamFromAsPath(asPath: string, key: string): string | undefined {
	const queryString = asPath.split("?")[1]?.split("#")[0];
	if (!queryString) return undefined;

	try {
		return new URLSearchParams(queryString).get(key) ?? undefined;
	} catch {
		return undefined;
	}
}

export function useAddressQueryParam(key = "address") {
	const router = useRouter();
	const [fromLocation, setFromLocation] = useState<string | undefined>();
	const queryValue = firstQueryValue(router.query[key] as string | string[] | undefined);

	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const nextValue = new URLSearchParams(window.location.search).get(key) ?? undefined;
			setFromLocation((currentValue) => (currentValue === nextValue ? currentValue : nextValue));
		} catch {
			setFromLocation(undefined);
		}
	}, [key, router.asPath]);

	return useMemo(() => {
		const fromAsPath = router.isReady ? getSearchParamFromAsPath(router.asPath, key) : undefined;
		const raw = queryValue ?? fromAsPath ?? fromLocation;
		const address = raw && isAddress(raw) ? (raw as Address) : undefined;

		return {
			address,
			raw,
			hasAddressParam: typeof raw === "string" && raw.length > 0,
			invalidAddressParam: typeof raw === "string" && raw.length > 0 && !address,
			routerReady: router.isReady,
		};
	}, [fromLocation, key, queryValue, router.asPath, router.isReady]);
}
