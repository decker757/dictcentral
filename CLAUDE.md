# DictCentral

Enterprise **data-dictionary / data-catalog** web app. Three roles: **Board Members**
submit create/edit/delete *change requests* for entities and data items; **DGOs** (Data
Governance Officers) are the first review stage and can also submit their own requests;
**HODs** (Heads of Department) are the final, second review stage and only browse the
catalog read-only. Everything is in-memory (mock data) — no backend.

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
state, the lot) is its own component that `App` just wires `useCatalog`'s state/actions into,
binding each role's identity (CURRENT_BOARD_MEMBER / CURRENT_DGO / CURRENT_HOD, from
lib/constants) so the portals themselves never have to know "which person am I":

- `role === 'selection'` → `LandingPage` (pick Board Member, DGO, or HOD)
- `role === 'board'`     → `BoardPortal`
- `role === 'dgo'`       → `ApproverPortal` (the DGO portal — file name kept for history)
- `role === 'hod'`       → `HODPortal`

`useCatalog()` (`hooks/useCatalog.ts`) owns `subjectAreas` (the catalog) and `requests` (the
approval queue) and exposes the board/DGO submit actions (create/edit/**delete**, each taking an
explicit `submittedBy`) plus the two-stage review actions: `approveDgo` (forwards to HOD, commits
nothing), `approveHod` (commits to the catalog), `reject` (works at either stage), `reviseAndResubmit`,
`withdraw`. `App` just wires those into whichever portal is active.

### Key files
```
src/app/
  App.tsx              Role routing only — picks LandingPage/BoardPortal/ApproverPortal/HODPortal
                       and wires useCatalog's state/actions into whichever is active, binding
                       each role's identity (CURRENT_BOARD_MEMBER/CURRENT_DGO/CURRENT_HOD); no UI
                       of its own
  types.ts             DataItem · Entity · SubjectArea · ChangeRequest (batchId-grouped,
                       type create|edit|delete, stage dgo|hod) · Comment
  BoardPortal.tsx      Board Member: Catalog (tree/table, editable via Create/Edit header
                       buttons + per-record Edit/Delete in EntityModal/DataItemModal) +
                       My Requests (list of BoardRequestCards → SubmissionDetailView, filtered
                       All/Pending/Approved/Rejected). Owns its own header/tabs/modal state.
  ApproverPortal.tsx   The DGO portal (file name kept for history) — STAGE 1 review. THREE
                       tabs: Catalog (tree/table, ALSO editable — a DGO can create/edit/delete
                       too, routed to "another DGO" via self-approval-prevention filtering),
                       My Requests (the DGO's own submissions — mirrors BoardPortal's My
                       Requests, since a DGO is a requester too), and Review Requests (list of
                       SubmissionCards → SubmissionDetailView w/ "Validate Fields" /
                       FocusModeView; filters, bulk, focus). Approving in Review Requests
                       forwards to HOD, doesn't commit.
  HODPortal.tsx        The HOD portal — STAGE 2, FINAL review. Catalog is READ-ONLY (no
                       create/edit/delete). Requests tab only ever shows submissions where a DGO
                       has already approved (`dgoReviewedBy` set); SubmissionCards show
                       `showDgoReviewer`; SubmissionDetailView/FocusModeView render with
                       `disableItemComments` (no per-item commenting, generic comment still
                       works) and no Validate button. Approving here commits to the catalog.
  LandingPage.tsx      Role picker (Board Member / DGO / HOD)
  hooks/
    useCatalog.ts      The engine: state + commit/submit (create/edit/**delete**, each taking an
                       explicit submittedBy) + approveDgo(batchId,name)/approveHod(batchId,name)/
                       reject(batchId,reason,name)/reviseAndResubmit/withdraw + comment state
                       (itemComments, batchComments — addItemComment/addBatchComment take an
                       explicit author param)
  lib/                 Framework-free shared logic (single sources of truth):
    catalog.ts         flatten/count/find helpers + computeChangedFields
    submissions.ts      groupRequestsByBatch → Submission (one request = one batchId; carries
                       stage, dgoReviewedBy/dgoReviewedAt, reviewedBy/reviewedAt)
    requestGroups.ts    groupRequestsBySubjectArea → EntityBlock (entity ↔ child data items,
                       used WITHIN one request's table, not across the whole queue)
    validation.ts       getSoftWarnings/getSubmissionWarnings — ADVISORY-only field warnings
                       surfaced by the DGO's "Validate Fields" button (distinct from the HARD
                       REQUIRED_RECORD_FIELDS check in fieldSchema.ts)
    badges.tsx         semantic color helpers + Classification/Sensitivity/Key/Operation
                       (create|edit|delete) badges
    fieldSchema.ts     RECORD_FIELDS (the canonical field list, with `kind`/`options` editing
                       metadata) + REQUIRED_RECORD_FIELDS + fieldInputValue/parseFieldInput
                       (typed value ↔ form-control string helpers, used by the revise-and-resubmit
                       table)
    format.ts          formatValue · isEmptyValue · formatSubmittedAt
    constants.ts       option lists (DATA_TYPES, CLASSIFICATIONS, …) + CURRENT_BOARD_MEMBER,
                       CURRENT_DGO, CURRENT_HOD
    exportCsv.ts       buildSubmissionCsv + downloadTextFile — client-side CSV export for the
                       Board Member's "Export" button (UI only, no backend); flattens each
                       comment thread into one cell, one entry per line
  data/                mockData.ts (catalog) · initialRequests.ts (seed queue + demo data,
                       grouped into 6 demo batchIds, every item seeded at stage 'dgo')
  components/
    SubmissionCard.tsx      One request = one card (requester · time · operation badges · status,
                            optionally `showDgoReviewer` for the HOD queue); the Requests-tab
                            list. Click → SubmissionDetailView.
    SubmissionDetailView.tsx Full request view: header (operation badges next to the
                            status badge, dgoReviewedBy line when present, no separate per-row
                            Operation/Status columns) + Approve/Reject (whole request, custom
                            `approveLabel`) + optional "Validate Fields" button (`onValidate`) +
                            generic comment + HierarchyRequestTable scoped to that batch
                            (`disableItemComments` forces its per-row comments read-only for
                            HOD). Also reused read-only by the Board Member's My Requests
                            (comments shown but not editable, reviewer/timestamp shown once
                            resolved); Export appears for pending/rejected requests only, not
                            approved ones; Edit & Resubmit appears only when rejected (opens
                            ReviseSubmissionView); Withdraw appears only when pending.
    ReviseSubmissionView.tsx Board Member only, rejected requests only: the editable
                            counterpart to SubmissionDetailView — same header/rejection-
                            reason/generic-comment layout, but EditableHierarchyRequestTable
                            instead of the read-only table. Validates required fields
                            client-side before calling useCatalog.reviseAndResubmit, which
                            resubmits under the SAME request/batch ids (so comment threads
                            carry over) with status flipped back to 'pending' and stage reset
                            to 'dgo'.
    BoardRequestCard.tsx    Board Member's request-list card — operation badge(s),
                            status, and (once resolved) reviewer name + timestamp only.
                            No Withdraw action here — that only lives in
                            SubmissionDetailView (click into the request first).
    FocusModeView.tsx   One-request-at-a-time review mode (keyboard-driven), wraps
                        SubmissionDetailView in next/prev/skip/exit chrome; takes optional
                        `approveLabel`/`disableItemComments` to pass through to
                        SubmissionDetailView for the DGO/HOD variants
    TreeView/TableView/SearchBar
    modals/            EntityModal, DataItemModal (both take an optional `onDeleteRequest` —
                       renders a red "Delete" button next to Edit when present, !readOnly),
                       AdvancedSearchModal, CreateModal, EditModal, ValidateFieldsModal (DGO's
                       soft-warning panel, see lib/validation.ts),
                       RequestDetailModal (single-record diff modal opened by clicking any row
                       in the Excel table — changed fields show old struck-through → new
                       highlighted, same look a create's "all new" gets, also used for delete
                       requests which default to Full View with the toggle hidden; an
                       unchanged-entity context row instead opens the plain EntityModal)
    shared/            Cross-component pieces: DiffGrid (+getRequestDiff), RejectDialog,
                       WithdrawDialog (board/DGO's withdraw confirmation — no reason needed,
                       unlike RejectDialog), DeleteConfirmDialog (confirms a delete REQUEST, not
                       an immediate delete — used from EntityModal/DataItemModal's Delete
                       button), HierarchyRequestTable (Excel-style table, no per-row
                       approve — Comments column instead, `readOnly` controls just that
                       column's input, `hideComments` removes the WHOLE column — header + cells
                       — used by the HOD view), EditableHierarchyRequestTable (same layout, live
                       input/select/textarea cells driven by fieldSchema's `kind`/`options` —
                       used only by ReviseSubmissionView), CommentThread (a comment list +
                       add-input, reused by both the generic and per-row threads, compact or
                       roomy), ExcelDropzone (+useExcelImport), MetaCell
    ui/                Modal/ModalHeader, Field (Text/Select/TextArea), Segmented,
                       + shadcn primitives (alert-dialog, button, textarea, label, utils)
```

## Approval workflow (the non-obvious domain logic)

Reviewers act on a whole **request** at a time — never on an individual entity or
data item inside it. A request is every `ChangeRequest` sharing one `batchId`
(see `lib/submissions.ts` → `Submission`). Operations are **create / edit / delete**
(`OperationBadge` in `lib/badges.tsx` already covers all three — green Plus, purple
Pencil, red Trash2).

**Two-stage pipeline (DGO → HOD):** every request starts at `stage: 'dgo'`. A DGO's
approval (`useCatalog.approveDgo`) does NOT touch the catalog — it just flips
`stage` to `'hod'` and stamps `dgoReviewedBy`/`dgoReviewedAt`. Only an HOD's approval
(`useCatalog.approveHod`) actually commits the request's data into `subjectAreas`.
A rejection (`useCatalog.reject`) can happen at EITHER stage and is terminal until
the board member revises and resubmits, which resets `stage` back to `'dgo'` and
clears `dgoReviewedBy`/`dgoReviewedAt` — a revised request needs a fresh DGO look,
not a free pass straight to HOD.

**Self-approval prevention:** both board members AND DGOs can submit create/edit/
delete requests from the Catalog tab (Edit/Delete live in `EntityModal`/`DataItemModal`'s
detail view — see `onDeleteRequest`; Create/Edit also have their own header buttons,
mirrored from `BoardPortal` into `ApproverPortal`). A DGO must never review their own
request: `ApproverPortal`'s `visibleSubmissions` filters out any submission where
`submittedBy === CURRENT_DGO` while it's still pending at the `'dgo'` stage — it simply
disappears from that DGO's queue (in a real multi-DGO deployment it would appear in
another DGO's queue instead; this demo only has one DGO session, so it just waits).

**HOD scope:** `HODPortal` only ever shows requests where `dgoReviewedBy` is set —
anything still at the DGO stage isn't theirs yet. HODs cannot create/edit/delete from
the Catalog tab (`EntityModal`/`DataItemModal` are always rendered `readOnly`, no
Create/Edit header buttons). In the Requests view, `SubmissionCard`'s `showDgoReviewer`
prop and `SubmissionDetailView`'s `dgoReviewedBy`/`dgoReviewedAt` line surface BOTH the
original requester and the DGO who approved it — but ONLY for the DGO/HOD portals;
`SubmissionDetailView` gates that line on `!readOnly`, so the Board Member's read-only
view never shows which DGO was involved (they only care about the final HOD outcome,
plus — if rejected — whoever rejected it, DGO or HOD; see the Rejection Reason banner's
`(by {reviewedBy})` suffix, shown in `SubmissionDetailView`/`RequestDetailModal`/
`ReviseSubmissionView` alike). HODs can't see ANY per-item comments at all (not even
read-only) — `SubmissionDetailView`'s `disableItemComments` prop is passed straight
through to `HierarchyRequestTable` as `hideComments`, which removes the whole Comments
column (header + cells) from the table, not just its draft input — while leaving the
generic, whole-request comment box (and Approve/Reject) fully active. A board member's
read-only view is unaffected: it still gets the Comments column (read-only, not hidden),
so they can see every DGO/HOD note on a specific row. HODs don't get a "Validate Fields"
button — that's DGO-only.

**DGO's own "My Requests" tab:** since a DGO can submit create/edit/delete requests just
like a board member, `ApproverPortal` has a THIRD tab — Catalog / My Requests / Review
Requests (renamed from the old single "Requests" tab to disambiguate from "My
Requests") — that mirrors `BoardPortal`'s My Requests almost exactly: `myRequests`
(`requests.filter(r => r.submittedBy === CURRENT_DGO)`) → `groupRequestsByBatch` →
filter pills (All/Pending/Approved/Rejected) → `BoardRequestCard` list →
`SubmissionDetailView` (`readOnly`, with Export/Edit & Resubmit/Withdraw) or
`ReviseSubmissionView` when revising a rejected one. This is where a DGO actually tracks
a request they submitted themselves while it's hidden from their own Review Requests
queue (self-approval prevention) — closing the gap where, before this tab existed, a
DGO's own pending submission had nowhere to be tracked at all. Uses the SAME
`onReviseAndResubmit`/`onWithdraw` hook actions as the board member (both generic,
batchId-based, no submitter-specific logic needed).

**Validate Fields (DGO only):** `SubmissionDetailView`'s `onValidate` prop renders a
"Validate Fields" button next to Approve/Reject (DGO view only) that opens
`ValidateFieldsModal`, listing SOFT warnings (`lib/validation.ts` → `getSoftWarnings`/
`getSubmissionWarnings`) per item — empty description, missing steward/owner, high
classification/sensitivity with no validation rule, etc. These never block anything
(unlike `REQUIRED_RECORD_FIELDS` in `fieldSchema.ts`, which DOES block a board
member's submission) — purely advisory, helping a DGO spot rows worth a closer look
or a comment before forwarding to HOD.

**Comment threads span both stages.** `itemComments`/`batchComments` (keyed by request
id / batchId) are a SINGLE shared store — a DGO's note and an HOD's note live in the
exact same thread, so whichever stage is currently reviewing automatically sees what
the other stage said. `useCatalog.addItemComment`/`addBatchComment` now take an explicit
`author` param (no more hardcoded `CURRENT_APPROVER`) — each portal binds it via `App.tsx`
(`CURRENT_DGO` for ApproverPortal, `CURRENT_HOD` for HODPortal).

**Delete requests** carry `proposedData === originalData` (a snapshot of the record being
removed, no actual "new" value) and `changedFields: []` — the existing diff/table
machinery already renders this correctly with zero special-casing (nothing highlighted,
full current values shown). `RequestDetailModal` treats a delete like a create for
display purposes: defaults to Full View and hides the Full/Changes toggle, since there's
nothing "changed" to isolate. On HOD approval, `commitOne` removes the entity (cascading
its data items, since they're nested inside the entity object) or the single data item.

The Requests tab lists one `SubmissionCard` per batch (requester · submitted time ·
entity/data-item count); clicking it opens `SubmissionDetailView`, which renders the
Excel-style `HierarchyRequestTable` scoped to just that batch, plus a generic comment box
for the whole request and the single Approve/Reject pair that accepts or rejects every
item in the batch together. `HierarchyRequestTable` itself has no per-row approve/reject
— only a per-row **Comments** cell (an approver note tied to one specific entity/data
item, distinct from the request-level generic comment) — which is what `disableItemComments`
turns read-only for HODs.

A `ChangeRequest` has `batchId` (the request it belongs to), `type` (create|edit|delete),
`recordType` (entity|dataitem), `status`, `stage` (dgo|hod), `proposedData`, optional
`originalData` + `changedFields`, `submittedBy`, `rejectionReason`, `dgoReviewedBy`/
`dgoReviewedAt`, `reviewedBy`/`reviewedAt` (whoever FINALLY resolved it), and hierarchy
fields (`parentEntityId`/`parentEntityName` for data items).

- **Approve** is two calls now, not one: `useCatalog.approveDgo(batchId, dgoName)` just
  forwards the request to the HOD stage (stamps `dgoReviewedBy`/`dgoReviewedAt`, flips
  `stage` to `'hod'`) — it touches NO catalog data. `useCatalog.approveHod(batchId, hodName)`
  is what actually commits every pending item in the batch to `subjectAreas` (entities
  before their data items, so a new entity exists before its new columns attach; deletes
  go last) and marks the whole batch `'approved'`. Entity *edits* strip `dataItems`/`id`
  before applying so they don't wipe the entity's existing fields; entity *deletes* remove
  the entity outright (cascading its nested `dataItems`); data-item deletes remove just
  that one item.
- **Reject** (`useCatalog.reject(batchId, reason, reviewerName)`) rejects every pending
  item in the batch with the same reason, regardless of which stage (`'dgo'` or `'hod'`)
  currently owns it — no cascade logic is needed since a new entity and its own new data
  items are normally submitted in the same batch already. The reason is stored only as
  `rejectionReason` on each item (shown as its own red banner in
  `SubmissionDetailView`/`RequestDetailModal`) — it is deliberately NOT appended to the
  generic comment thread, so that thread only ever shows comments someone explicitly
  typed into it.
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
  `stage` reset to `'dgo'`, `dgoReviewedBy`/`dgoReviewedAt`/`rejectionReason`/
  `reviewedBy`/`reviewedAt` all cleared, `submittedAt` bumped to now — so
  `itemComments`/`batchComments` threads carry straight over instead of
  starting fresh, and the request reappears in the DGO's pending queue
  exactly like any other request (the WHOLE pipeline restarts, not just
  the stage it was rejected at).
- **Withdraw** (`useCatalog.withdraw(batchId)`), Board Member (or DGO, for their own
  submission) only, pending requests only: removes every item in the batch from
  `requests` outright — there's no "withdrawn" status to track, the request simply
  disappears from every queue at once, regardless of which stage owned it. Confirmed
  via `WithdrawDialog` (no reason needed, unlike Reject); the button only appears
  inside `SubmissionDetailView`'s header (click into the request first — there's
  deliberately no shortcut from the list card itself). Once a request is approved or
  rejected it can no longer be withdrawn — the action disappears from the UI entirely
  in those states.
- **My Requests filter** (`BoardPortal.tsx`'s `reqFilter`): defaults to **All** (every submission
  the Board Member has made, newest first — `groupRequestsByBatch` already sorts that way), with
  Pending/Approved/Rejected as additional narrowing tabs, same pill-button pattern as the
  DGO/HOD queue filters.
- **Cross-request dependency guard** (`isBatchBlocked`, duplicated identically in
  `ApproverPortal` and `HODPortal`): a request can still contain a data-item create
  whose parent entity is itself a pending create in a *different* request — that other
  request must be approved first. The blocked request's Approve button shows a 🔒 and a
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
  every side AND every stage — a DGO's note and an HOD's note share the exact
  same thread. The rejection reason itself is NOT auto-appended to the generic
  thread — it lives only in `rejectionReason` (its own banner) — so the
  generic thread stays a clean log of comments someone actually typed, not a
  duplicate of the rejection banner. The generic thread is shown to DGO, HOD,
  and (read-only) the board member alike, with the same one-commit-point
  rule as the per-row threads — except for HOD, where the per-row threads are
  forced read-only too (`disableItemComments`) while the generic one stays
  editable. The board member's read-only view shows the same threads
  (`CommentThread` with `readOnly`) with no draft input, and the per-batch
  CSV export flattens every entry.
- **One commit point for comments — no per-comment submit button.**
  `CommentThread` is a controlled component: it renders the thread plus a
  plain draft `<input>`, nothing else — typing only updates a draft value
  held by the PARENT (`SubmissionDetailView`'s `itemDrafts`/`genericDraft`
  props, controlled in turn by `ApproverPortal`/`HODPortal` for the
  single-open-request view or by `FocusModeView` for the keyboard-driven
  queue). A draft is only actually appended to its thread (via
  `onAddItemComment`/`onAddBatchComment`) at the moment Approve is clicked,
  or the Reject dialog is opened — see `flushOpenDrafts`/`flushDrafts` in
  each. This single commit point has to be reachable from BOTH the on-screen
  Approve/Reject buttons AND Focus Mode's `A`/`R` keyboard shortcuts, so the
  keyboard handler's `useEffect` deps deliberately include the draft state
  (see the comment there) — omitting them would re-introduce a
  stale-closure bug where a keystroke isn't flushed.
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
- **Portal headers are deliberately minimal**: just the DictCentral logo/wordmark, the
  Catalog/Requests tab switcher, and a header "Leave" button — no role badge (Board
  Member/DGO/HOD) next to the logo, and no banner under the header explaining the
  approval pipeline. The footer is a plain credit line (`DictCentral · X Portal`) with
  no "Switch role" button — the header's "Leave" button (or, on `BoardPortal`, the
  icon-only logout button) is the only way back to the role picker.
