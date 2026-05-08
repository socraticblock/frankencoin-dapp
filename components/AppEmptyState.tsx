interface AppEmptyStateProps {
	title: string;
	description: string;
	actionLabel?: string;
	actionHref?: string;
	icon?: React.ReactNode;
}

export default function AppEmptyState({ title, description, actionLabel, actionHref, icon }: AppEmptyStateProps) {
	return (
		<div className="rounded-2xl border border-menu-separator bg-card-body-primary p-6 text-center space-y-2">
			{icon ? <div className="mx-auto w-fit">{icon}</div> : null}
			<h3 className="text-lg font-semibold text-text-primary">{title}</h3>
			<p className="text-text-secondary">{description}</p>
			{actionLabel && actionHref ? (
				<a href={actionHref} className="inline-flex mt-2 text-sm underline text-text-primary">
					{actionLabel}
				</a>
			) : null}
		</div>
	);
}
