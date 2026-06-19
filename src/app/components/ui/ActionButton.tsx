// Shared approve / reject action buttons.
//
// One refined style used everywhere review actions appear (request rows, focus
// mode, bulk bar) so they stay consistent and the styling lives in ONE place.
// Semantic system (see CLAUDE.md): Approve = emerald solid primary · Reject =
// quiet outline that turns red on intent (or solid red where it's the prominent
// choice, e.g. focus mode / bulk). Class strings are full literals for Tailwind.

import type { ReactNode } from 'react';
import { Check, X, Lock } from 'lucide-react';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed select-none whitespace-nowrap';

const SIZE = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
} as const;
type Size = keyof typeof SIZE;

const GLYPH: Record<Size, string> = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-4 h-4' };

export function ApproveButton({
  onClick, size = 'sm', disabled = false, locked = false, className = '', children = 'Approve',
}: {
  onClick?: () => void;
  size?: Size;
  disabled?: boolean;
  /** Disabled because a prerequisite isn't met yet — shows a lock instead of a check. */
  locked?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const isDisabled = disabled || locked;
  const Icon = locked ? Lock : Check;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`${BASE} ${SIZE[size]} ${
        isDisabled
          ? 'bg-gray-100 text-gray-400'
          : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/40'
      } ${className}`}
    >
      <Icon className={GLYPH[size]} strokeWidth={2.5} />{children}
    </button>
  );
}

export function RejectButton({
  onClick, size = 'sm', variant = 'outline', disabled = false, className = '', children = 'Reject',
}: {
  onClick?: () => void;
  size?: Size;
  /** `outline` = quiet, reddens on hover (per-row). `solid` = prominent (focus / bulk). */
  variant?: 'outline' | 'solid';
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const tone =
    variant === 'solid'
      ? 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/40 disabled:opacity-50'
      : 'border border-gray-200 bg-white text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 focus-visible:ring-red-500/30 disabled:opacity-50';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} ${SIZE[size]} ${tone} ${className}`}
    >
      <X className={GLYPH[size]} strokeWidth={2.5} />{children}
    </button>
  );
}
