interface AppPageHeaderProps {
	title: string;
	eyebrow?: string;
	description?: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
}

export default function AppPageHeader({ title, eyebrow, description, children, action }: AppPageHeaderProps) {
	return (
		<header className="pt-6 space-y-3">
			{eyebrow ? <p className="text-xs uppercase tracking-wider text-text-secondary">{eyebrow}</p> : null}
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<h1 className="text-3xl md:text-4xl font-semibold text-text-primary">{title}</h1>
					{description ? <p className="text-text-secondary max-w-3xl">{description}</p> : null}
				</div>
				{action ? <div>{action}</div> : null}
			</div>
			{children}
		</header>
	);
}
