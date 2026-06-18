# DictCentral

Enterprise **data-dictionary / data-catalog** web app. Two roles: **Board Members**
submit create/edit *change requests* for entities and data items; **Approvers**
review, approve, or reject them. Everything is in-memory (mock data) — no backend.

> **Origin:** this is a **local mirror of a Figma Make file** (key `gfOwAIkpJCF8DsFZyyhfNI`),
> pulled out of Make because credits ran out. Edits here do **NOT** sync back to Figma
> Make (one-way). To push changes back into Make, wire up GitHub sync.

## Commands

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # vite build → dist/  (THE source of truth for "does it compile")
npm run typecheck  # tsc --noEmit (see gotcha below)
```

- **`npm run build` (esbuild) is the gate.** It catches real errors (imports, syntax, JSX).
- **`npm run typecheck` reports pre-existing strict errors that are harmless at runtime** —
  don't chase them: `mockData.ts` has `defaultValue: null` (type says `string`), and there are a
  couple `as Record<string,unknown>` casts. esbuild strips types, so the app runs fine. All
  errors are confined to `mockData.ts`; anything reported in app code is real and was introduced
  by your change.

## Tech stack

- **React 18** + **Vite 6**, TypeScript.
- **Tailwind CSS v4** via `@tailwindcss/vite` — **there is no `tailwind.config.js`**.
  Design tokens live in `src/styles/theme.css` (`@theme` / CSS vars). `src/styles/fonts.css`
  is intentionally empty.
- **Radix primitives** (`@radix-ui/react-*`), **sonner** (toasts), **lucide-react** (icons),
  **motion** (animation). Path alias `@` → `./src`.
- Dependencies were pruned vs. the original Make project (no MUI/recharts/etc.); only the
  used shadcn `ui/` subset is present (`alert-dialog`, `button`, `textarea`, `label`, `utils`).

## Architecture

`src/main.tsx` → `src/app/App.tsx` (default export). `App` is **routing + composition only**;
the catalog/request state and every mutation live in the `useCatalog` hook:

- `role === 'selection'` → `LandingPage` (pick Board Member or Approver)
- `role === 'board'`     → Board Member portal (inline in `App.tsx`)
- `role === 'approver'`  → `ApproverPortal`

`useCatalog()` (`hooks/useCatalog.ts`) owns `subjectAreas` (the catalog) and `requests` (the
approval queue) and exposes the board submit + approve/reject actions. `App` just wires those
into the UI and closes modals.

### Key files
```
src/app/
  App.tsx              Role routing + composition; consumes useCatalog (no business logic)
  types.ts             DataItem · Entity · SubjectArea · ChangeRequest
  ApproverPortal.tsx   Approver: Home (tree/table) + Requests (filters, grouping, bulk, focus)
  LandingPage.tsx      Role picker
  hooks/
    useCatalog.ts      The engine: state + commit/submit/approve/reject/undo (extracted from App)
  lib/                 Framework-free shared logic (single sources of truth):
    catalog.ts         flatten/count/find helpers + computeChangedFields
    badges.tsx         semantic color helpers + Classification/Sensitivity/Key badges
    fieldSchema.ts     ENTITY_FIELDS / DATAITEM_FIELDS (the canonical field lists)
    format.ts          formatValue · isEmptyValue · formatSubmittedAt
    constants.ts       option lists (DATA_TYPES, CLASSIFICATIONS, …) + CURRENT_BOARD_MEMBER
  data/                mockData.ts (catalog) · initialRequests.ts (seed queue + demo data)
  components/
    RequestCard.tsx    Request row (re-exports FieldRow/ENTITY_FIELDS/DATAITEM_FIELDS/formatValue
                       for compat); diff rendering lives in shared/DiffGrid
    FocusModeView.tsx  One-at-a-time review mode (keyboard-driven)
    TreeView/TableView/SearchBar
    modals/            EntityModal, DataItemModal, AdvancedSearchModal, CreateModal, EditModal
    shared/            Cross-component pieces: DiffGrid (+getRequestDiff), RejectDialog,
                       ExcelDropzone (+useExcelImport), MetaCell
    ui/                Modal/ModalHeader, Field (Text/Select/TextArea), Segmented,
                       + shadcn primitives (alert-dialog, button, textarea, label, utils)
```

## Approval workflow (the non-obvious domain logic)

A `ChangeRequest` has `type` (create|edit), `recordType` (entity|dataitem), `status`,
`proposedData`, optional `originalData` + `changedFields`, `submittedBy`, `rejectionReason`,
and hierarchy fields (`parentEntityId`/`parentEntityName` for data items).

- **Approve** (`useCatalog.approve`) commits to `subjectAreas` then marks the request approved
  and shows a sonner **Undo** toast. Entity *edits* strip `dataItems`/`id` before applying so
  they don't wipe the entity's existing fields.
- **Reject** (`useCatalog.reject`) requires a reason. Rejecting a **new-entity create cascades**:
  it also rejects that entity's pending child data-item requests (no orphans). Undo restores
  every affected id together.
- **Orphan guard** (`ApproverPortal.isParentPendingNew`): a data-item-create whose parent is a
  *pending new entity* can't be approved until the parent is — its Approve button shows a 🔒.
- **Grouping** (`ApproverPortal.subjectAreaGroups`): requests are grouped by **subject area**,
  then by **entity**. Each entity is an `EntityBlock`:
  - `entityRequest` — the entity is itself being created/edited (actionable card)
  - `existingEntity` — the entity is unchanged; rendered as a **read-only context header**
    (`EntityViewCard`, expands to show current properties) so data items never float at top level.
  Child data items render nested under a connector rail (`renderBlock` / `renderChildRail`).
- **Focus mode** (`FocusModeView`): a snapshot of pending IDs (`orderedPendingIds`) is frozen on
  entry so the queue doesn't reindex as you act. Keyboard: `A` approve · `R` reject · `S`/`→`
  skip · `←` prev · `Esc` exit.

## Design system — semantic color (KEEP CONSISTENT)

Color carries **exactly one meaning** (Nielsen #4 / consistency). When editing UI, follow this:

| Color | Meaning | Examples |
|-------|---------|----------|
| 🟢 emerald | positive / additive | Approve, approved, "new"/added field |
| 🔴 red | negative / removal | Reject (outline), rejected, "removed" field |
| 🟡 amber | modified / attention | "changed" field, pending |
| ⚪ gray/slate | structure | text, borders, metadata, labels |

- **Do not** use status colors for anything else (e.g. data sensitivity is shown as a *label*,
  never a colored border).
- **Type via icon + word**: `Database` = Entity, `FileText` = Data item (matches Tree/Table views).
- **Action via chip**: green `Create · N new` / amber `Edit · N changed`.
- **One primary action per row**: Approve is solid; Reject is an outline button.
- A UX reference skill, **`ui-ux-pro-max`**, is installed at user level — invoke it for design
  decisions/reviews. Its `--design-system` engine: `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`.

## Conventions

- Styling is Tailwind utility classes inline. **Semantic status/sensitivity/key colors are
  centralized in `lib/badges.tsx`** — use `classificationBadgeClass` / `sensitivityBadgeClass` /
  `keyIndicatorBadgeClass` or the `<ClassificationBadge>` / `<SensitivityBadge>` / `<KeyBadge>`
  components; do not re-add inline `switch (classification)` color maps. Class strings there are
  full literals on purpose (Tailwind v4 scans source for complete class names — never build them
  via template strings).
- Form inputs go through `ui/Field` (`TextField`/`SelectField`/`TextAreaField`); modal shells
  through `ui/Modal` (`Modal`/`ModalHeader`); option lists come from `lib/constants`.
- `RequestCard` is collapsed by default; clicking a row expands its field diff grid.
- Don't edit `dist/` (build output) or `.vite/` (cache).
