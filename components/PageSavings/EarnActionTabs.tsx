type EarnMode = "deposit" | "withdraw" | "interest";

interface Props {
	mode: EarnMode;
	onChange: (mode: EarnMode) => void;
}

export default function EarnActionTabs({ mode, onChange }: Props) {
	const tabs: { id: EarnMode; label: string }[] = [
		{ id: "deposit", label: "Deposit ZCHF" },
		{ id: "withdraw", label: "Withdraw ZCHF" },
		{ id: "interest", label: "Collect Interest" },
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => onChange(tab.id)}
					className={`rounded-xl border px-3 py-2 text-sm font-medium ${
						mode === tab.id ? "bg-menu-active border-menu-separator text-text-active" : "bg-card-body-primary border-menu-separator text-text-secondary"
					}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
