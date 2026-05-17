export default function ChainChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			disabled={active}
			onClick={onClick}
			className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition ${
				active ? "border-[#c4a75f] bg-button-default text-white dark:bg-card-content-primary dark:text-text-primary" : "border-[#e0d4bd] bg-card-content-secondary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
			}`}
		>
			{label}
		</button>
	);
}

