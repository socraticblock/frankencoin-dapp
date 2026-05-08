interface Props {
	title: string;
	description?: string;
	children?: React.ReactNode;
}

export default function AppActionCard({ title, description, children }: Props) {
	return (
		<section className="rounded-2xl border border-menu-separator bg-card-body-primary p-6 space-y-4">
			<div>
				<h3 className="text-xl font-semibold text-text-primary">{title}</h3>
				{description ? <p className="text-text-secondary mt-1">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}
