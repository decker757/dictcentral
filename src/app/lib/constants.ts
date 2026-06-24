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

// The approver acting in this in-memory demo (no auth backend).
export const CURRENT_APPROVER = 'Morgan Reyes';
