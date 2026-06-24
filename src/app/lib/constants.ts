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
// the FIRST approval stage — they review requests (from board members AND
// from other DGOs) before forwarding them to an HOD. A DGO can never review
// their own submitted request (self-approval prevention) — see
// ApproverPortal's queue filtering.
export const CURRENT_DGO = 'Morgan Reyes';

// The HOD (Head of Department) acting in this in-memory demo. HODs are the
// SECOND and FINAL approval stage — they only ever see requests a DGO has
// already approved, and their approval is what actually commits a request
// to the catalog.
export const CURRENT_HOD = 'Taylor Brooks';
