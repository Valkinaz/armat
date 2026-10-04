import { NavLink, Navigate, Route, Routes } from 'react-router';
import { AlphabetPage } from '../alphabet/AlphabetPage.tsx';
import { GrammarPage, LessonPage } from '../grammar/GrammarPages.tsx';
import { NotFound } from './MaterialView.tsx';

export function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Ա</span>
          <span>Արմատ</span>
        </div>
        <nav className="nav" aria-label="Разделы">
          <NavLink to="/alphabet">Буквы</NavLink>
          <NavLink to="/grammar">Грамматика</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/alphabet" replace />} />
        <Route path="/alphabet" element={<AlphabetPage />} />
        <Route path="/grammar" element={<GrammarPage />} />
        <Route path="/grammar/:lessonId" element={<LessonPage />} />
        <Route path="/grammar/:lessonId/blocks/:blockId" element={<LessonPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}
