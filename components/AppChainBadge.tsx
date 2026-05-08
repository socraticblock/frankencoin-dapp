interface Props {
	label: string;
}

export default function AppChainBadge({ label }: Props) {
	return <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-card-content-primary text-text-primary">{label}</span>;
}
