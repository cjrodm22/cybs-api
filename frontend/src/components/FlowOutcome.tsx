import type { StepStatus } from "../features/payer-auth/types";
import { StatusBadge } from "./StatusBadge";

export function FlowOutcome({
  eyebrow,
  title,
  status,
  message,
}: {
  eyebrow: string;
  title: string;
  status: StepStatus;
  message: string;
}) {
  return (
    <div className={"flow-outcome status-" + status.toLowerCase()}>
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <StatusBadge status={status} />
      <p>{message}</p>
    </div>
  );
}
