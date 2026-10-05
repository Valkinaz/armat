import { Link, NavLink, Navigate, Route, Routes } from 'react-router';
import { AlphabetPage } from '../alphabet/AlphabetPage.tsx';
import { GrammarPage, LessonPage } from '../grammar/GrammarPages.tsx';
import { NotFound } from './MaterialView.tsx';

export function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Արմատ — на главную">
          <span className="brand-mark" aria-hidden="true">Ա</span>
          <span>Արմատ</span>
        </Link>
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
