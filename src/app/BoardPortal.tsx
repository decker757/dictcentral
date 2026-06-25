// The Board Member portal: Catalog browse (tree/table, editable via the
// shared CatalogBrowser/useCatalogModals) + My Requests (the member's own
// submissions — see hooks/useMyRequests + components/MyRequestsPanel, also
// reused by ApproverPortal since a DGO is a requester too). This file is
// now just composition: header/footer/catalog/my-requests are all shared
// components, so the only board-specific code left is which tab is active
// and the header's stats/action buttons.

import { useState } from 'react';
import { Plus, Edit2, LogOut, ClipboardList } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment, RecordAttributes } from './types';
import { PortalHeader, PortalHeaderTab } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { CatalogBrowser } from './components/CatalogBrowser';
import { MyRequestsPanel } from './components/MyRequestsPanel';
import { CatalogRecordModals } from './components/shared/CatalogRecordModals';
import { useCatalogModals } from './hooks/useCatalogModals';
import { useMyRequests } from './hooks/useMyRequests';
import { countEntities, countDataItems } from './lib/catalog';
import { CURRENT_BOARD_MEMBER } from './lib/constants';

type BoardTab = 'catalog' | 'myRequests';

interface BoardPortalProps {
  subjectAreas: SubjectArea[];
  requests: ChangeRequest[];
  onSubmitCreateEntity: (subjectAreaId: string, entity: Entity) => void;
  onSubmitCreateDataItem: (entityId: string, dataItem: DataItem) => void;
  onSubmitEditEntity: (entityId: string, updates: Partial<Entity>) => void;
  onSubmitEditDataItem: (dataItemId: string, updates: Partial<DataItem>) => void;
  onSubmitDeleteEntity: (entityId: string) => void;
  onSubmitDeleteDataItem: (dataItemId: string) => void;
  onReviseAndResubmit: (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => void;
  onWithdraw: (batchId: string) => void;
  onLeave: () => void;
  itemComments: Record<string, Comment[]>;
  batchComments: Record<string, Comment[]>;
}

export function BoardPortal({
  subjectAreas, requests,
  onSubmitCreateEntity, onSubmitCreateDataItem, onSubmitEditEntity, onSubmitEditDataItem,
  onSubmitDeleteEntity, onSubmitDeleteDataItem,
  onReviseAndResubmit, onWithdraw, onLeave, itemComments, batchComments,
}: BoardPortalProps) {
  const [tab, setTab] = useState<BoardTab>('catalog');

  const modals = useCatalogModals(subjectAreas, {
    onSubmitCreateEntity, onSubmitCreateDataItem, onSubmitEditEntity, onSubmitEditDataItem,
    onSubmitDeleteEntity, onSubmitDeleteDataItem,
  });

  const myRequests = useMyRequests({
    requests, submittedBy: CURRENT_BOARD_MEMBER, itemComments, batchComments,
    onReviseAndResubmit, onWithdraw,
  });

  const totalEntities = countEntities(subjectAreas);
  const totalDataItems = countDataItems(subjectAreas);

  const tabs: PortalHeaderTab<BoardTab>[] = [
    { key: 'catalog', label: 'Catalog' },
    {
      key: 'myRequests', label: 'My Requests', icon: <ClipboardList className="w-3.5 h-3.5" />,
      badge: { count: myRequests.pendingCount, variant: 'inline' },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalHeader
        activeTab={tab}
        onTabChange={setTab}
        tabs={tabs}
        actions={
          <>
            <div className="hidden xl:flex items-center gap-4 text-xs text-gray-500 mr-1">
              <span><span className="font-semibold text-gray-800">{subjectAreas.length}</span> Areas</span>
              <span><span className="font-semibold text-gray-800">{totalEntities}</span> Entities</span>
              <span><span className="font-semibold text-gray-800">{totalDataItems}</span> Data Items</span>
            </div>
            <button
              onClick={modals.openEditModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-orange-500" /> Edit
            </button>
            <button
              onClick={modals.openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create
            </button>
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Switch role"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        }
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {tab === 'catalog' && (
          <CatalogBrowser
            subjectAreas={subjectAreas}
            onEntityClick={modals.openEntity}
            onDataItemClick={modals.openDataItem}
            onAdvancedSearch={modals.openAdvancedSearch}
          />
        )}

        {tab === 'myRequests' && (
          <MyRequestsPanel
            subjectAreas={subjectAreas}
            myRequests={myRequests}
            itemComments={itemComments}
            batchComments={batchComments}
            onEntityClick={entity => modals.openEntityById(entity, true)}
            onRowClick={modals.openRequestDetail}
          />
        )}
      </main>

      <PortalFooter label="Board Member Portal" />

      <CatalogRecordModals subjectAreas={subjectAreas} modals={modals} />
    </div>
  );
}
