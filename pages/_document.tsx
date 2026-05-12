import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
	const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
	const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
	const hasUmamiConfig = Boolean(umamiUrl && umamiUrl !== "..." && umamiWebsiteId && umamiWebsiteId !== "...");
	const umamiScriptUrl = hasUmamiConfig ? `${umamiUrl?.replace(/\/$/, "")}/script.js` : undefined;

	return (
		<Html lang="en">
			<Head>
				{umamiScriptUrl ? (
					<Script defer src={umamiScriptUrl} data-website-id={umamiWebsiteId} strategy="afterInteractive" />
				) : null}
			</Head>
			<body className="font-default container-xl mx-auto bg-layout-primary text-text-primary font-medium">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
