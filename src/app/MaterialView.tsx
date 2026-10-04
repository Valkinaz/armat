import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAppState } from './AppState.tsx';
import { Training } from '../training/Training.tsx';

function sessionIdFromState(state: unknown): string | undefined {
  return state &&
    typeof state === 'object' &&
    'sessionId' in state &&
    typeof state.sessionId === 'string'
    ? state.sessionId
    : undefined;
}

export function MaterialView({
  title,
  blockId,
  children,
}: {
  title: string;
  blockId?: string;
  children: ReactNode;
}) {
  const { session } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const content = useRef<HTMLDivElement>(null);
  const requestedSessionId = sessionIdFromState(location.state);
  const active =
    session && session.id === requestedSessionId && session.originPath === location.pathname
      ? session
      : null;
  const activeId = active?.id;

  useEffect(() => {
    // История сохраняется после перезагрузки, а сессия в памяти — нет.
    if (requestedSessionId && !activeId)
      void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [requestedSessionId, activeId, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (activeId) return;
    document.title = title + ' — Արմատ';
    const heading = blockId
      ? document.getElementById('block-' + blockId)
      : content.current?.querySelector<HTMLElement>('[data-material-heading]');
    heading?.focus({ preventScroll: true });
    if (blockId) heading?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [location.key, activeId, title, blockId]);

  return (
    <div ref={content}>{active ? <Training key={active.id} session={active} /> : children}</div>
  );
}

export function NotFound() {
  return (
    <MaterialView title="Материал не найден">
      <h1 tabIndex={-1} data-material-heading>
        Материал не найден
      </h1>
      <p className="intro">Проверь адрес или выбери материал в списке.</p>
      <Link className="back" to="/grammar">
        ← К урокам
      </Link>
    </MaterialView>
  );
}
