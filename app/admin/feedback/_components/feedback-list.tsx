import { Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { FEEDBACK_STATUS_TONE, TENANT_FEEDBACK } from "@/src/lib/mock-data/company-admin";

export function FeedbackList() {
  return (
    <Panel>
      <ul>
        {TENANT_FEEDBACK.map((item) => (
          <li key={item.message} className="flex items-start gap-3 border-b border-console-line px-3.5 py-3.5 last:border-b-0">
            <Pill tone={item.categoryTone}>{item.category}</Pill>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-normal">{item.message}</p>
              <p className="mt-1 font-data text-[11px] text-console-subtle">
                {item.tenant} · {item.by} · {item.when}
              </p>
            </div>
            <Pill tone={FEEDBACK_STATUS_TONE[item.status]}>{item.status}</Pill>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
