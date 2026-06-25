// Shared layout constants for the Excel-style hierarchy tables
// (HierarchyRequestTable, EditableHierarchyRequestTable). Both tables pin
// the same first two columns (Business Name, Technical Name) via CSS
// `sticky` positioning while the rest of the row scrolls horizontally
// underneath — so both need the SAME pixel widths to line up, and both
// need to know the second column's `left` offset (= the first column's
// width). Previously these two numbers were copy-pasted as local consts in
// both files; a width changed in one would silently drift from the other.
//
// Each table's far-right "Comments" column keeps its own width locally
// (260px read-only, 240px editable) — that difference is real, not drift,
// since the editable table's comment cell is read-only history only (no
// draft input), so it can afford to be narrower.
export const ENTITY_NAME_COL_WIDTH = 220;
export const TECHNICAL_NAME_COL_WIDTH = 170;
/** The second sticky column's `left` offset — always equal to the first column's width. */
export const TECHNICAL_NAME_COL_LEFT = ENTITY_NAME_COL_WIDTH;
