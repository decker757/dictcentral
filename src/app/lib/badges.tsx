// Single source of truth for the catalog's semantic color badges.
//
// Before this module, classification / sensitivity / key-indicator colors were
// re-declared as `switch` statements in 6+ components, each drifting slightly.
// Class strings here are FULL LITERALS (not template-constructed) so Tailwind v4's
// content scanner keeps them in the build.

import { Shield, Lock, Key } from 'lucide-react';

type Tone = 'solid' | 'subtle';

// ── Classification (Public / Internal / Confidential / Restricted) ──

const CLASSIFICATION_BADGE: Record<string, Record<Tone, string>> = {
  Public:       { solid: 'bg-green-100 text-green-700 border-green-200',   subtle: 'bg-green-50 text-green-700 border-green-200' },
  Internal:     { solid: 'bg-blue-100 text-blue-700 border-blue-200',      subtle: 'bg-blue-50 text-blue-700 border-blue-200' },
  Confidential: { solid: 'bg-orange-100 text-orange-700 border-orange-200', subtle: 'bg-orange-50 text-orange-700 border-orange-200' },
  Restricted:   { solid: 'bg-red-100 text-red-700 border-red-200',         subtle: 'bg-red-50 text-red-700 border-red-200' },
};
const CLASSIFICATION_FALLBACK: Record<Tone, string> = {
  solid: 'bg-gray-100 text-gray-700 border-gray-200',
  subtle: 'bg-gray-50 text-gray-600 border-gray-200',
};
const CLASSIFICATION_TEXT: Record<string, string> = {
  Public: 'text-green-700', Internal: 'text-blue-700', Confidential: 'text-orange-700', Restricted: 'text-red-700',
};

export const classificationBadgeClass = (value: string, tone: Tone = 'subtle'): string =>
  (CLASSIFICATION_BADGE[value] ?? CLASSIFICATION_FALLBACK)[tone] ?? CLASSIFICATION_FALLBACK[tone];

export const classificationTextClass = (value: string): string =>
  CLASSIFICATION_TEXT[value] ?? 'text-gray-600';

export function ClassificationBadge({ value, tone = 'subtle', className = '' }: { value: string; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${classificationBadgeClass(value, tone)} ${className}`}>
      <Shield className="w-3 h-3 flex-shrink-0" />{value}
    </span>
  );
}

// ── Sensitivity (Low / Medium / High / Critical) ──

const SENSITIVITY_BADGE: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600', Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700',
};
const SENSITIVITY_BORDER: Record<string, string> = {
  Low: 'border-gray-200', Medium: 'border-yellow-200', High: 'border-orange-200', Critical: 'border-red-200',
};
const SENSITIVITY_TEXT: Record<string, string> = {
  Low: 'text-gray-500', Medium: 'text-yellow-600', High: 'text-orange-600', Critical: 'text-red-600',
};

export const sensitivityBadgeClass = (value: string, withBorder = false): string => {
  const base = SENSITIVITY_BADGE[value] ?? 'bg-gray-100 text-gray-600';
  return withBorder ? `${base} border ${SENSITIVITY_BORDER[value] ?? 'border-gray-200'}` : base;
};

export const sensitivityTextClass = (value: string): string =>
  SENSITIVITY_TEXT[value] ?? 'text-gray-500';

export function SensitivityBadge({ value, withBorder = false, className = '' }: { value: string; withBorder?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded${withBorder ? '-md' : ''} text-xs font-medium ${sensitivityBadgeClass(value, withBorder)} ${className}`}>
      {value === 'Critical' && <Lock className="w-3 h-3" />}{value}
    </span>
  );
}

// ── Key indicator (PK / FK / UK) ──

const KEY_INDICATOR_BADGE: Record<string, string> = {
  PK: 'bg-purple-50 text-purple-700 border-purple-200',
  FK: 'bg-blue-50 text-blue-700 border-blue-200',
  UK: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const keyIndicatorBadgeClass = (value: string): string =>
  KEY_INDICATOR_BADGE[value] ?? 'bg-gray-50 text-gray-600 border-gray-200';

export function KeyBadge({ value, size = 'sm', className = '' }: { value: string | null | undefined; size?: 'sm' | 'md'; className?: string }) {
  if (!value) return null;
  const sizing = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5';
  const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold rounded border ${sizing} ${keyIndicatorBadgeClass(value)} ${className}`}>
      <Key className={icon} />{value}
    </span>
  );
}
