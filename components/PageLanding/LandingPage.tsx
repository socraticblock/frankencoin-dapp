import Head from "next/head";
import LandingActionGrid from "./LandingActionGrid";
import LandingFinalCta from "./LandingFinalCta";
import LandingHero from "./LandingHero";
import LandingValueProps from "./LandingValueProps";

export default function LandingPage() {
	return (
		<>
			<Head>
				<title>Frankencoin Desk</title>
				<meta name="description" content="A simpler way to use the Frankencoin Protocol." />
			</Head>
			<div className="space-y-8 px-4 py-8 md:px-8">
				<LandingHero />
				<LandingActionGrid />
				<LandingValueProps />
				<LandingFinalCta />
			</div>
		</>
	);
}
