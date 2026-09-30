import { consoleButtonClass } from "@/src/components/console/console-button";

type Option = { key: string; name: string; href: string };

/** Each clinic is its own host, so switching is a plain link, not client state. */
export function ClinicSwitcher({ current, options }: { current: string; options: Option[] }) {
  return (
    <details className="group mb-1.5">
      <summary className={consoleButtonClass("secondary", "md", "w-full list-none justify-between bg-console-canvas [&::-webkit-details-marker]:hidden")}>
        <span className="min-w-0 truncate">{options.find((option) => option.key === current)?.name}</span>
        <span aria-hidden="true" className="text-console-subtle transition-transform duration-150 group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-1 rounded-xl border border-console-line bg-console-canvas p-1">
        {options.map((option) => (
          <li key={option.key}>
            <a
              href={option.href}
              aria-current={option.key === current ? "true" : undefined}
              className={`flex min-h-9 items-center rounded-lg px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-console-accent ${
                option.key === current ? "bg-console-accent/12 text-console-ink" : "text-console-muted hover:bg-console-ink/6 hover:text-console-ink"
              }`}
            >
              <span className="truncate">{option.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
