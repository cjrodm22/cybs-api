import type {
  StepDefinition,
  StepState,
} from "../features/payer-auth/types";
import { JsonPanel } from "./JsonPanel";
import { StatusBadge } from "./StatusBadge";

interface StepCardProps {
  definition: StepDefinition;
  state: StepState;
  active: boolean;
  disabled: boolean;
  onRun: () => void;
}

export function StepCard({
  definition,
  state,
  active,
  disabled,
  onRun,
}: StepCardProps) {
  return (
    <article
      className={
        "step-card status-" +
        state.status.toLowerCase() +
        (active ? " active" : "")
      }
    >
      <div className="step-index">{definition.number}</div>
      <div className="step-content">
        <span className="step-eyebrow">{definition.eyebrow}</span>
        <h3>{definition.title}</h3>
        <p>{state.message}</p>
        <JsonPanel title="JSON response" value={state.response} />
      </div>
      <div className="step-actions">
        <StatusBadge status={state.status} />
        <button
          onClick={onRun}
          disabled={disabled}
          aria-label={"Run " + definition.title}
        >
          RUN
        </button>
        {state.completedAt && <small>{state.completedAt}</small>}
      </div>
    </article>
  );
}
