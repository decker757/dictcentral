// A small review-comment thread — shows every past comment (author +
// timestamp), oldest first, with a plain draft input underneath. There is
// no per-comment "submit" button: a draft is just held in memory (lifted up
// to SubmissionDetailView) and only actually added to the thread when the
// approver clicks Approve or Reject for the whole request — there is one
// commit point, not one per comment box. Used both for the per-request
// generic thread (SubmissionDetailView) and the per-entity/data-item thread
// (HierarchyRequestTable's Comments cell), via the `compact` prop.

import { Comment } from '../../types';
import { formatSubmittedAt } from '../../lib/format';

interface CommentThreadProps {
  comments: Comment[];
  /** No draft input — board member view (read history only). */
  readOnly?: boolean;
  /** Current unsent draft text for this thread. */
  draft?: string;
  /** Omit (even when not readOnly) to render thread-only, no draft input. */
  onDraftChange?: (text: string) => void;
  placeholder?: string;
  /** Tight single-line-ish styling for table cells, vs. the roomier generic-comment box. */
  compact?: boolean;
}

export function CommentThread({ comments, readOnly, draft, onDraftChange, placeholder, compact }: CommentThreadProps) {
  const hasComments = comments.length > 0;

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
      {hasComments && (
        <div className={`flex flex-col gap-1 overflow-y-auto pr-0.5 ${compact ? 'max-h-20' : 'max-h-48'}`}>
          {comments.map(c => (
            <div
              key={c.id}
              className={compact ? 'text-[11px] leading-snug' : 'text-sm leading-snug border border-gray-100 rounded-md px-2.5 py-1.5 bg-gray-50'}
            >
              <div className={`flex items-center gap-1 flex-wrap text-gray-400 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                <span className="font-semibold text-gray-600">{c.author}</span>
                <span>·</span>
                <span>{formatSubmittedAt(c.timestamp)}</span>
              </div>
              <div className="text-gray-700 break-words">{c.text}</div>
            </div>
          ))}
        </div>
      )}

      {!hasComments && (
        <span className={`text-gray-400 ${compact ? 'text-[11px]' : 'text-sm'}`}>
          No comments yet.
        </span>
      )}

      {!readOnly && onDraftChange && (
        <input
          type="text"
          value={draft ?? ''}
          onChange={e => onDraftChange(e.target.value)}
          placeholder={placeholder ?? 'Add a comment…'}
          className={`outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 rounded-md border border-gray-200 bg-white ${
            compact ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2'
          }`}
        />
      )}
    </div>
  );
}
