import { useLayoutEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Question, SessionAction } from './model.ts';

export function BuildAnswer({
  question,
  selectedWords,
  answered,
  dispatch,
}: {
  question: Extract<Question, { kind: 'build' }>;
  selectedWords: number[];
  answered: boolean;
  dispatch: Dispatch<SessionAction>;
}) {
  const bank = useRef<HTMLDivElement>(null);
  const check = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<number | 'first' | null>(null);
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const target =
      typeof pendingFocus.current === 'number'
        ? bank.current?.querySelector<HTMLButtonElement>(
            '[data-word-index="' + pendingFocus.current + '"]',
          )
        : bank.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    (target || check.current)?.focus();
    pendingFocus.current = null;
  }, [selectedWords]);
  return (
    <div className="grammar-build">
      <div className="sentence-answer" role="group" aria-label="Собранное предложение">
        {!selectedWords.length && (
          <span className="sentence-placeholder">Нажимай на слова ниже</span>
        )}
        {selectedWords.map((index) => (
          <button
            key={index}
            className="word"
            lang="hy"
            disabled={answered}
            aria-label={'Вернуть слово ' + question.exercise.words[index]}
            onClick={() => {
              pendingFocus.current = index;
              dispatch({ type: 'remove-word', index });
            }}
          >
            {question.exercise.words[index]}
          </button>
        ))}
      </div>
      <div ref={bank} className="word-bank" role="group" aria-label="Слова для сборки">
        {question.wordOrder.map((index) => (
          <button
            key={index}
            className="word"
            lang="hy"
            data-word-index={index}
            aria-label={'Добавить слово ' + question.exercise.words[index]}
            disabled={answered || selectedWords.includes(index)}
            onClick={() => {
              pendingFocus.current = 'first';
              dispatch({ type: 'add-word', index });
            }}
          >
            {question.exercise.words[index]}
          </button>
        ))}
      </div>
      <div className="build-actions">
        <button
          className="secondary"
          disabled={answered || !selectedWords.length}
          onClick={() => {
            pendingFocus.current = 'first';
            dispatch({ type: 'reset-words' });
          }}
        >
          Сбросить
        </button>
        <button
          ref={check}
          className="primary"
          disabled={answered || selectedWords.length !== question.exercise.words.length}
          onClick={() => dispatch({ type: 'check-build' })}
        >
          Проверить
        </button>
      </div>
    </div>
  );
}
