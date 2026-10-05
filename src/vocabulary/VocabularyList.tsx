import type { VocabularyEntry } from '../data/types.ts';

export function VocabularyList({ entries }: { entries: readonly VocabularyEntry[] }) {
  return (
    <ul className="vocabulary-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="armenian" lang="hy">{entry.hy}</span>
          <span>
            {entry.meanings.join('; ')}
            {entry.colloquial && <span className="vocabulary-colloquial"> (разг.)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
