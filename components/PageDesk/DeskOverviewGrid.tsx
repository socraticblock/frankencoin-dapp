import type { CockpitCardProps } from "./deskTypes";
import DeskCockpitCard from "./DeskCockpitCard";

export default function DeskOverviewGrid({ cards }: { cards: CockpitCardProps[] }) {
	return (
		<div>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<h2 className="text-xl font-semibold text-text-primary">Desk Overview</h2>
				<p className="text-sm text-text-secondary">A clean summary of your loaded wallet and protocol activity.</p>
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				{cards.map((card) => (
					<DeskCockpitCard key={card.title} {...card} />
				))}
			</div>
			<p className="mt-3 text-xs text-text-secondary">Overview totals are combined across supported chains. Active Allocations shows the chain details.</p>
		</div>
	);
}

