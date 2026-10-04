import { Link, useParams } from 'react-router';
import { grammarLessons } from '../data/grammar-lessons.ts';
import type { PluralExample, SentenceExample, LessonBlock } from '../data/types.ts';
import { MaterialView, NotFound } from '../app/MaterialView.tsx';
import { useStartPractice } from '../app/useStartPractice.ts';
import { blockItems, grammarQuestions, mixedBlockItems, shuffled } from '../training/model.ts';
import { Colloquial } from '../shared/Colloquial.tsx';

export function GrammarPage() {
  return (
    <MaterialView title="Уроки армянского языка">
      <section>
        <p className="eyebrow">Грамматика</p>
        <h1 tabIndex={-1} data-material-heading>
          Уроки армянского языка
        </h1>
        <p className="intro">
          Читай объяснение, смотри примеры и проверяй себя. Блоки урока можно проходить в любом
          порядке.
        </p>
        <div className="lesson-list">
          {grammarLessons.map((lesson, index) => (
            <Link className="lesson-tile" to={'/grammar/' + lesson.id} key={lesson.id}>
              <p className="eyebrow">Урок {index + 1}</p>
              <h2>{lesson.title}</h2>
              <p>{lesson.lead}</p>
            </Link>
          ))}
        </div>
      </section>
    </MaterialView>
  );
}

function Example({ item }: { item: PluralExample | SentenceExample }) {
  return (
    <>
      <span className="example-pair" lang="hy">
        {'sentence' in item ? item.sentence : item.singular + ' → ' + item.plural}
      </span>
      <span className="example-ru">{item.ru}</span>
      {'colloquial' in item && item.colloquial && <Colloquial sentence={item.colloquial} />}
    </>
  );
}

function LessonBlockView({
  block,
  index,
  count,
  lessonId,
}: {
  block: LessonBlock;
  index: number;
  count: number;
  lessonId: string;
}) {
  const startPractice = useStartPractice();
  const modes = block.exercises ? (['choice', 'build'] as const) : (['choice'] as const);
  const forms = block.exercises ? block.examples.filter((item) => item.person) : [];
  const examples = block.examples.filter((item) => !('person' in item && item.person));
  return (
    <section className="block" aria-labelledby={'block-' + block.id}>
      <div className="block-top">
        <div>
          <p className="block-number">
            Блок {index + 1} из {count}
          </p>
          <h3 id={'block-' + block.id} tabIndex={-1}>
            <Link to={'/grammar/' + lessonId + '/blocks/' + block.id}>{block.title}</Link>
          </h3>
        </div>
        <div className="block-practice">
          {modes.map((mode) => (
            <button
              className="secondary"
              key={mode}
              onClick={() =>
                startPractice('grammar', grammarQuestions(blockItems(block, mode)), block.title)
              }
            >
              {block.exercises
                ? mode === 'choice'
                  ? 'Выбрать форму'
                  : 'Собрать предложение'
                : 'Практика · до 6 слов'}
            </button>
          ))}
        </div>
      </div>
      <p className="block-rule">{block.rule}</p>
      <p className="block-detail">{block.detail}</p>
      {forms.length > 0 && (
        <div className="forms-wrap">
          <table className="forms-table" aria-label={block.title + ': формы по лицам'}>
            <thead>
              <tr>
                {['Лицо', 'Форма', 'Пример'].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forms.map((item) => (
                <tr key={item.id}>
                  <td>{item.person}</td>
                  <td className="armenian" lang="hy">
                    {item.form}
                  </td>
                  <td>
                    <Example item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className={'examples' + (block.exercises ? ' sentence-examples' : '')}>
        {examples.map((item) => (
          <li className="example" key={'id' in item ? item.id : item.singular}>
            <Example item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LessonPage() {
  const { lessonId, blockId } = useParams();
  const lessonIndex = grammarLessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = grammarLessons[lessonIndex];
  const startPractice = useStartPractice();
  if (!lesson || (blockId && !lesson.blocks.some((block) => block.id === blockId)))
    return <NotFound />;
  const block = lesson.blocks.find((item) => item.id === blockId);
  return (
    <MaterialView
      title={block ? block.title + ' · ' + lesson.title : lesson.title}
      blockId={blockId}
    >
      <section>
        <Link className="back" to="/grammar">
          ← К урокам
        </Link>
        <div className="lesson-header">
          <p className="eyebrow">Грамматика · Урок {lessonIndex + 1}</p>
          <h1 tabIndex={-1} data-material-heading>
            {lesson.title}
          </h1>
          <p>{lesson.lead}</p>
          {lesson.intro && <p>{lesson.intro}</p>}
        </div>
        <div className="block-list">
          {lesson.blocks.map((item, index) => (
            <LessonBlockView
              key={item.id}
              lessonId={lesson.id}
              block={item}
              index={index}
              count={lesson.blocks.length}
            />
          ))}
        </div>
        <div className="lesson-actions">
          <button
            className="primary"
            onClick={() =>
              startPractice(
                'grammar',
                grammarQuestions(
                  shuffled(lesson.blocks.flatMap((block) => mixedBlockItems(block))),
                ),
                'Смешанная тренировка',
              )
            }
          >
            Смешанная тренировка ·{' '}
            {lesson.blocks.reduce((sum, item) => sum + Math.min(3, item.examples.length), 0)}{' '}
            вопросов
          </button>
        </div>
      </section>
    </MaterialView>
  );
}
