export interface ResultItem {
  label: string;
  value?: string;
  link?: boolean;
}

export function ResultGrid({
  items,
  className = "",
}: {
  items: ResultItem[];
  className?: string;
}) {
  return (
    <div className={("result-grid " + className).trim()}>
      {items.map((item) => (
        <ResultValue key={item.label} {...item} />
      ))}
    </div>
  );
}

export function ResultValue({
  label,
  value,
  link = false,
}: ResultItem) {
  const isUsableLink = link && value && /^https?:\/\//i.test(value);
  return (
    <div className={value ? "has-value" : ""}>
      <span>{label}</span>
      {isUsableLink ? (
        <a href={value} target="_blank" rel="noreferrer">
          Open payment link ↗
        </a>
      ) : (
        <strong>{value || "—"}</strong>
      )}
    </div>
  );
}
