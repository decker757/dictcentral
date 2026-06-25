// The Tree/Table catalog-browsing section shared by all three portals —
// SearchBar, a Tree/Table view toggle, and the TreeView/TableView itself.
// Owns its own Tree-vs-Table selection state and quick-search query (no
// portal needs to read or control either), so each portal's Catalog tab is
// just one component: <CatalogBrowser subjectAreas={...} onEntityClick={...}
// onDataItemClick={...} onAdvancedSearch={...} />.

import { useState, useMemo } from 'react';
import { GitBranch, LayoutList } from 'lucide-react';
import { SubjectArea, Entity, DataItem } from '../types';
import { TreeView } from './TreeView';
import { TableView } from './TableView';
import { SearchBar } from './SearchBar';
import { TypeLegend } from '../lib/badges';
import { countDataItems, countMatches } from '../lib/catalog';

type View = 'tree' | 'table';

interface CatalogBrowserProps {
  subjectAreas: SubjectArea[];
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
  onAdvancedSearch: () => void;
  /** HOD: slightly different helper copy under the section header, since they can only view. */
  readOnly?: boolean;
}

export function CatalogBrowser({ subjectAreas, onEntityClick, onDataItemClick, onAdvancedSearch, readOnly }: CatalogBrowserProps) {
  const [view, setView] = useState<View>('tree');
  const [searchQuery, setSearchQuery] = useState('');

  const totalDataItems = countDataItems(subjectAreas);
  const treeMatchCount = useMemo(() => countMatches(subjectAreas, searchQuery), [subjectAreas, searchQuery]);

  return (
    <>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onAdvancedSearch={onAdvancedSearch}
        resultCount={searchQuery.trim() ? treeMatchCount : undefined}
        totalCount={totalDataItems}
      />

      <div className="-mb-2 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-700">
            {view === 'tree' ? 'Data Hierarchy' : 'All Data Items'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {readOnly
              ? (view === 'tree'
                  ? 'Read-only view · Expand an entity to browse its data items · click Details or a data item for full metadata'
                  : 'Read-only view · Click any row to inspect its full metadata')
              : (view === 'tree'
                  ? 'Click an Entity or Data Item to view, edit, or delete it'
                  : 'Click any row to inspect, edit, or delete its full metadata')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {view === 'tree' && <TypeLegend className="hidden lg:flex" />}
          {/* Tree / Table toggle — inline with the section it controls */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" /> Tree
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Table
            </button>
          </div>
        </div>
      </div>

      {view === 'tree' && (
        <TreeView subjectAreas={subjectAreas} searchQuery={searchQuery} onEntityClick={onEntityClick} onDataItemClick={onDataItemClick} />
      )}
      {view === 'table' && (
        <TableView subjectAreas={subjectAreas} searchQuery={searchQuery} onDataItemClick={onDataItemClick} onEntityClick={onEntityClick} />
      )}
    </>
  );
}
