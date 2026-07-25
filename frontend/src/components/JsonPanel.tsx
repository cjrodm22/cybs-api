import { sanitizeForDisplay } from "../utils/sensitive-data";

export function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  if (value === undefined) return null;
  return (
    <details>
      <summary>
        {title} <span>+</span>
      </summary>
      <pre>{JSON.stringify(sanitizeForDisplay(value), null, 2)}</pre>
    </details>
  );
}
