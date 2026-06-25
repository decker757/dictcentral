// Renders the shared set of catalog detail modals — EntityModal,
// DataItemModal, AdvancedSearchModal, CreateModal, EditModal,
// RequestDetailModal, and the delete-confirmation dialog — driven entirely
// by the state from useCatalogModals(). Used identically by BoardPortal,
// ApproverPortal, and HODPortal so none of them hand-roll this ~80-line
// modal switchboard themselves; the only difference between portals is
// which mutation handlers (if any) were passed into the hook — CreateModal/
// EditModal simply never get a `modal.type` to match if the portal never
// opens them (HOD has no Create/Edit buttons), and a read-only `modal`
// entry disables Edit/Delete inside EntityModal/DataItemModal automatically.

import { SubjectArea } from '../../types';
import { EntityModal } from '../modals/EntityModal';
import { DataItemModal } from '../modals/DataItemModal';
import { AdvancedSearchModal } from '../modals/AdvancedSearchModal';
import { CreateModal } from '../modals/CreateModal';
import { EditModal } from '../modals/EditModal';
import { RequestDetailModal } from '../modals/RequestDetailModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CatalogModals } from '../../hooks/useCatalogModals';

interface CatalogRecordModalsProps {
  subjectAreas: SubjectArea[];
  /** Pre-fills AdvancedSearchModal's Business Name filter from whatever's currently typed
   * into the catalog's quick-search box, if anything. */
  searchQuery?: string;
  modals: CatalogModals;
}

export function CatalogRecordModals({ subjectAreas, searchQuery, modals }: CatalogRecordModalsProps) {
  const {
    modal, closeModal,
    openEntity, openDataItem,
    handleCreateEntity, handleCreateDataItem, handleEditEntity, handleEditDataItem,
    pendingDelete, requestDeleteEntity, requestDeleteDataItem, cancelDelete, confirmDelete,
  } = modals;

  return (
    <>
      {modal?.type === 'entity' && (
        <EntityModal
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={closeModal}
          onDataItemClick={(di, e, sa) => openDataItem(di, e, sa, modal.readOnly)}
          onUpdate={modal.readOnly ? () => {} : handleEditEntity}
          onDeleteRequest={modal.readOnly ? undefined : () => requestDeleteEntity(modal.entity)}
          readOnly={modal.readOnly}
        />
      )}
      {modal?.type === 'dataItem' && (
        <DataItemModal
          dataItem={modal.dataItem}
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={closeModal}
          onEntityClick={(e, sa) => openEntity(e, sa, modal.readOnly)}
          onUpdate={modal.readOnly ? () => {} : handleEditDataItem}
          onDeleteRequest={modal.readOnly ? undefined : () => requestDeleteDataItem(modal.dataItem)}
          readOnly={modal.readOnly}
        />
      )}
      {modal?.type === 'advancedSearch' && (
        <AdvancedSearchModal
          subjectAreas={subjectAreas}
          onClose={closeModal}
          onDataItemClick={(di, e, sa) => { closeModal(); setTimeout(() => openDataItem(di, e, sa), 50); }}
          onEntityClick={(e, sa) => { closeModal(); setTimeout(() => openEntity(e, sa), 50); }}
          initialFilters={searchQuery ? { businessName: searchQuery } : undefined}
        />
      )}
      {modal?.type === 'create' && (
        <CreateModal
          subjectAreas={subjectAreas}
          onClose={closeModal}
          onCreateEntity={handleCreateEntity}
          onCreateDataItem={handleCreateDataItem}
        />
      )}
      {modal?.type === 'edit' && (
        <EditModal
          subjectAreas={subjectAreas}
          onClose={closeModal}
          onUpdateEntity={handleEditEntity}
          onUpdateDataItem={handleEditDataItem}
        />
      )}
      {modal?.type === 'requestDetail' && (
        <RequestDetailModal request={modal.request} onClose={closeModal} />
      )}

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        recordName={pendingDelete?.name}
        recordType={pendingDelete?.recordType}
        childCount={pendingDelete?.recordType === 'entity' ? pendingDelete.childCount : undefined}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
