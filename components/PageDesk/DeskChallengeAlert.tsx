import AppButton from "@components/AppButton";

export default function DeskChallengeAlert() {
	return (
		<section className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-lg font-semibold">Position needs attention</h2>
					<p className="mt-1 text-sm leading-6">One or more borrowing positions are currently challenged. Review the position before the challenge period ends.</p>
				</div>
				<AppButton to="/mypositions" width="w-auto" className="min-h-[42px] px-4">
					Open Portfolio
				</AppButton>
			</div>
		</section>
	);
}

