type AppNoticeVariant = "info" | "success" | "warning" | "danger" | "neutral";

interface Props {
	title?: string;
	message: string;
	variant?: AppNoticeVariant;
	children?: React.ReactNode;
}

const VARIANT_CLASS: Record<AppNoticeVariant, string> = {
	info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900",
	success: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900",
	warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900",
	danger: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900",
	neutral: "bg-card-content-primary text-text-primary border-menu-separator",
};

export default function AppNotice({ title, message, variant = "neutral", children }: Props) {
	return (
		<div className={`rounded-xl border px-4 py-3 ${VARIANT_CLASS[variant]}`}>
			{title ? <p className="font-semibold">{title}</p> : null}
			<p className="text-sm">{message}</p>
			{children}
		</div>
	);
}
