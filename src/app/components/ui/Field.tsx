// Shared form-field primitives. Replaces the per-modal `F` / `TextInput` /
// `SelectInput` / `field` / `textInput` helpers that each re-declared the same
// label + input/select/textarea markup with the same Tailwind classes.

import { ReactNode } from 'react';

type Ring = 'blue' | 'orange' | 'green' | 'purple';
const RING: Record<Ring, string> = {
  blue: 'focus:ring-blue-400',
  orange: 'focus:ring-orange-400',
  green: 'focus:ring-green-400',
  purple: 'focus:ring-purple-400',
};

interface BaseProps {
  label?: string;
  ring?: Ring;
  density?: 'comfortable' | 'compact';
  required?: boolean;
  colSpan2?: boolean;
  mono?: boolean;
}

function FieldShell({
  label, required, colSpan2, density = 'comfortable', children,
}: { density?: BaseProps['density']; label?: string; required?: boolean; colSpan2?: boolean; children: ReactNode }) {
  const labelColor = density === 'compact' ? 'text-gray-400 mb-0.5' : 'text-gray-500 mb-1';
  return (
    <div className={colSpan2 ? 'col-span-2' : undefined}>
      {label && (
        <label className={`text-[10px] uppercase tracking-wide block ${labelColor}`}>
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

const controlClass = (ring: Ring, density: BaseProps['density'], mono?: boolean) =>
  `w-full text-sm border bg-white outline-none focus:ring-2 ${RING[ring]} ${
    density === 'compact' ? 'border-gray-300 rounded-md px-2.5 py-1.5' : 'border-gray-200 rounded-lg px-3 py-2'
  } ${mono ? 'font-mono' : ''}`;

interface TextFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

export function TextField({
  value, onChange, placeholder, type = 'text',
  label, ring = 'blue', density, required, colSpan2, mono,
}: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} colSpan2={colSpan2} density={density}>
      <input
        type={type}
        className={controlClass(ring, density, mono)}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  /** Leading empty-value option label, e.g. "Any" or "— None —". */
  placeholder?: string;
}

export function SelectField({
  value, onChange, options, placeholder,
  label, ring = 'blue', density, required, colSpan2,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} colSpan2={colSpan2} density={density}>
      <select className={controlClass(ring, density)} value={value} onChange={e => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </FieldShell>
  );
}

interface TextAreaFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextAreaField({
  value, onChange, rows = 3, placeholder,
  label, ring = 'blue', density, colSpan2,
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} colSpan2={colSpan2} density={density}>
      <textarea
        className={`${controlClass(ring, density)} resize-none`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </FieldShell>
  );
}
