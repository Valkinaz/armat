import type { ReactNode } from 'react';

export function Feedback({ good, children }: { good?: boolean; children?: ReactNode }) {
  return (
    <p
      className={'feedback' + (good === undefined ? '' : good ? ' good' : ' bad')}
      aria-live="polite"
    >
      {children}
    </p>
  );
}
