import { useLocation, useNavigate } from 'react-router';
import { useAppState } from './AppState.tsx';
import type { Question } from '../training/model.ts';

export function useStartPractice() {
  const { start } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  return (kind: 'alphabet' | 'grammar', questions: Question[], mode = '') => {
    if (!questions.length) return;
    const id = start({ originPath: location.pathname, kind, questions, mode });
    void navigate(location.pathname, { state: { sessionId: id } });
  };
}
