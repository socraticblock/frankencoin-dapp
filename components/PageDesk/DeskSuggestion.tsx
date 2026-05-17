import AppButton from "@components/AppButton";
import type { ChainAction } from "@components/PageHome/DetectedAcrossChainsPanel";
import type { DeskSuggestionModel } from "./deskTypes";

type Props = {
	suggestion?: DeskSuggestionModel;
	onAction: (action: ChainAction) => void;
};

export default function DeskSuggestion({ suggestion, onAction }: Props) {
	if (!suggestion) return null;
	return (
		<section className="relative overflow-hidden rounded-xl border border-[#d7c28a]/70 bg-[#fff8ea] px-4 py-3 shadow-sm dark:border-[#8a7448]/60 dark:bg-[#1b2230]">
			<div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b7625] dark:text-[#e5c978]">Suggested next action</div>
					<p className="mt-1 text-base font-medium text-text-primary">{suggestion.message}</p>
				</div>
				{suggestion.action ? (
					<AppButton size="small" width="w-auto" className="h-10 px-4 text-sm" onClick={() => onAction(suggestion.action!)}>
						{suggestion.action.label}
					</AppButton>
				) : null}
			</div>
		</section>
	);
}

