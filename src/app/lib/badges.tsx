// Single source of truth for the catalog's semantic color badges.
//
// Before this module, classification / sensitivity / key-indicator colors were
// re-declared as `switch` statements in 6+ components, each drifting slightly.
// Class strings here are FULL LITERALS (not template-constructed) so Tailwind v4's
// content scanner keeps them in the build.

import { Shield, Lock, Key, Layers, Database, FileText, Plus, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import type { RequestStatus } from '../types';

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

// ── Record-type icon (Subject Area · Entity · Data item) ──
//
// ONE component for every surface that labels a record by type, so the catalog
// tree and the change-request queue read identically and the styling lives in a
// single place — change it here, it changes everywhere. Mirrors the Data
// Hierarchy tree: Subject Area = blue · Entity = purple · Data item = green.
// Type is also signalled by the glyph (Layers / Database / FileText) and a nearby
// text label, so color is reinforcement, never the only cue. Data items use
// `green` (not `emerald`) to stay distinct from the emerald create/approve action
// color in the request queue. Class strings are full literals for Tailwind v4.

export type RecordTypeKey = 'subjectArea' | 'entity' | 'dataitem';

const RECORD_TYPE_GLYPH: Record<RecordTypeKey, LucideIcon> = {
  subjectArea: Layers, entity: Database, dataitem: FileText,
};
// Boxed accent — filled/tinted tile (bg + glyph color).
const RECORD_TYPE_BOX: Record<RecordTypeKey, string> = {
  subjectArea: 'bg-blue-600 text-white',
  entity:      'bg-purple-100 text-purple-600',
  dataitem:    'bg-green-100 text-green-600',
};
// Muted boxed accent — for an unchanged entity shown only as read-only context,
// so it stays subordinate to the actionable rows nested beneath it.
const RECORD_TYPE_BOX_MUTED: Record<RecordTypeKey, string> = {
  subjectArea: 'bg-blue-50 text-blue-400',
  entity:      'bg-purple-50 text-purple-400',
  dataitem:    'bg-green-50 text-green-400',
};
// Boxless accent — bare glyph color, for tight inline rows (e.g. tree data item).
const RECORD_TYPE_TEXT: Record<RecordTypeKey, string> = {
  subjectArea: 'text-blue-600', entity: 'text-purple-600', dataitem: 'text-green-600',
};

type IconSize = 'xs' | 'sm' | 'md' | 'lg';
const BOX_SIZE: Record<IconSize, string> = {
  xs: 'w-6 h-6', sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9',
};
const GLYPH_SIZE: Record<IconSize, string> = {
  xs: 'w-3 h-3', sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5',
};

export function RecordTypeIcon({
  type, size = 'md', muted = false, boxless = false, className = '',
}: {
  type: RecordTypeKey;
  size?: IconSize;
  /** Lower-emphasis tint — for read-only context (an unchanged entity). */
  muted?: boolean;
  /** Bare glyph, no tile — for tight inline rows. */
  boxless?: boolean;
  className?: string;
}) {
  const Glyph = RECORD_TYPE_GLYPH[type];
  if (boxless) {
    return <Glyph className={`${GLYPH_SIZE[size]} ${RECORD_TYPE_TEXT[type]} flex-shrink-0 ${className}`} />;
  }
  const color = muted ? RECORD_TYPE_BOX_MUTED[type] : RECORD_TYPE_BOX[type];
  return (
    <span className={`inline-flex items-center justify-center rounded-lg flex-shrink-0 ${BOX_SIZE[size]} ${color} ${className}`}>
      <Glyph className={GLYPH_SIZE[size]} />
    </span>
  );
}

// ── Operation badge (Create · Edit · Delete) ──
//
// Signals what KIND of change a request is — by color AND icon, so the operation
// reads at a glance without a field counter (the diff grid shows the specifics on
// expand). Plus/green = additive (create), pencil/purple = modify (edit) —
// purple rather than amber so it never blends into an amber "Pending" status
// badge sitting right next to it — trash/red = removal (delete).

export type Operation = 'create' | 'edit' | 'delete';

const OPERATION_BADGE: Record<Operation, { label: string; cls: string; Icon: LucideIcon }> = {
  create: { label: 'Create', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Plus },
  edit:   { label: 'Edit',   cls: 'bg-purple-50 text-purple-700 border-purple-200',     Icon: Pencil },
  delete: { label: 'Delete', cls: 'bg-red-50 text-red-700 border-red-200',              Icon: Trash2 },
};

export function OperationBadge({ operation, className = '' }: { operation: Operation; className?: string }) {
  const { label, cls, Icon } = OPERATION_BADGE[operation];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls} ${className}`}>
      <Icon className="w-3 h-3" strokeWidth={2.5} />{label}
    </span>
  );
}

// ── Submission status (pending / approved / rejected) ──
//
// The pill shown on SubmissionCard, BoardRequestCard, SubmissionDetailView's
// header, and RequestDetailModal — previously a `Record<status, classes>`
// literal copy-pasted in all four (two slightly different shades: a `-50`
// "subtle" tone for the list/detail views, a `-100` "solid" tone for the
// modal); centralized here with the same `tone` convention as
// ClassificationBadge instead of drifting between copies.

const SUBMISSION_STATUS_BADGE: Record<RequestStatus, Record<Tone, string>> = {
  pending:  { subtle: 'bg-amber-50 text-amber-700 border-amber-200',       solid: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { subtle: 'bg-emerald-50 text-emerald-700 border-emerald-200', solid: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { subtle: 'bg-red-50 text-red-600 border-red-200',            solid: 'bg-red-100 text-red-600 border-red-200' },
};

export const submissionStatusBadgeClass = (status: RequestStatus, tone: Tone = 'subtle'): string =>
  SUBMISSION_STATUS_BADGE[status][tone];

export function SubmissionStatusBadge({
  status, size = 'sm', tone = 'subtle', className = '',
}: {
  status: RequestStatus;
  /** `sm` (list cards) vs `md` (SubmissionDetailView's larger header). */
  size?: 'sm' | 'md';
  tone?: Tone;
  className?: string;
}) {
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  return (
    <span className={`px-2 py-0.5 rounded-md ${textSize} font-medium border capitalize ${submissionStatusBadgeClass(status, tone)} ${className}`}>
      {status}
    </span>
  );
}

// ── Type legend — the colour key for the Data Hierarchy ──
//
// One component used in both portals so the catalog's colour coding (matching
// RecordTypeIcon's hues) reads identically and can't drift.
export function TypeLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-xs text-gray-400 ${className}`}>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" />Subject Area</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-600" />Entity</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Data Item</span>
    </div>
  );
}
