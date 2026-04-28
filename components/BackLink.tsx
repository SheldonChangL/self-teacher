import Link from "next/link";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-2xl bg-white/80 px-4 py-2 text-base font-bold text-amber-700 shadow-sm ring-1 ring-amber-200 transition hover:bg-white active:scale-95"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
