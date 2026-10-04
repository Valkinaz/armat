export function Colloquial({ sentence }: { sentence?: string }) {
  if (!sentence) return null;
  return (
    <p className="colloquial">
      <span>Разговорный вариант</span>
      <span className="armenian" lang="hy">
        {sentence}
      </span>
    </p>
  );
}
