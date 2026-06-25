// Single source of truth for catalog enums / option lists.
// Previously these literal arrays were re-typed inside every modal & filter.

export const DATA_TYPES = [
  'VARCHAR', 'INTEGER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'TEXT', 'BIGINT', 'FLOAT',
] as const;

export const CLASSIFICATIONS = ['Public', 'Internal', 'Confidential', 'Restricted'] as const;
export const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ENTITY_STATUSES = ['Active', 'Deprecated', 'Archived'] as const;
export const KEY_INDICATORS = ['PK', 'FK', 'UK'] as const;

// The board member acting in this in-memory demo (no auth backend).
export const CURRENT_BOARD_MEMBER = 'Sarah Chen';

// The DGO (Data Governance Officer) acting in this in-memory demo. DGOs are
// the FIRST approval stage for board-submitted requests — they review those
// before forwarding them to an HOD. A DGO can never review their own
// submitted request (self-approval prevention) — see ApproverPortal's queue
// filtering. When a DGO submits their OWN create/edit/delete request, it
// instead follows the one-stage peer-review pipeline (see DGO_DIRECTORY
// below and ChangeRequest.pipeline) — a single named peer DGO approves it
// and that commits it directly, no HOD involved.
export const CURRENT_DGO = 'Morgan Reyes';

// The HOD (Head of Department) acting in this in-memory demo. HODs are the
// SECOND and FINAL approval stage for board-submitted requests — they only
// ever see requests a DGO has already approved, and their approval is what
// actually commits a request to the catalog.
export const CURRENT_HOD = 'Taylor Brooks';

export interface StaffMember {
  name: string;
  /** HODs only — shown next to their name everywhere they're picked from (Staff Approver /
   * Reroute dropdowns), so a board member can tell departments apart. */
  department?: string;
}

// The full DGO roster — used for the "Staff Approver" picker a DGO must fill in when
// submitting their own create/edit/delete request (one-stage peer-review pipeline). Always
// excludes CURRENT_DGO from the picker's options (self-approval is never allowed), even though
// CURRENT_DGO is listed here as a roster member like any other.
export const DGO_DIRECTORY: StaffMember[] = [
  { name: 'Morgan Reyes' },
  { name: 'Priya Anand' },
  { name: 'Jordan Lee' },
  { name: 'Avery Kim' },
];

// The full HOD roster, with department — used for the board member's "Reroute to Another HOD"
// picker (Create/Edit/Delete views, and again from My Requests while a request is pending).
export const HOD_DIRECTORY: StaffMember[] = [
  { name: 'Taylor Brooks', department: 'Finance' },
  { name: 'Casey Morgan', department: 'Operations' },
  { name: 'Riley Chen', department: 'Engineering' },
  { name: 'Jamie Patel', department: 'Compliance' },
];
