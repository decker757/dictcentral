// The catalog + change-request "engine": owns the in-memory state and every
// mutation (board submissions, approver approve/reject, and undo). Extracted
// from App.tsx so the App component is just routing + composition (SRP).

import { useState } from 'react';
import { toast } from 'sonner';
import { SubjectArea, Entity, DataItem, ChangeRequest } from '../types';
import { mockSubjectAreas } from '../data/mockData';
import { initialRequests } from '../data/initialRequests';
import { computeChangedFields, findEntityById, findDataItemById } from '../lib/catalog';
import { CURRENT_BOARD_MEMBER } from '../lib/constants';

let reqCounter = 100;
const nextReqId = () => `req-${++reqCounter}`;

export function useCatalog() {
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>(mockSubjectAreas);
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests);

  // ── Committed data mutations (applied on approval) ──────────────
  const commitAddEntity = (subjectAreaId: string, entity: Entity) =>
    setSubjectAreas(prev => prev.map(sa =>
      sa.id === subjectAreaId
        ? { ...sa, entities: [...sa.entities, entity], entityCount: sa.entityCount + 1 }
        : sa
    ));

  const commitAddDataItem = (entityId: string, dataItem: DataItem) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e =>
        e.id === entityId ? { ...e, dataItems: [...e.dataItems, dataItem] } : e
      ),
    })));

  const commitUpdateEntity = (entityId: string, updates: Partial<Entity>) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e => e.id === entityId ? { ...e, ...updates } : e),
    })));

  const commitUpdateDataItem = (dataItemId: string, updates: Partial<DataItem>) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e => ({
        ...e,
        dataItems: e.dataItems.map(di => di.id === dataItemId ? { ...di, ...updates } : di),
      })),
    })));

  // ── Board member submissions (queue a request, never write directly) ──
  const queueRequest = (req: Omit<ChangeRequest, 'id' | 'status' | 'submittedAt' | 'submittedBy'>) =>
    setRequests(prev => [...prev, {
      ...req,
      id: nextReqId(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      submittedBy: CURRENT_BOARD_MEMBER,
    }]);

  const submitCreateEntity = (subjectAreaId: string, entity: Entity) => {
    const sa = subjectAreas.find(s => s.id === subjectAreaId);
    if (!sa) return;
    queueRequest({
      type: 'create', recordType: 'entity',
      subjectAreaId, subjectAreaName: sa.name,
      proposedData: entity,
    });
    toast.success('Create request submitted for approval');
  };

  const submitCreateDataItem = (entityId: string, dataItem: DataItem) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    queueRequest({
      type: 'create', recordType: 'dataitem',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: entityId, parentEntityName: found.entity.name,
      proposedData: dataItem,
    });
    toast.success('Create request submitted for approval');
  };

  const submitEditEntity = (entityId: string, updates: Partial<Entity>) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    const original = found.entity;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'entity',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      originalData: { ...original, dataItems: [] } as Entity,
      proposedData: { ...proposed, dataItems: [] } as Entity,
      changedFields,
    });
    toast.success('Edit request submitted for approval');
  };

  const submitEditDataItem = (dataItemId: string, updates: Partial<DataItem>) => {
    const found = findDataItemById(subjectAreas, dataItemId);
    if (!found) return;
    const original = found.dataItem;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'dataitem',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: found.entity.id, parentEntityName: found.entity.name,
      originalData: original,
      proposedData: proposed,
      changedFields,
    });
    toast.success('Edit request submitted for approval');
  };

  // ── Approver actions ────────────────────────────────────────────
  const undoApprove = (req: ChangeRequest) => {
    if (req.type === 'create' && req.recordType === 'entity') {
      setSubjectAreas(prev => prev.map(sa =>
        sa.id === req.subjectAreaId
          ? { ...sa, entities: sa.entities.filter(e => e.id !== req.proposedData.id), entityCount: Math.max(0, sa.entityCount - 1) }
          : sa
      ));
    } else if (req.type === 'create' && req.recordType === 'dataitem') {
      setSubjectAreas(prev => prev.map(sa => ({
        ...sa,
        entities: sa.entities.map(e =>
          e.id === req.parentEntityId
            ? { ...e, dataItems: e.dataItems.filter(di => di.id !== req.proposedData.id) }
            : e
        ),
      })));
    } else if (req.type === 'edit' && req.originalData) {
      if (req.recordType === 'entity') {
        // Restore prior metadata WITHOUT clobbering the entity's real dataItems.
        const { dataItems, id, ...rest } = req.originalData as Entity;
        void dataItems;
        commitUpdateEntity(id, rest);
      } else {
        const { id, ...rest } = req.originalData as DataItem;
        commitUpdateDataItem(id, rest);
      }
    }
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'pending' as const, rejectionReason: undefined } : r));
  };

  const approve = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    if (req.type === 'create' && req.recordType === 'entity') {
      commitAddEntity(req.subjectAreaId, req.proposedData as Entity);
    } else if (req.type === 'create' && req.recordType === 'dataitem') {
      commitAddDataItem(req.parentEntityId!, req.proposedData as DataItem);
    } else if (req.type === 'edit' && req.recordType === 'entity') {
      // Preserve existing dataItems — proposedData carries an empty dataItems array.
      const { dataItems, id, ...rest } = req.proposedData as Entity;
      void dataItems;
      commitUpdateEntity(id, rest);
    } else if (req.type === 'edit' && req.recordType === 'dataitem') {
      const proposed = req.proposedData as DataItem;
      commitUpdateDataItem(proposed.id, proposed);
    }

    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));

    const name = (req.proposedData as Entity | DataItem).name;
    toast.success(`Approved "${name}"`, {
      action: { label: 'Undo', onClick: () => undoApprove(req) },
    });
  };

  const undoReject = (ids: string[]) =>
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'pending' as const, rejectionReason: undefined } : r));

  const reject = (requestId: string, reason: string) => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    // Cascade: rejecting a new entity also rejects its pending child data-item requests (no orphans).
    const childIds = (targetReq.type === 'create' && targetReq.recordType === 'entity')
      ? requests
          .filter(r => r.status === 'pending' && r.type === 'create' && r.recordType === 'dataitem' && r.parentEntityId === targetReq.proposedData.id)
          .map(r => r.id)
      : [];
    const affectedIds = [requestId, ...childIds];

    setRequests(prev => prev.map(r => {
      if (r.id === requestId) return { ...r, status: 'rejected' as const, rejectionReason: reason };
      if (childIds.includes(r.id)) return { ...r, status: 'rejected' as const, rejectionReason: `Auto-rejected because parent entity was rejected: ${reason}` };
      return r;
    }));

    const name = (targetReq.proposedData as Entity | DataItem).name;
    const extra = childIds.length > 0 ? ` (+${childIds.length} child item${childIds.length !== 1 ? 's' : ''})` : '';
    toast.error(`Rejected "${name}"${extra}`, {
      action: { label: 'Undo', onClick: () => undoReject(affectedIds) },
    });
  };

  return {
    subjectAreas,
    requests,
    submitCreateEntity,
    submitCreateDataItem,
    submitEditEntity,
    submitEditDataItem,
    approve,
    reject,
  };
}
