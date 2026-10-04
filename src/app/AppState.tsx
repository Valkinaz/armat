import { createContext, useContext, useReducer, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createSession, sessionReducer } from '../training/model.ts';
import type { Session, SessionAction, SessionSetup } from '../training/model.ts';

interface AppState {
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
  session: Session | null;
  dispatch: Dispatch<SessionAction>;
  start: (setup: Omit<SessionSetup, 'id'>) => string;
}
const StateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [session, dispatch] = useReducer(sessionReducer, null);
  function start(setup: Omit<SessionSetup, 'id'>) {
    const id = crypto.randomUUID();
    dispatch({ type: 'start', session: createSession({ ...setup, id }) });
    return id;
  }
  return (
    <StateContext.Provider value={{ selected, setSelected, session, dispatch, start }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const state = useContext(StateContext);
  if (!state) throw new Error('AppStateProvider is missing');
  return state;
}
