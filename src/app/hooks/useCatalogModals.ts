// Shared modal-state engine for the catalog detail surfaces every portal
// exposes: EntityModal, DataItemModal, AdvancedSearchModal, and
// RequestDetailModal. Board/DGO portals additionally pass mutation handlers
// (create/edit/delete), which layers in CreateModal/EditModal and the
// delete-confirmation flow; omit them (HOD) and the catalog stays purely
// read-only — EntityModal/DataItemModal's Edit/Delete affordances simply
// never render (no onDeleteRequest, and onUpdate becomes a no-op).
//
// `mode` ('board' | 'dgo') tells CreateModal/EditModal/DeleteConfirmDialog
// which extra, mutually-exclusive section to show: 'board' gets the
// "Reroute to Another HOD" checkbox; 'dgo' gets the compulsory "Staff
// Approver" picker (the one-stage peer-DGO pipeline — see useCatalog).
// Irrelevant for HOD, which never passes mutation handlers and so never
// opens those modals in the first place.
//
// Centralizing this here means BoardPortal, ApproverPortal, and HODPortal no
// longer each hand-roll their own ModalState union + open/close boilerplate
// — they call useCatalogModals() and render <CatalogRecordModals> (see
// components/shared/CatalogRecordModals.tsx) with what it returns.

import { useState } from 'react';
import { SubjectArea, Entity, DataItem, ChangeRequest } from '../types';
import { findEntityById } from '../lib/catalog';
import { RequestOpts } from './useCatalog';

export type CatalogModalState =
  | { type: 'entity'; entity: Entity; subjectArea: SubjectArea; readOnly?: boolean }
  | { type: 'dataItem'; dataItem: DataItem; entity: Entity; subjectArea: SubjectArea; readOnly?: boolean }
  | { type: 'advancedSearch' }
  | { type: 'create' }
  | { type: 'edit' }
  | { type: 'requestDetail'; request: ChangeRequest }
  | null;

export type PendingDelete =
  | { recordType: 'entity'; id: string; name: string; childCount: number }
  | { recordType: 'dataitem'; id: string; name: string }
  | null;

interface MutationHandlers {
  onSubmitCreateEntity?: (subjectAreaId: string, entity: Entity, opts?: RequestOpts) => void;
  onSubmitCreateDataItem?: (entityId: string, dataItem: DataItem, opts?: RequestOpts) => void;
  onSubmitEditEntity?: (entityId: string, updates: Partial<Entity>, opts?: RequestOpts) => void;
  onSubmitEditDataItem?: (dataItemId: string, updates: Partial<DataItem>, opts?: RequestOpts) => void;
  onSubmitDeleteEntity?: (entityId: string, opts?: RequestOpts) => void;
  onSubmitDeleteDataItem?: (dataItemId: string, opts?: RequestOpts) => void;
}

/** Pass no mutation handlers for a read-only portal (HOD); pass all six for one that can
 * create/edit/delete (Board, DGO) — and pass the matching `mode` so the right extra section
 * (reroute vs staff-approver) shows up in the modals. */
export function useCatalogModals(subjectAreas: SubjectArea[], mutations: MutationHandlers = {}, mode: 'board' | 'dgo' = 'board') {
  const [modal, setModal] = useState<CatalogModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const closeModal = () => setModal(null);

  const openEntity = (entity: Entity, subjectArea: SubjectArea, readOnly?: boolean) =>
    setModal({ type: 'entity', entity, subjectArea, readOnly });
  const openDataItem = (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea, readOnly?: boolean) =>
    setModal({ type: 'dataItem', dataItem, entity, subjectArea, readOnly });
  /** A "my requests" / review-table context row only carries the Entity, not its SubjectArea
   * (it represents an unchanged parent, not a request) — resolve it, then open. Review
   * queues (DGO) pass no `readOnly` so the entity stays editable; "My Requests" history
   * views pass `readOnly: true`. */
  const openEntityById = (entity: Entity, readOnly?: boolean) => {
    const found = findEntityById(subjectAreas, entity.id);
    if (found) openEntity(found.entity, found.subjectArea, readOnly);
  };
  const openAdvancedSearch = () => setModal({ type: 'advancedSearch' });
  const openRequestDetail = (request: ChangeRequest) => setModal({ type: 'requestDetail', request });
  const openCreateModal = () => setModal({ type: 'create' });
  const openEditModal = () => setModal({ type: 'edit' });

  const handleCreateEntity = (subjectAreaId: string, entity: Entity, opts?: RequestOpts) => {
    mutations.onSubmitCreateEntity?.(subjectAreaId, entity, opts);
    closeModal();
  };
  const handleCreateDataItem = (entityId: string, dataItem: DataItem, opts?: RequestOpts) => {
    mutations.onSubmitCreateDataItem?.(entityId, dataItem, opts);
    closeModal();
  };
  const handleEditEntity = (entityId: string, updates: Partial<Entity>, opts?: RequestOpts) => {
    mutations.onSubmitEditEntity?.(entityId, updates, opts);
    closeModal();
  };
  const handleEditDataItem = (dataItemId: string, updates: Partial<DataItem>, opts?: RequestOpts) => {
    mutations.onSubmitEditDataItem?.(dataItemId, updates, opts);
    closeModal();
  };

  const requestDeleteEntity = (entity: Entity) =>
    setPendingDelete({ recordType: 'entity', id: entity.id, name: entity.name, childCount: entity.dataItems.length });
  const requestDeleteDataItem = (dataItem: DataItem) =>
    setPendingDelete({ recordType: 'dataitem', id: dataItem.id, name: dataItem.name });
  const cancelDelete = () => setPendingDelete(null);
  const confirmDelete = (opts?: RequestOpts) => {
    if (!pendingDelete) return;
    if (pendingDelete.recordType === 'entity') mutations.onSubmitDeleteEntity?.(pendingDelete.id, opts);
    else mutations.onSubmitDeleteDataItem?.(pendingDelete.id, opts);
    setPendingDelete(null);
    closeModal();
  };

  return {
    modal, closeModal, mode,
    openEntity, openDataItem, openEntityById, openAdvancedSearch, openRequestDetail,
    openCreateModal, openEditModal,
    handleCreateEntity, handleCreateDataItem, handleEditEntity, handleEditDataItem,
    pendingDelete, requestDeleteEntity, requestDeleteDataItem, cancelDelete, confirmDelete,
  };
}

export type CatalogModals = ReturnType<typeof useCatalogModals>;
