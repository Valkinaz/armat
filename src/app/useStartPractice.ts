import { useLocation, useNavigate } from 'react-router';
import { useAppState } from './AppState.tsx';
import type { Question, Session } from '../training/model.ts';
import type { VocabularySettings } from '../data/types.ts';

export function useStartPractice() {
  const { start } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  return (kind: Session['kind'], questions: Question[], mode = '', vocabulary?: VocabularySettings) => {
    if (!questions.length) return;
    const id = start({ originPath: location.pathname, kind, questions, mode, vocabulary });
    void navigate(location.pathname, { state: { sessionId: id } });
  };
}
