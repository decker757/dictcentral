// The list view of a review queue — filter pills, Focus-Mode entry, search/
// type/subject-area filters, select-all, and one SubmissionCard per
// request. Shared by ApproverPortal (DGO) and HODPortal; the only per-role
// variance is whether SubmissionCards show their DGO reviewer
// (`showDgoReviewer`) and the search placeholder copy.

import { Bell, Search, Play, Check } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { SubmissionCard } from './SubmissionCard';
import { ReviewQueue, ReviewFilter, TypeFilter } from '../hooks/useReviewQueue';

interface ReviewQueueListProps {
  queue: ReviewQueue;
  pendingCount: number;
  searchPlaceholder?: string;
  showDgoReviewer?: boolean;
  emptyPendingMessage?: string;
}

export function ReviewQueueList({
  queue, pendingCount, searchPlaceholder, showDgoReviewer, emptyPendingMessage,
}: ReviewQueueListProps) {
  const {
    reqFilter, setReqFilter, listSearch, setListSearch, listTypeFilter, setListTypeFilter,
    listSaFilter, setListSaFilter, subjectAreaNames, filteredSubmissions,
    selectedBatchIds, toggleSelect, toggleSelectAll, allSelected, allDisplayPendingBatchIds,
    orderedPendingBatchIds, enterFocusMode, openDetail,
  } = queue;

  return (
    <>
      {/* Filter pills + Focus Mode entry */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(['pending', 'approved', 'rejected'] as ReviewFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setReqFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                reqFilter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {f}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={enterFocusMode}
          disabled={orderedPendingBatchIds.length === 0}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Play className="w-4 h-4" /> Review Pending
        </button>
      </div>

      {/* Search + type + subject-area filters + select all */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={listSearch}
            onChange={e => setListSearch(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search requests by requester or record name…'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={listTypeFilter}
          onChange={e => setListTypeFilter(e.target.value as TypeFilter)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="all">All types</option>
          <option value="create">Create</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
        </select>
        <select
          value={listSaFilter}
          onChange={e => setListSaFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">All subject areas</option>
          {subjectAreaNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {allDisplayPendingBatchIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <CheckboxPrimitive.Root
              id="select-all-pending"
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            >
              <CheckboxPrimitive.Indicator>
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            <label htmlFor="select-all-pending" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
              Select all {allDisplayPendingBatchIds.length} pending
            </label>
          </div>
        )}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <div className="text-sm font-medium">No matching requests</div>
          <div className="text-xs mt-1">
            {reqFilter === 'pending'
              ? (emptyPendingMessage ?? 'All caught up — no pending requests to review')
              : 'Try adjusting your search or filters'}
          </div>
        </div>
      )}

      {/* One SubmissionCard per request (= per batch) — click to open the full table */}
      <div className="flex flex-col gap-2.5">
        {filteredSubmissions.map(submission => (
          <SubmissionCard
            key={submission.batchId}
            submission={submission}
            onOpen={() => openDetail(submission.batchId)}
            selected={selectedBatchIds.has(submission.batchId)}
            onToggleSelect={() => toggleSelect(submission.batchId)}
            showDgoReviewer={showDgoReviewer}
          />
        ))}
      </div>
    </>
  );
}
