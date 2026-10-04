export function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="progress">
      <span>{label}</span>
      <div
        className="track"
        role="progressbar"
        aria-label="Прогресс тренировки"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="fill" style={{ width: (value / total) * 100 + '%' }} />
      </div>
    </div>
  );
}
