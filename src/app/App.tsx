// Top-level role router. Picks the role (LandingPage), then renders that
// role's portal as its own self-contained component — BoardPortal,
// ApproverPortal (DGO), and HODPortal each own their own header/tabs/modal
// state, the same way any sibling screens in this app would. App itself
// stays pure routing + wiring useCatalog's state/actions into whichever
// portal is active, binding each role's identity (who's submitting, who's
// commenting, who's reviewing) so the portals themselves never have to think
// about "which person am I" — they just call the prop they were given.

import { useState } from 'react';
import { Toaster } from 'sonner';
import { LandingPage } from './LandingPage';
import { BoardPortal } from './BoardPortal';
import { ApproverPortal } from './ApproverPortal';
import { HODPortal } from './HODPortal';
import { useCatalog } from './hooks/useCatalog';
import { CURRENT_BOARD_MEMBER, CURRENT_DGO, CURRENT_HOD } from './lib/constants';

type Role = 'selection' | 'board' | 'dgo' | 'hod';

export default function App() {
  const [role, setRole] = useState<Role>('selection');
  const {
    subjectAreas, requests,
    submitCreateEntity, submitCreateDataItem, submitEditEntity, submitEditDataItem,
    submitDeleteEntity, submitDeleteDataItem,
    approveDgo, approveHod, reject, reviseAndResubmit, withdraw, rerouteToHod,
    itemComments, addItemComment, batchComments, addBatchComment,
  } = useCatalog();

  if (role === 'selection') {
    return <LandingPage onSelectRole={r => setRole(r)} />;
  }

  return (
    <>
      {role === 'board' && (
        <BoardPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onSubmitCreateEntity={(saId, e, opts) => submitCreateEntity(saId, e, CURRENT_BOARD_MEMBER, opts)}
          onSubmitCreateDataItem={(eId, di, opts) => submitCreateDataItem(eId, di, CURRENT_BOARD_MEMBER, opts)}
          onSubmitEditEntity={(eId, u, opts) => submitEditEntity(eId, u, CURRENT_BOARD_MEMBER, opts)}
          onSubmitEditDataItem={(diId, u, opts) => submitEditDataItem(diId, u, CURRENT_BOARD_MEMBER, opts)}
          onSubmitDeleteEntity={(eId, opts) => submitDeleteEntity(eId, CURRENT_BOARD_MEMBER, opts)}
          onSubmitDeleteDataItem={(diId, opts) => submitDeleteDataItem(diId, CURRENT_BOARD_MEMBER, opts)}
          onReviseAndResubmit={reviseAndResubmit}
          onWithdraw={withdraw}
          onReroute={(batchId, hodName, comment) => rerouteToHod(batchId, hodName, comment, CURRENT_BOARD_MEMBER)}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          batchComments={batchComments}
        />
      )}
      {role === 'dgo' && (
        <ApproverPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onApproveDgo={batchId => approveDgo(batchId, CURRENT_DGO)}
          onReject={(batchId, reason) => reject(batchId, reason, CURRENT_DGO)}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          onAddItemComment={(requestId, text) => addItemComment(requestId, text, CURRENT_DGO)}
          batchComments={batchComments}
          onAddBatchComment={(batchId, text) => addBatchComment(batchId, text, CURRENT_DGO)}
          onSubmitCreateEntity={(saId, e, opts) => submitCreateEntity(saId, e, CURRENT_DGO, opts)}
          onSubmitCreateDataItem={(eId, di, opts) => submitCreateDataItem(eId, di, CURRENT_DGO, opts)}
          onSubmitEditEntity={(eId, u, opts) => submitEditEntity(eId, u, CURRENT_DGO, opts)}
          onSubmitEditDataItem={(diId, u, opts) => submitEditDataItem(diId, u, CURRENT_DGO, opts)}
          onSubmitDeleteEntity={(eId, opts) => submitDeleteEntity(eId, CURRENT_DGO, opts)}
          onSubmitDeleteDataItem={(diId, opts) => submitDeleteDataItem(diId, CURRENT_DGO, opts)}
          onReviseAndResubmit={reviseAndResubmit}
          onWithdraw={withdraw}
        />
      )}
      {role === 'hod' && (
        <HODPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onApproveHod={batchId => approveHod(batchId, CURRENT_HOD)}
          onReject={(batchId, reason) => reject(batchId, reason, CURRENT_HOD)}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          batchComments={batchComments}
          onAddBatchComment={(batchId, text) => addBatchComment(batchId, text, CURRENT_HOD)}
        />
      )}
      <Toaster richColors position="bottom-right" />
    </>
  );
}
