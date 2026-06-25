// The identity header strip shown atop each entity group in the Excel-style
// hierarchy tables: type icon, entity name, its subject-area badge, an
// "unchanged" label for read-only context entities, and a data-item count.
// Previously this ~10-line block was duplicated almost verbatim between
// HierarchyRequestTable's EntityGroupTable and EditableHierarchyRequestTable's
// EditableEntityGroupTable — identical markup, differing only in which
// "is this a real request or just unchanged context" flag fed `muted`/the
// "unchanged" label. Both now render through this one component; the
// read-only table still supplies its own Full View / Changes Only toggle via
// `trailing` (the editable table has no such toggle, so it simply omits it).

import { ReactNode } from 'react';
import { RecordTypeIcon } from '../../lib/badges';

interface EntityGroupHeaderProps {
  name: string;
  /** True when this entity itself is unchanged — shown only as read-only context, not a
   * request someone can act on. */
  isContext: boolean;
  subjectAreaName?: string;
  childCount: number;
  /** Read-only table's Full View / Changes Only toggle. Omit entirely for the editable table. */
  trailing?: ReactNode;
}

export function EntityGroupHeader({ name, isContext, subjectAreaName, childCount, trailing }: EntityGroupHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <RecordTypeIcon type="entity" size="sm" muted={isContext} />
        <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
        {subjectAreaName && (
          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
            {subjectAreaName}
          </span>
        )}
        {isContext && <span className="text-xs font-medium text-gray-400 flex-shrink-0">unchanged</span>}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {childCount} data item{childCount !== 1 ? 's' : ''}
        </span>
      </div>
      {trailing}
    </div>
  );
}
