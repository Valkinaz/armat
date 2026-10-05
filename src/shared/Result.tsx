import { Link } from 'react-router';
import type { Ref } from 'react';
import type { Session } from '../training/model.ts';

export function Result({
  kind,
  correct,
  total,
  originPath,
  onRetry,
  onRestart,
  headingRef,
}: {
  kind: Session['kind'];
  correct: number;
  total: number;
  originPath: string;
  onRetry?: () => void;
  onRestart?: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <section className="completion active">
      <div className="medal">✦</div>
      <h2 ref={headingRef} tabIndex={-1}>
        {kind === 'grammar' ? 'Практика завершена' : 'Тренировка завершена'}
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
        {onRestart && (
          <button className="secondary" onClick={onRestart}>Пройти ещё раз</button>
        )}
        <Link className="primary" to={originPath} state={null}>
          {kind === 'alphabet' ? 'Выбрать буквы снова' : kind === 'vocabulary' ? 'К выбору наборов' : 'К уроку'}
        </Link>
      </div>
    </section>
  );
}
