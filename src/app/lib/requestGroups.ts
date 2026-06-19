// Grouping for the change-request lists, shared by the approver queue and the
// board member's "My Requests". Pure data shaping — no rendering.

import { ChangeRequest } from '../types';

// A block groups data-item requests under their entity. The entity is either a
// request itself (create/edit) or an existing entity shown as a context header.
export type EntityBlock =
  | { kind: 'entityRequest'; request: ChangeRequest; children: ChangeRequest[] }
  | { kind: 'existingEntity'; entityName: string; children: ChangeRequest[] };

export interface SubjectAreaGroup {
  name: string;
  blocks: EntityBlock[];
  total: number;
  pendingCount: number;
}

// Group by subject area → then by entity. Every data item nests under its entity:
// either an entity request (actionable) or an existing-entity context header.
export function groupRequestsBySubjectArea(requests: ChangeRequest[]): SubjectAreaGroup[] {
  const saOrder: string[] = [];
  const saMap = new Map<string, ChangeRequest[]>();
  for (const r of requests) {
    if (!saMap.has(r.subjectAreaName)) { saMap.set(r.subjectAreaName, []); saOrder.push(r.subjectAreaName); }
    saMap.get(r.subjectAreaName)!.push(r);
  }

  return saOrder.map(saName => {
    const reqs = saMap.get(saName)!;
    const entityReqs = reqs.filter(r => r.recordType === 'entity');
    const dataReqs = reqs.filter(r => r.recordType === 'dataitem');
    const blocks: EntityBlock[] = [];
    const consumed = new Set<string>();

    // Entity requests with their child data-item requests
    for (const er of entityReqs) {
      const children = dataReqs.filter(d => d.parentEntityId === er.proposedData.id);
      children.forEach(c => consumed.add(c.id));
      blocks.push({ kind: 'entityRequest', request: er, children });
    }

    // Remaining data items belong to existing (unchanged) entities → context header
    const existingOrder: string[] = [];
    const existingMap = new Map<string, ChangeRequest[]>();
    for (const d of dataReqs) {
      if (consumed.has(d.id)) continue;
      const key = d.parentEntityName || 'Unassigned';
      if (!existingMap.has(key)) { existingMap.set(key, []); existingOrder.push(key); }
      existingMap.get(key)!.push(d);
    }
    for (const key of existingOrder) {
      blocks.push({ kind: 'existingEntity', entityName: key, children: existingMap.get(key)! });
    }

    return { name: saName, blocks, total: reqs.length, pendingCount: reqs.filter(r => r.status === 'pending').length };
  });
}
