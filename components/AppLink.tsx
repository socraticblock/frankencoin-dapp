import { faArrowUpRightFromSquare, faCircleArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

interface Props {
	label: string;
	href?: string;
	external?: boolean;
	icon?: boolean;
	className?: string;
}

export default function AppLink({ label, href = "/", external = false, icon = false, className }: Props) {
	const umamiEvent = (external ? "external_link_" : "link_") + label.toLowerCase().replace(/\s+/g, "_");
	const rawHref = typeof href === "string" ? href.trim() : "";
	const isAbsolute = /^https?:\/\//i.test(rawHref);
	const safeHref = external ? (isAbsolute ? rawHref : "https://frankencoin.com") : rawHref.startsWith("/") ? rawHref : "/";

	if (!safeHref) {
		return <span className={className}>{label}</span>;
	}

	return (
		<Link
			className={`${
				className ?? "flex items-center justify-end pt-2"
			} text-card-input-max hover:text-card-input-hover cursor-pointer`}
			href={safeHref}
			target={external ? "_blank" : undefined}
			rel={external ? "noreferrer" : undefined}
			data-umami-event={umamiEvent}
		>
			<span className="">
				{label}
				{!icon && !external ? null : external ? (
					<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 ml-2" />
				) : (
					<FontAwesomeIcon icon={faCircleArrowRight} className="w-3 ml-2" />
				)}
			</span>
		</Link>
	);
}
