import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Database, Filter, X } from 'lucide-react';
import { SubjectArea, Entity, DataItem } from '../types';
import { FlatDataItem, flattenDataItems } from '../lib/catalog';
import { CLASSIFICATIONS, SENSITIVITY_LEVELS } from '../lib/constants';
import { ClassificationBadge, SensitivityBadge, KeyBadge } from '../lib/badges';

interface TableViewProps {
  subjectAreas: SubjectArea[];
  searchQuery: string;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
}

type SortKey = 'name' | 'technicalName' | 'dataType' | 'classification' | 'sensitivityLevel' | 'entity' | 'subjectArea' | 'lastModified';
type SortDir = 'asc' | 'desc';

export function TableView({ subjectAreas, searchQuery, onDataItemClick, onEntityClick }: TableViewProps) {
  const [filterClass, setFilterClass] = useState('');
  const [filterSensitivity, setFilterSensitivity] = useState('');
  const [filterSubjectArea, setFilterSubjectArea] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastModified');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const allItems = useMemo<FlatDataItem[]>(() => flattenDataItems(subjectAreas), [subjectAreas]);

  const filtered = useMemo(() => {
    let items = allItems;
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      items = items.filter(({ dataItem, entity, subjectArea }) =>
        dataItem.name.toLowerCase().includes(q) ||
        dataItem.businessDefinition.toLowerCase().includes(q)
      );
    }
    if (filterClass) items = items.filter(i => i.dataItem.classification === filterClass);
    if (filterSensitivity) items = items.filter(i => i.dataItem.sensitivityLevel === filterSensitivity);
    if (filterSubjectArea) items = items.filter(i => i.subjectArea.id === filterSubjectArea);

    items = [...items].sort((a, b) => {
      let av = '', bv = '';
      switch (sortKey) {
        case 'name': av = a.dataItem.name; bv = b.dataItem.name; break;
        case 'technicalName': av = a.dataItem.technicalName; bv = b.dataItem.technicalName; break;
        case 'dataType': av = a.dataItem.dataType; bv = b.dataItem.dataType; break;
        case 'classification': av = a.dataItem.classification; bv = b.dataItem.classification; break;
        case 'sensitivityLevel': {
          const order = { Low: 0, Medium: 1, High: 2, Critical: 3 };
          const aO = order[a.dataItem.sensitivityLevel as keyof typeof order] ?? 0;
          const bO = order[b.dataItem.sensitivityLevel as keyof typeof order] ?? 0;
          return sortDir === 'asc' ? aO - bO : bO - aO;
        }
        case 'entity': av = a.entity.name; bv = b.entity.name; break;
        case 'subjectArea': av = a.subjectArea.name; bv = b.subjectArea.name; break;
        case 'lastModified': av = a.dataItem.lastModified ?? ''; bv = b.dataItem.lastModified ?? ''; break;
      }
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [allItems, searchQuery, filterClass, filterSensitivity, filterSubjectArea, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1 flex-shrink-0" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500 ml-1 flex-shrink-0" />
      : <ChevronDown className="w-3 h-3 text-blue-500 ml-1 flex-shrink-0" />;
  };

  const activeFilters = [filterClass, filterSensitivity, filterSubjectArea].filter(Boolean).length;

  const Th = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th
      className="px-4 py-2.5 text-left cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {children}<SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </div>
        <select
          value={filterSubjectArea}
          onChange={e => setFilterSubjectArea(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">All Subject Areas</option>
          {subjectAreas.map(sa => <option key={sa.id} value={sa.id}>{sa.name}</option>)}
        </select>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">All Classifications</option>
          {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={filterSensitivity}
          onChange={e => setFilterSensitivity(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">All Sensitivities</option>
          {SENSITIVITY_LEVELS.map(s => <option key={s}>{s}</option>)}
        </select>
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterClass(''); setFilterSensitivity(''); setFilterSubjectArea(''); }}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1.5 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
          >
            <X className="w-3 h-3" /> Clear filters ({activeFilters})
          </button>
        )}
        <div className="ml-auto text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{filtered.length}</span>
          <span className="text-gray-400"> / {allItems.length} items</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th col="name">Data Item</Th>
                <Th col="technicalName">Technical Name</Th>
                <Th col="dataType">Data Type</Th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left">Key</th>
                <Th col="classification">Classification</Th>
                <Th col="sensitivityLevel">Sensitivity</Th>
                <Th col="entity">Parent Entity</Th>
                <Th col="subjectArea">Subject Area</Th>
                <Th col="lastModified">Last Modified</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">
                    No data items match your search or filters.
                  </td>
                </tr>
              )}
              {filtered.map(({ dataItem, entity, subjectArea }) => (
                <tr
                  key={dataItem.id}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  onClick={() => onDataItemClick(dataItem, entity, subjectArea)}
                >
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                      {dataItem.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-gray-500 font-mono">{dataItem.technicalName}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {dataItem.dataType}{dataItem.length ? `(${dataItem.length})` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <KeyBadge value={dataItem.keyIndicator} size="md" />
                  </td>
                  <td className="px-4 py-2.5">
                    <ClassificationBadge value={dataItem.classification} tone="subtle" />
                  </td>
                  <td className="px-4 py-2.5">
                    <SensitivityBadge value={dataItem.sensitivityLevel} />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={e => { e.stopPropagation(); onEntityClick(entity, subjectArea); }}
                      className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <Database className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[130px]">{entity.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{subjectArea.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500 font-mono">{dataItem.lastModified ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
