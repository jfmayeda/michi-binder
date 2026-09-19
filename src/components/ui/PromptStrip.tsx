import type { ReactNode } from 'react';

export type PromptTone = 'idle' | 'asking' | 'problem';

const MARK: Record<PromptTone, string> = {
  idle: 'next',
  asking: 'pick',
  problem: 'wait',
};

/**
 * The Card GB prompt bar. It always states what the app wants next, in plain
 * language, in one fixed place. It is the editor's single answer to "what do I
 * do now" and the only place invalid actions are explained.
 */
export function PromptStrip({
  tone = 'idle',
  children,
  action,
}: {
  tone?: PromptTone;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <p
      className={`gb-prompt${tone === 'asking' ? ' gb-prompt--asking' : ''}${
        tone === 'problem' ? ' gb-prompt--problem' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="gb-prompt__marker" aria-hidden="true">
        {MARK[tone]}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </p>
  );
}
