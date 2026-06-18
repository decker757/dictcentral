# DictCentral

An enterprise **data‑dictionary / data‑catalog** web app with a lightweight **change‑request
approval workflow**. It runs entirely in the browser on mock data — there is **no backend**.

## What it does

The app catalogs **Subject Areas → Entities → Data Items** (e.g. _Housing → Property Records →
`parcel_id`_) and gates every change behind review. There are two roles, chosen on the landing page:

- **Board Member** — browses the catalog and **submits create/edit requests** for entities and
  data items. Submissions don't go live immediately; they enter an approval queue.
- **Approver** — **reviews, approves, or rejects** those requests. Approvals commit to the catalog
  (with an **Undo** toast); rejections require a reason.

Notable workflow behavior:

- **Cascade reject** — rejecting a brand‑new entity also rejects its pending child data‑item
  requests, so no orphans are left behind.
- **Orphan guard** — a data item that belongs to a not‑yet‑approved new entity can't be approved
  until its parent is (its Approve button shows a 🔒).
- **Focus mode** — a keyboard‑driven, one‑request‑at‑a‑time review queue
  (`A` approve · `R` reject · `S`/`→` skip · `←` prev · `Esc` exit).
- Browse via **Tree view** or sortable **Table view**, plus **Advanced Search** across data‑item
  attributes.

> All state is in memory (`src/app/data/`). Reloading the page resets everything — this is a demo/
> prototype, not a persisted system.

## Tech stack

- **React 18** + **Vite 6** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens in `src/styles/theme.css`)
- **Radix UI** primitives · **sonner** (toasts) · **lucide-react** (icons) · **motion** (animation)

## Setup

**Prerequisites:** Node.js **18+** (Vite 6) and npm.

```bash
npm install        # install dependencies
npm run dev        # start the dev server → http://localhost:5173
```

Then open http://localhost:5173 and pick a role to explore.

### Other commands

```bash
npm run build      # production build → dist/   (the source of truth for "does it compile")
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit
```

- **`npm run build` is the gate.** It catches real errors (imports, syntax, JSX).
- **`npm run typecheck` reports a set of pre‑existing strict errors that are harmless at runtime**
  — they're all in `src/app/data/mockData.ts` (`defaultValue: null` where the type says `string`).
  esbuild strips types, so the app runs fine. Any typecheck error _outside_ `mockData.ts` is real.

## Project structure

```
src/app/
  App.tsx              Role routing + composition (consumes the useCatalog hook)
  ApproverPortal.tsx   Approver portal: browse + request queue (filters, grouping, bulk, focus)
  LandingPage.tsx      Role picker
  hooks/useCatalog.ts  The engine: catalog/request state + approve/reject/submit/undo
  lib/                 Framework-free shared logic (catalog helpers, semantic-color badges,
                       field schema, formatting, constants)
  components/
    RequestCard · FocusModeView · TreeView · TableView · SearchBar
    modals/            Entity/DataItem/AdvancedSearch/Create/Edit modals
    shared/            DiffGrid · RejectDialog · ExcelDropzone · MetaCell
    ui/                Modal · Field · Segmented + shadcn primitives
  data/                mockData.ts (seed catalog) · initialRequests.ts (seed queue)
```

See [`CLAUDE.md`](./CLAUDE.md) for the deeper architecture notes and the design‑system conventions.

## Origin

This is a **local mirror of a Figma Make file** (key `gfOwAIkpJCF8DsFZyyhfNI`), pulled out of Make.
Edits here do **not** sync back to Figma Make (it's one‑way). To push changes back into Make, you'd
need to wire up GitHub sync.
