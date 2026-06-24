// Top-level role router. Picks the role (LandingPage), then renders that
// role's portal as its own self-contained component — BoardPortal and
// ApproverPortal each own their own header/tabs/modal state, the same way
// any two sibling screens in this app would. App itself stays pure routing +
// wiring useCatalog's state/actions into whichever portal is active; it has
// no UI or business logic of its own.

import { useState } from 'react';
import { Toaster } from 'sonner';
import { LandingPage } from './LandingPage';
import { BoardPortal } from './BoardPortal';
import { ApproverPortal } from './ApproverPortal';
import { useCatalog } from './hooks/useCatalog';

type Role = 'selection' | 'board' | 'approver';

export default function App() {
  const [role, setRole] = useState<Role>('selection');
  const {
    subjectAreas, requests,
    submitCreateEntity, submitCreateDataItem, submitEditEntity, submitEditDataItem,
    approve, reject, reviseAndResubmit, withdraw,
    itemComments, addItemComment, batchComments, addBatchComment,
  } = useCatalog();

  if (role === 'selection') {
    return <LandingPage onSelectRole={r => setRole(r)} />;
  }

  return (
    <>
      {role === 'board' ? (
        <BoardPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onSubmitCreateEntity={submitCreateEntity}
          onSubmitCreateDataItem={submitCreateDataItem}
          onSubmitEditEntity={submitEditEntity}
          onSubmitEditDataItem={submitEditDataItem}
          onReviseAndResubmit={reviseAndResubmit}
          onWithdraw={withdraw}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          batchComments={batchComments}
        />
      ) : (
        <ApproverPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onApprove={approve}
          onReject={reject}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          onAddItemComment={addItemComment}
          batchComments={batchComments}
          onAddBatchComment={addBatchComment}
        />
      )}
      <Toaster richColors position="bottom-right" />
    </>
  );
}
