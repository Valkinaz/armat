import { useAppState } from '../app/AppState.tsx';
import { MaterialView } from '../app/MaterialView.tsx';
import { useStartPractice } from '../app/useStartPractice.ts';
import { vocabularySets } from '../data/vocabulary.ts';
import type { VocabularyDirection } from '../data/types.ts';
import { TeacherAcknowledgment } from '../shared/TeacherAcknowledgment.tsx';
import {
  selectedVocabularyEntries,
  vocabularyDirectionLabels,
  vocabularyQuestionCount,
  vocabularyQuestions,
} from './model.ts';
import { VocabularyList } from './VocabularyList.tsx';

export function VocabularyPage() {
  const { vocabularySettings: settings, setVocabularySettings: setSettings } = useAppState();
  const startPractice = useStartPractice();
  const allSelected = settings.setIds.length === vocabularySets.length;
  const count = vocabularyQuestionCount(settings);
  return (
    <MaterialView title="Слова и выражения">
      <section>
        <h1 tabIndex={-1} data-material-heading>
          Выбери наборы<br />для тренировки
        </h1>
        <p className="intro">
          Повтори одну тему или смешай несколько. Раскрой набор, чтобы посмотреть слова перед тренировкой.
        </p>
        <div className="selection-bar">
          <h2>Тематические наборы</h2>
          <div className="selection-actions">
            <span className="counter">Выбрано наборов: {settings.setIds.length}</span>
            <button
              className="secondary"
              aria-pressed={allSelected}
              onClick={() => setSettings((current) => ({
                ...current,
                setIds: allSelected ? [] : vocabularySets.map((set) => set.id),
              }))}
            >
              {allSelected ? 'Снять выбор' : 'Выбрать все'}
            </button>
          </div>
        </div>
        <div className="vocabulary-sets" role="group" aria-label="Выбор наборов">
          {vocabularySets.map((set) => {
            const selected = settings.setIds.includes(set.id);
            const entries = selectedVocabularyEntries([set.id]);
            return (
              <section
                key={set.id}
                className={'vocabulary-set' + (selected ? ' selected' : '')}
                aria-label={set.title}
              >
                <button
                  className="vocabulary-select"
                  aria-pressed={selected}
                  aria-label={set.title}
                  onClick={() => setSettings((current) => ({
                    ...current,
                    setIds: current.setIds.includes(set.id)
                      ? current.setIds.filter((id) => id !== set.id)
                      : [...current.setIds, set.id],
                  }))}
                >
                  <span className="vocabulary-set-title">{set.title}</span>
                  <span className="vocabulary-set-count">Слов и выражений: {entries.length}</span>
                  <span className="vocabulary-check" aria-hidden="true">{selected ? '✓' : '+'}</span>
                </button>
                <details>
                  <summary>Посмотреть слова</summary>
                  <VocabularyList entries={entries} />
                </details>
              </section>
            );
          })}
        </div>
        <div className="vocabulary-settings">
          <fieldset>
            <legend>Направление перевода</legend>
            <div className="vocabulary-switch">
              {(['hy-ru', 'ru-hy'] as VocabularyDirection[]).map((direction) => (
                <label key={direction}>
                  <input
                    type="radio"
                    name="direction"
                    value={direction}
                    checked={settings.direction === direction}
                    onChange={() => setSettings((current) => ({ ...current, direction }))}
                  />
                  <span>{vocabularyDirectionLabels[direction]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Длина тренировки</legend>
            <div className="vocabulary-switch">
              {([20, 'all'] as const).map((size) => (
                <label key={size}>
                  <input
                    type="radio"
                    name="size"
                    value={size}
                    checked={settings.size === size}
                    onChange={() => setSettings((current) => ({ ...current, size }))}
                  />
                  <span>{size === 'all' ? 'Все' : '20 вопросов'}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="vocabulary-hint">
          В одном направлении тренируем армянские слова, в другом — их значения.
          Поэтому число вопросов может отличаться.
        </p>
        <div className="start-row">
          <button
            className="primary"
            disabled={!count}
            onClick={() => startPractice('vocabulary', vocabularyQuestions(settings), '', settings)}
          >
            {count ? `Начать тренировку · ${count}` : 'Начать тренировку'}
          </button>
        </div>
      </section>
      <TeacherAcknowledgment />
    </MaterialView>
  );
}
