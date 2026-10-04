import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useAppState } from '../app/AppState.tsx';
import { Colloquial } from '../shared/Colloquial.tsx';
import { Feedback } from '../shared/Feedback.tsx';
import { Progress } from '../shared/Progress.tsx';
import { Result } from '../shared/Result.tsx';
import { acceptedAnswers, retryQuestions } from './model.ts';
import type { Session } from './model.ts';
import { BuildAnswer } from './BuildAnswer.tsx';

export function Training({ session }: { session: Session }) {
  const { dispatch } = useAppState();
  const location = useLocation();
  const questionRoot = useRef<HTMLElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const alphabet = session.kind === 'alphabet';
  const question = session.questions[session.current];
  const answer = session.answer;
  const answered = Boolean(answer);

  useLayoutEffect(() => {
    document.title =
      (session.completed
        ? alphabet
          ? 'Тренировка завершена'
          : 'Практика завершена'
        : alphabet
          ? 'Тренировка букв'
          : session.mode) + ' — Արմատ';
    if (session.completed) resultHeading.current?.focus();
    else if (answered) nextButton.current?.focus();
    else
      (
        questionRoot.current?.querySelector<HTMLButtonElement>(
          '.option, .word-bank button:not(:disabled), .build-actions .primary:not(:disabled)',
        ) || questionRoot.current
      )?.focus();
  }, [location.key, session.current, session.completed, session.mode, answered, alphabet]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);

  if (session.completed)
    return (
      <Result
        alphabet={alphabet}
        headingRef={resultHeading}
        correct={session.correct}
        total={session.questions.length}
        originPath={session.originPath}
        onRetry={
          !alphabet && session.mistakes.length
            ? () => dispatch({ type: 'retry', questions: retryQuestions(session.mistakes) })
            : undefined
        }
      />
    );

  const building = question.kind === 'build';
  const sentenceQuestion = question.kind === 'choice' || building;
  const item =
    question.kind === 'plural' ? question.example : sentenceQuestion ? question.exercise : null;
  const prompt =
    question.kind === 'plural'
      ? question.example.singular
      : question.kind === 'choice'
        ? question.exercise.prompt
        : '';
  const feedback = !answer
    ? ''
    : answer.good
      ? alphabet
        ? 'Верно! Отлично.'
        : 'Верно!'
      : question.kind === 'letter'
        ? 'Почти — правильный ответ: ' + question.letter.sound
        : question.kind === 'plural'
          ? 'Правильно: ' + question.example.plural
          : building
            ? 'Порядок слов отличается от образца'
            : 'Правильный образец:';
  const progressWord = alphabet ? 'Буква' : sentenceQuestion ? 'Задание' : 'Слово';

  return (
    <section
      ref={questionRoot}
      tabIndex={-1}
      className={alphabet ? 'training active' : 'grammar-training'}
      aria-label={alphabet ? 'Тренировка букв' : 'Практика грамматики'}
    >
      <Link className="back" to={session.originPath} state={null}>
        {alphabet ? '← К выбору букв' : '← К уроку'}
      </Link>
      <Progress
        label={progressWord + ' ' + (session.current + 1) + ' из ' + session.questions.length}
        value={session.current + (!alphabet && answered ? 1 : 0)}
        total={session.questions.length}
      />
      <div className="question-card">
        {!alphabet && <p className="eyebrow">{session.mode}</p>}
        <p className="prompt">
          {alphabet
            ? 'Как произносится эта буква?'
            : building
              ? 'Собери предложение по образцу урока'
              : question.kind === 'choice'
                ? 'Выбери подходящую форму глагола'
                : 'Выбери форму множественного числа'}
        </p>
        {building && question.exercise.variant === 'colloquial' && (
          <p className="colloquial">Разговорный вариант</p>
        )}
        {question.kind === 'letter' ? (
          <div className="training-glyph" lang="hy">
            {question.letter.upper} {question.letter.lower}
          </div>
        ) : (
          !building && (
            <div
              className={
                'grammar-prompt' +
                (sentenceQuestion ? ' sentence' : prompt.length > 6 ? ' long' : '')
              }
              lang="hy"
            >
              {prompt}
            </div>
          )
        )}
        {item && <p className="grammar-translation">{item.ru}</p>}
        {building ? (
          <BuildAnswer
            question={question}
            selectedWords={session.selectedWords}
            answered={answered}
            dispatch={dispatch}
          />
        ) : (
          <div className="options">
            {question.options.map((value) => (
              <button
                key={value}
                lang={alphabet ? 'ru' : 'hy'}
                className={
                  'option' +
                  (answer
                    ? acceptedAnswers(question).includes(value)
                      ? ' correct'
                      : value === answer.value
                        ? ' wrong'
                        : ''
                    : '')
                }
                disabled={answered}
                onClick={() => dispatch({ type: 'choose', value })}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        <Feedback good={answer?.good}>{feedback}</Feedback>
        {answer && item && (
          <>
            {answer.sentence && (
              <p className="grammar-answer" lang="hy">
                {answer.sentence}
              </p>
            )}
            <p className="grammar-explanation">{item.note}</p>
            {'colloquial' in item && <Colloquial sentence={item.colloquial} />}
          </>
        )}
      </div>
      {answered && (
        <div className="next-row">
          <button ref={nextButton} className="primary" onClick={() => dispatch({ type: 'next' })}>
            {session.current === session.questions.length - 1
              ? 'Посмотреть результат'
              : alphabet
                ? 'Следующая буква →'
                : sentenceQuestion
                  ? 'Следующее задание →'
                  : 'Следующее слово →'}
          </button>
        </div>
      )}
    </section>
  );
}
