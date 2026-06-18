import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Layers, Database, FileText, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectArea, Entity, DataItem } from '../types';
import { classificationBadgeClass, classificationTextClass, sensitivityTextClass, KeyBadge } from '../lib/badges';

interface TreeViewProps {
  subjectAreas: SubjectArea[];
  searchQuery: string;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
}

export function TreeView({ subjectAreas, searchQuery, onEntityClick, onDataItemClick }: TreeViewProps) {
  const q = searchQuery.toLowerCase().trim();

  // When there's a search query, filter subject areas to those with matching data items
  const filteredSAs = q
    ? subjectAreas
        .map(sa => ({
          ...sa,
          entities: sa.entities
            .map(e => ({
              ...e,
              dataItems: e.dataItems.filter(di =>
                di.name.toLowerCase().includes(q) ||
                di.businessDefinition.toLowerCase().includes(q)
              ),
            }))
            .filter(e => e.dataItems.length > 0),
        }))
        .filter(sa => sa.entities.length > 0)
    : subjectAreas;

  const totalMatches = q
    ? filteredSAs.reduce((sum, sa) => sum + sa.entities.reduce((s2, e) => s2 + e.dataItems.length, 0), 0)
    : null;

  return (
    <div className="space-y-4">
      {q && totalMatches === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <div className="text-sm font-medium">No data items match "{searchQuery}"</div>
          <div className="text-xs mt-1">Try a different search term or use Advanced Search for more options</div>
        </div>
      )}
      {filteredSAs.map(sa => (
        <SubjectAreaRow
          key={sa.id}
          subjectArea={sa}
          searchActive={!!q}
          onEntityClick={onEntityClick}
          onDataItemClick={onDataItemClick}
        />
      ))}
    </div>
  );
}

function SubjectAreaRow({
  subjectArea, searchActive, onEntityClick, onDataItemClick,
}: {
  subjectArea: SubjectArea;
  searchActive: boolean;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalDataItems = subjectArea.entities.reduce((sum, e) => sum + e.dataItems.length, 0);

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left group select-none"
      >
        <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{subjectArea.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              subjectArea.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
              subjectArea.status === 'In Development' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {subjectArea.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            <span className="font-medium text-gray-700">{subjectArea.entities.length}</span> Entities
            {' '}•{' '}
            <span className="font-medium text-gray-700">{totalDataItems}</span> Data Items
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? '' : '-rotate-90'}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {subjectArea.entities.map(entity => (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  subjectArea={subjectArea}
                  searchActive={searchActive}
                  onEntityClick={onEntityClick}
                  onDataItemClick={onDataItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EntityRow({
  entity, subjectArea, searchActive, onEntityClick, onDataItemClick,
}: {
  entity: Entity;
  subjectArea: SubjectArea;
  searchActive: boolean;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
}) {
  // Auto-expand when search is active and entity has data items
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (searchActive) setOpen(true);
    else setOpen(false);
  }, [searchActive]);

  return (
    <div>
      <div className="flex items-center gap-0 pl-5 pr-5 py-2.5 hover:bg-purple-50/30 transition-colors group">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center justify-center w-5 h-5 mr-2 flex-shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <div className="p-1.5 bg-purple-100 rounded-md flex-shrink-0 mr-2.5">
          <Database className="w-3.5 h-3.5 text-purple-600" />
        </div>

        <button
          onClick={() => onEntityClick(entity, subjectArea)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-800 group-hover:text-purple-700 transition-colors truncate">
              {entity.name}
            </span>
            <code className="text-xs text-gray-400 font-mono truncate hidden lg:block">{entity.physicalTableName}</code>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${classificationBadgeClass(entity.classification, 'subtle')}`}>
            {entity.classification}
          </span>
          <span className="text-xs text-gray-400">{entity.dataItems.length} items</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-[1fr_1fr_0.6fr_0.35fr_0.4fr_0.5fr_0.55fr] gap-3 pl-[72px] pr-5 py-1.5 bg-gray-50 border-t border-gray-100 border-b border-gray-100">
              {['Data Item', 'Technical Name', 'Data Type', 'Null', 'Key', 'Class.', 'Sensitivity'].map(h => (
                <div key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-50/80">
              {entity.dataItems.map(di => (
                <DataItemTreeRow
                  key={di.id}
                  dataItem={di}
                  entity={entity}
                  subjectArea={subjectArea}
                  onDataItemClick={onDataItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataItemTreeRow({
  dataItem, entity, subjectArea, onDataItemClick,
}: {
  dataItem: DataItem;
  entity: Entity;
  subjectArea: SubjectArea;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
}) {
  return (
    <button
      onClick={() => onDataItemClick(dataItem, entity, subjectArea)}
      className="w-full grid grid-cols-[1fr_1fr_0.6fr_0.35fr_0.4fr_0.5fr_0.55fr] gap-3 pl-[72px] pr-5 py-2 hover:bg-green-50/40 text-left transition-colors group items-center"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <FileText className="w-3 h-3 text-green-500 flex-shrink-0" />
        <span className="text-sm text-gray-800 group-hover:text-green-700 font-medium truncate transition-colors">
          {dataItem.name}
        </span>
      </div>
      <code className="text-xs text-gray-400 font-mono truncate">{dataItem.technicalName}</code>
      <span className="text-xs text-gray-600 font-mono">{dataItem.dataType}{dataItem.length ? `(${dataItem.length})` : ''}</span>
      <span className="text-xs text-gray-400">{dataItem.nullable ? 'Y' : 'N'}</span>
      <div>
        <KeyBadge value={dataItem.keyIndicator} size="sm" />
      </div>
      <span className={`text-xs font-medium ${classificationTextClass(dataItem.classification)}`}>{dataItem.classification}</span>
      <span className={`text-xs font-medium ${sensitivityTextClass(dataItem.sensitivityLevel)}`}>
        {dataItem.sensitivityLevel === 'Critical' && <Lock className="w-3 h-3 inline mr-0.5" />}
        {dataItem.sensitivityLevel}
      </span>
    </button>
  );
}
