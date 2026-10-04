import { Link } from 'react-router';
import type { Ref } from 'react';

export function Result({
  alphabet,
  correct,
  total,
  originPath,
  onRetry,
  headingRef,
}: {
  alphabet: boolean;
  correct: number;
  total: number;
  originPath: string;
  onRetry?: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <section className="completion active">
      <div className="medal">✦</div>
      <h2 ref={headingRef} tabIndex={-1}>
        {alphabet ? 'Тренировка завершена' : 'Практика завершена'}
      </h2>
      <p>
        Правильных ответов: {correct} из {total}.
      </p>
      <div className="result-actions">
        {onRetry && (
          <button className="secondary" onClick={onRetry}>
            Повторить ошибки
          </button>
        )}
        <Link className="primary" to={originPath} state={null}>
          {alphabet ? 'Выбрать буквы снова' : 'К уроку'}
        </Link>
      </div>
    </section>
  );
}
