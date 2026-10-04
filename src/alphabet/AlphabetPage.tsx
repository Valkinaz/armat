import alphabet from '../data/alphabet.json';
import { useAppState } from '../app/AppState.tsx';
import { MaterialView } from '../app/MaterialView.tsx';
import { useStartPractice } from '../app/useStartPractice.ts';
import { alphabetQuestions } from '../training/model.ts';

export function AlphabetPage() {
  const { selected, setSelected } = useAppState();
  const startPractice = useStartPractice();
  const allSelected = selected.length === alphabet.length;
  return (
    <MaterialView title="Армянский алфавит">
      <section>
        <h1 tabIndex={-1} data-material-heading>
          Выбери буквы
          <br />
          для тренировки
        </h1>
        <p className="intro">
          Нажми на карточки, которые хочешь повторить. Когда будешь готов — начни тренировку.
        </p>
        <div className="selection-bar">
          <h2>Изученные буквы</h2>
          <div className="selection-actions">
            <span className="counter">Выбрано: {selected.length}</span>
            <button
              className="secondary"
              aria-pressed={allSelected}
              onClick={() => setSelected(allSelected ? [] : alphabet.map((letter) => letter.upper))}
            >
              {allSelected ? 'Снять выбор' : 'Выбрать все'}
            </button>
          </div>
        </div>
        <div className="cards" role="group" aria-label="Выбор букв">
          {alphabet.map((letter) => (
            <button
              key={letter.upper}
              className={'letter-card' + (selected.includes(letter.upper) ? ' selected' : '')}
              aria-pressed={selected.includes(letter.upper)}
              onClick={() =>
                setSelected((current) =>
                  current.includes(letter.upper)
                    ? current.filter((value) => value !== letter.upper)
                    : [...current, letter.upper],
                )
              }
            >
              <span className="glyph" lang="hy">
                {letter.upper} {letter.lower}
              </span>
              <span className="sound">{letter.sound}</span>
            </button>
          ))}
        </div>
        <div className="start-row">
          <button
            className="primary"
            disabled={!selected.length}
            onClick={() =>
              startPractice(
                'alphabet',
                alphabetQuestions(
                  alphabet.filter((letter) => selected.includes(letter.upper)),
                  alphabet,
                ),
              )
            }
          >
            {selected.length ? 'Начать тренировку · ' + selected.length : 'Начать тренировку'}
          </button>
        </div>
      </section>
    </MaterialView>
  );
}
