import LandingActionGrid from "./LandingActionGrid";
import LandingFinalCta from "./LandingFinalCta";
import LandingHero from "./LandingHero";
import LandingValueProps from "./LandingValueProps";

export default function LandingPage() {
	return (
		<div className="space-y-8">
			<LandingHero />
			<LandingActionGrid />
			<LandingValueProps />
			<LandingFinalCta />
		</div>
	);
}
