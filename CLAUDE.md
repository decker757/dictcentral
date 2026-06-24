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

`src/main.tsx` → `src/app/App.tsx` (default export). `App` is **routing + composition only**
— it owns no UI of its own beyond picking which screen to render; the catalog/request state and
every mutation live in the `useCatalog` hook, and each role's entire screen (header, tabs, modal
state, the lot) is its own component that `App` just wires `useCatalog`'s state/actions into:

- `role === 'selection'` → `LandingPage` (pick Board Member or Approver)
- `role === 'board'`     → `BoardPortal`
- `role === 'approver'`  → `ApproverPortal`

`useCatalog()` (`hooks/useCatalog.ts`) owns `subjectAreas` (the catalog) and `requests` (the
approval queue) and exposes the board submit + approve/reject/withdraw actions. `App` just wires
those into whichever portal is active.

### Key files
```
src/app/
  App.tsx              Role routing only — picks LandingPage/BoardPortal/ApproverPortal and
                       wires useCatalog's state/actions into whichever is active; no UI of its own
  types.ts             DataItem · Entity · SubjectArea · ChangeRequest (batchId-grouped) · Comment
  BoardPortal.tsx      Board Member: Catalog (tree/table, editable via Create/Edit modals) +
                       My Requests (list of BoardRequestCards → SubmissionDetailView, filtered
                       All/Pending/Approved/Rejected). Owns its own header/tabs/modal state —
                       mirrors ApproverPortal's shape so the two portals are easy to compare.
  ApproverPortal.tsx   Approver: Home (tree/table) + Requests (list of SubmissionCards →
                       SubmissionDetailView / FocusModeView; filters, bulk, focus)
  LandingPage.tsx      Role picker
  hooks/
    useCatalog.ts      The engine: state + commit/submit/approve(batchId)/reject(batchId)/
                       withdraw(batchId) + approver comment state (itemComments, batchComments)
  lib/                 Framework-free shared logic (single sources of truth):
    catalog.ts         flatten/count/find helpers + computeChangedFields
    submissions.ts      groupRequestsByBatch → Submission (one request = one batchId)
    requestGroups.ts    groupRequestsBySubjectArea → EntityBlock (entity ↔ child data items,
                       used WITHIN one request's table, not across the whole queue)
    badges.tsx         semantic color helpers + Classification/Sensitivity/Key badges
    fieldSchema.ts     RECORD_FIELDS (the canonical field list, with `kind`/`options` editing
                       metadata) + REQUIRED_RECORD_FIELDS + fieldInputValue/parseFieldInput
                       (typed value ↔ form-control string helpers, used by the revise-and-resubmit
                       table)
    format.ts          formatValue · isEmptyValue · formatSubmittedAt
    constants.ts       option lists (DATA_TYPES, CLASSIFICATIONS, …) + CURRENT_BOARD_MEMBER,
                       CURRENT_APPROVER
    exportCsv.ts       buildSubmissionCsv + downloadTextFile — client-side CSV export for the
                       Board Member's "Export" button (UI only, no backend); flattens each
                       comment thread into one cell, one entry per line
  data/                mockData.ts (catalog) · initialRequests.ts (seed queue + demo data,
                       grouped into 6 demo batchIds)
  components/
    SubmissionCard.tsx      One request = one card (requester · time · operation badges · status);
                            the Requests-tab list. Click → SubmissionDetailView.
    SubmissionDetailView.tsx Full request view: header (operation badges next to the
                            status badge, no separate per-row Operation/Status columns) +
                            Approve/Reject (whole request) + generic comment +
                            HierarchyRequestTable scoped to that batch. Also reused
                            read-only by the Board Member's My Requests (comments shown
                            but not editable, reviewer/timestamp shown once resolved);
                            Export appears for pending/rejected requests only, not approved
                            ones; Edit & Resubmit appears only when rejected (opens
                            ReviseSubmissionView); Withdraw appears only when pending.
    ReviseSubmissionView.tsx Board Member only, rejected requests only: the editable
                            counterpart to SubmissionDetailView — same header/rejection-
                            reason/generic-comment layout, but EditableHierarchyRequestTable
                            instead of the read-only table. Validates required fields
                            client-side before calling useCatalog.reviseAndResubmit, which
                            resubmits under the SAME request/batch ids (so comment threads
                            carry over) with status flipped back to 'pending'.
    BoardRequestCard.tsx    Board Member's request-list card — operation badge(s),
                            status, and (once resolved) reviewer name + timestamp only.
                            No Withdraw action here — that only lives in
                            SubmissionDetailView (click into the request first).
    FocusModeView.tsx   One-request-at-a-time review mode (keyboard-driven), wraps
                        SubmissionDetailView in next/prev/skip/exit chrome
    TreeView/TableView/SearchBar
    modals/            EntityModal, DataItemModal, AdvancedSearchModal, CreateModal, EditModal,
                       RequestDetailModal (single-record diff modal opened by clicking any row
                       in the Excel table — changed fields show old struck-through → new
                       highlighted, same look a create's "all new" gets; an unchanged-entity
                       context row instead opens the plain EntityModal)
    shared/            Cross-component pieces: DiffGrid (+getRequestDiff), RejectDialog,
                       WithdrawDialog (board member's withdraw confirmation — no reason needed,
                       unlike RejectDialog), HierarchyRequestTable (Excel-style table, no per-row
                       approve — Comments column instead), EditableHierarchyRequestTable (same
                       layout, live input/select/textarea cells driven by fieldSchema's
                       `kind`/`options` — used only by ReviseSubmissionView), CommentThread (a
                       comment list + add-input, reused by both the generic and per-row threads,
                       compact or roomy), ExcelDropzone (+useExcelImport), MetaCell
    ui/                Modal/ModalHeader, Field (Text/Select/TextArea), Segmented,
                       + shadcn primitives (alert-dialog, button, textarea, label, utils)
```

## Approval workflow (the non-obvious domain logic)

Approvers act on a whole **request** at a time — never on an individual entity or
data item inside it. A request is every `ChangeRequest` sharing one `batchId`
(see `lib/submissions.ts` → `Submission`). The Requests tab lists one
`SubmissionCard` per batch (requester · submitted time · entity/data-item
count); clicking it opens `SubmissionDetailView`, which renders the Excel-style
`HierarchyRequestTable` scoped to just that batch, plus a generic comment box
for the whole request and the single Approve/Reject pair that accepts or
rejects every item in the batch together. `HierarchyRequestTable` itself has
no per-row approve/reject — only a per-row **Comments** cell (an approver
note tied to one specific entity/data item, distinct from the request-level
generic comment). Comments live in `useCatalog` (`itemComments` keyed by
request id, `batchComments` keyed by batchId) and never touch catalog data.

A `ChangeRequest` has `batchId` (the request it belongs to), `type`
(create|edit), `recordType` (entity|dataitem), `status`, `proposedData`,
optional `originalData` + `changedFields`, `submittedBy`, `rejectionReason`,
and hierarchy fields (`parentEntityId`/`parentEntityName` for data items).

- **Approve** (`useCatalog.approve(batchId)`) commits every pending item in
  the batch to `subjectAreas` (entities before their data items, so a new
  entity exists before its new columns attach) and marks the whole batch
  approved. Entity *edits* strip `dataItems`/`id` before applying so they
  don't wipe the entity's existing fields.
- **Reject** (`useCatalog.reject(batchId, reason)`) rejects every pending item
  in the batch with the same reason — no cascade logic is needed since a new
  entity and its own new data items are normally submitted in the same batch
  already. The reason is stored only as `rejectionReason` on each item (shown
  as its own red banner in `SubmissionDetailView`/`RequestDetailModal`) — it
  is deliberately NOT appended to the generic comment thread, so that thread
  only ever shows comments someone explicitly typed into it.
- **Revise & Resubmit** (`useCatalog.reviseAndResubmit(batchId, drafts)`): on
  a rejected request, the Board Member can open `ReviseSubmissionView`
  (entry point: the "Edit & Resubmit" button in `SubmissionDetailView`,
  shown only when `readOnly && status === 'rejected'`) and edit every field
  via `EditableHierarchyRequestTable`, seeded from each item's current
  `proposedData`. Required fields (`REQUIRED_RECORD_FIELDS` — Business Name,
  Technical Name, Classification) are validated client-side before the
  Validate & Resubmit button does anything; failing rows turn red and a
  banner explains what's missing. On success, `reviseAndResubmit` updates
  the SAME `ChangeRequest` ids/batchId in place — new `proposedData`,
  recomputed `changedFields` (edits only), status back to `'pending'`,
  `rejectionReason`/`reviewedBy`/`reviewedAt` cleared, `submittedAt` bumped
  to now — so `itemComments`/`batchComments` threads carry straight over
  instead of starting fresh, and the request reappears in the approver's
  pending queue exactly like any other request.
- **Withdraw** (`useCatalog.withdraw(batchId)`), Board Member only, pending requests only:
  removes every item in the batch from `requests` outright — there's no "withdrawn" status to
  track, the request simply disappears from both the Board Member's My Requests and the
  Approver's queue at once. Confirmed via `WithdrawDialog` (no reason needed, unlike Reject);
  the button only appears inside `SubmissionDetailView`'s header (click into the request from
  `BoardRequestCard` first — there's deliberately no shortcut from the list card itself). Once
  a request is approved or rejected it can no longer be withdrawn — the action disappears from
  the UI entirely in those states.
- **My Requests filter** (`BoardPortal.tsx`'s `reqFilter`): defaults to **All** (every submission
  the Board Member has made, newest first — `groupRequestsByBatch` already sorts that way), with
  Pending/Approved/Rejected as additional narrowing tabs, same pill-button pattern as the
  Approver's queue filter.
- **Cross-request dependency guard** (`ApproverPortal.isBatchBlocked`): a
  request can still contain a data-item create whose parent entity is itself
  a pending create in a *different* request — that other request must be
  approved first. The blocked request's Approve button shows a 🔒 and a
  banner explains why.
- **No per-row Operation/Status columns** in `HierarchyRequestTable` — the
  whole request's operation(s) and status are shown once, in the
  `SubmissionDetailView`/`SubmissionCard`/`BoardRequestCard` header, never
  repeated per row (the table's per-row info is the Comments cell instead).
- **Edit = purple, not amber**, on `OperationBadge` — deliberately distinct
  from the amber "Pending" status badge it usually sits right next to.
- **"Changes Only" is opt-in, not the default** — `HierarchyRequestTable`
  opens on Full View; the segmented Full View / Changes Only control (same
  pattern as `RequestDetailModal`) lets a reviewer narrow down explicitly.
  In Changes Only, a column appears ONLY if something in that group actually
  changed (or, for a new record, has a value) — there's no "parent's filled
  field gets a free pass" exception.
- **Clicking a row opens detail** — a request row (entity-create/edit or
  data-item-create/edit) opens `RequestDetailModal` (diff highlighted); an
  unchanged-entity context row opens the plain read-only `EntityModal`.
- **Comment threads, not single overwritable notes** (`useCatalog.itemComments`
  / `batchComments`, both `Record<batchId|requestId, Comment[]>`): every
  `addItemComment`/`addBatchComment` call APPENDS a timestamped, authored
  entry rather than replacing the last one, so a reject → revise → resubmit
  cycle (repeatable any number of times) keeps the full history visible to
  both sides. The rejection reason itself is NOT auto-appended to the generic
  thread — it lives only in `rejectionReason` (its own banner) — so the
  generic thread stays a clean log of comments someone actually typed, not a
  duplicate of the rejection banner. The generic thread is shown to BOTH the
  approver and (read-only) the board member, with the same one-commit-point
  rule as the per-row threads. The board member's read-only view shows the
  same threads (`CommentThread` with `readOnly`) with no draft input, and the
  per-batch CSV export flattens every entry.
- **One commit point for comments — no per-comment submit button.**
  `CommentThread` is a controlled component: it renders the thread plus a
  plain draft `<input>`, nothing else — typing only updates a draft value
  held by the PARENT (`SubmissionDetailView`'s `itemDrafts`/`genericDraft`
  props, controlled in turn by `ApproverPortal` for the single-open-request
  view or by `FocusModeView` for the keyboard-driven queue). A draft is only
  actually appended to its thread (via `onAddItemComment`/`onAddBatchComment`)
  at the moment Approve is clicked, or the Reject dialog is opened — see
  `flushOpenDrafts`/`flushDrafts` in each. This single commit point has to be
  reachable from BOTH the on-screen Approve/Reject buttons AND Focus Mode's
  `A`/`R` keyboard shortcuts, so the keyboard handler's `useEffect` deps
  deliberately include the draft state (see the comment there) — omitting
  them would re-introduce a stale-closure bug where a keystroke isn't flushed.
- **Grouping inside one request** (`lib/requestGroups.groupRequestsBySubjectArea`,
  reused by `HierarchyRequestTable`): within a batch, items are grouped by
  entity. Each entity is an `EntityBlock`:
  - `entityRequest` — the entity is itself being created/edited (its own row).
  - `existingEntity` — the entity is unchanged; rendered as a **read-only
    context header** (no actions) so data items never float at top level.
  Each group's header also shows that entity's **subject area** as a badge
  (a request can span more than one subject area, so this is always shown,
  not just when it would disambiguate).
  Child data-item rows render indented under their parent entity row with a
  tree-connector line — depth (parent vs child), not `isContext`, drives the
  indentation, so an entity-create/edit row is never visually mistaken for a
  child row.
- **Focus mode** (`FocusModeView`): a snapshot of pending **batchIds**
  (`orderedPendingBatchIds`) is frozen on entry so the queue doesn't reindex
  as you act. It wraps `SubmissionDetailView` in next/prev/skip/exit chrome.
  Keyboard: `A` approve · `R` reject · `S`/`→` skip · `←` prev · `Esc` exit.

## Design system — semantic color (KEEP CONSISTENT)

Color carries **exactly one meaning** (Nielsen #4 / consistency). When editing UI, follow this:

| Color | Meaning | Examples |
|-------|---------|----------|
| 🟢 emerald | positive / additive | Approve, approved, "new"/added field |
| 🔴 red | negative / removal | Reject (outline), rejected, "removed" field |
| 🟣 purple | modify (Edit operation) | The `Edit` `OperationBadge` only — kept off amber so it never blends into the amber "Pending" status badge next to it |
| 🟡 amber | attention | "changed" field highlight, pending status, "Changes Only" active state |
| ⚪ gray/slate | structure | text, borders, metadata, labels |

- **Do not** use status colors for anything else (e.g. data sensitivity is shown as a *label*,
  never a colored border).
- **Type via icon + word**: `Database` = Entity, `FileText` = Data item (matches Tree/Table views).
- **Action via chip**: green `Create` / purple `Edit` / red `Delete` (`OperationBadge`) —
  shown once per request (header), never per row.
- **One primary action per row**: Approve is solid; Reject is an outline button.
- A UX reference skill, **`ui-ux-pro-max`**, is installed at user level — invoke it for design
  decisions/reviews. Its `--design-system` engine: `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`.

## Conventions

- Styling is Tailwind utility classes inline. **Semantic status/sensitivity/key colors are
  centralized in `lib/badges.tsx`** — use `classificationBadgeClass` / `sensitivityBadgeClass` /
  `keyIndicatorBadgeClass` / `submissionStatusBadgeClass` or the `<ClassificationBadge>` /
  `<SensitivityBadge>` / `<KeyBadge>` / `<SubmissionStatusBadge>` components; do not re-add inline
  `switch (classification)` color maps or a local `STATUS_BADGE` literal — `SubmissionStatusBadge`
  (with its `tone: 'subtle' | 'solid'` and `size: 'sm' | 'md'` props) is the one source of truth
  for the pending/approved/rejected pill everywhere it appears (SubmissionCard, BoardRequestCard,
  SubmissionDetailView, RequestDetailModal). Class strings there are full literals on purpose
  (Tailwind v4 scans source for complete class names — never build them via template strings).
- **Record-type icons (Subject Area = blue · Entity = purple · Data item = green) go through
  `<RecordTypeIcon>` in `lib/badges.tsx`** — pass `type` + `size` (`xs`/`sm`/`md`/`lg`), plus
  `muted` (read-only context) or `boxless` (bare glyph for tight inline rows). It owns the glyph
  (`Layers`/`Database`/`FileText`), color, and tile, so the catalog tree and the request queue
  can't drift; don't re-add inline `bg-purple-100`/`Database` icon boxes. (TableView's entity
  link stays bespoke — it inherits its color for a hover-darken effect.)
- Form inputs go through `ui/Field` (`TextField`/`SelectField`/`TextAreaField`); modal shells
  through `ui/Modal` (`Modal`/`ModalHeader`); option lists come from `lib/constants`.
- `SubmissionCard` (the request-list card) is what an approver sees first; clicking it opens
  `SubmissionDetailView`'s field diff grid for every item in that request.
- Don't edit `dist/` (build output) or `.vite/` (cache).
