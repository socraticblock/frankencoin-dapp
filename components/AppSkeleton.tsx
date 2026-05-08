interface Props {
	type?: "card" | "table" | "metric" | "page" | "input";
	rows?: number;
}

export default function AppSkeleton({ type = "card", rows = 3 }: Props) {
	if (type === "input") return <div className="h-12 w-full rounded-xl bg-card-content-primary animate-pulse" />;
	if (type === "metric") return <div className="h-20 w-full rounded-2xl bg-card-content-primary animate-pulse" />;
	if (type === "page") return <div className="h-64 w-full rounded-2xl bg-card-content-primary animate-pulse" />;
	if (type === "table")
		return (
			<div className="space-y-2">
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className="h-10 w-full rounded-lg bg-card-content-primary animate-pulse" />
				))}
			</div>
		);
	return <div className="h-40 w-full rounded-2xl bg-card-content-primary animate-pulse" />;
}
