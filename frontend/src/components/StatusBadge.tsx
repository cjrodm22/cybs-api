import type { StepStatus } from "../features/payer-auth/types";

export function StatusBadge({ status }: { status: StepStatus }) {
  return (
    <span className="status-pill">
      <i />
      {status}
    </span>
  );
}
