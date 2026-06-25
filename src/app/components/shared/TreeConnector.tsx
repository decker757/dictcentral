// The small "rail + tick" connector drawn in front of a child data-item row
// in the Excel-style hierarchy tables, signalling "this row nests under the
// entity row above it" without needing real indentation (which would throw
// off the sticky Name column's fixed width). Previously duplicated as two
// near-identical inline `<span>` pairs — one in HierarchyRequestTable (28px,
// rail at left-3), one in EditableHierarchyRequestTable (22px, rail at
// left-2.5) — with no comment explaining whether the size difference was
// intentional. It wasn't load-bearing: the editable table's row just has a
// live `<input>` instead of static text immediately after, so it has very
// slightly less room. Both now render through this one component, with that
// width difference kept as an explicit, named choice instead of two
// untethered magic-number pairs.

const SIZES = {
  /** HierarchyRequestTable's read-only rows. */
  normal: { width: 28, railLeft: 12, tickWidth: 12 },
  /** EditableHierarchyRequestTable's rows, where the cell also holds a live input. */
  compact: { width: 22, railLeft: 10, tickWidth: 10 },
} as const;

export function TreeConnector({ size = 'normal' }: { size?: keyof typeof SIZES }) {
  const { width, railLeft, tickWidth } = SIZES[size];
  return (
    <span className="relative flex-shrink-0" style={{ width, height: 20 }} aria-hidden="true">
      <span className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: railLeft }} />
      <span className="absolute top-1/2 h-px bg-gray-300" style={{ left: railLeft, width: tickWidth }} />
    </span>
  );
}
