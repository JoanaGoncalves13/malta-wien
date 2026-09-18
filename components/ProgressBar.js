export default function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
    >
      <span className={pct > 100 ? "over" : ""} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}
