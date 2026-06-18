import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronRight, Database, RotateCcw } from 'lucide-react';
import { SubjectArea, Entity, DataItem } from '../../types';
import { Modal, ModalHeader } from '../ui/Modal';
import { TextField, SelectField } from '../ui/Field';
import { FlatDataItem, flattenDataItems, flattenEntities } from '../../lib/catalog';
import { DATA_TYPES, CLASSIFICATIONS, SENSITIVITY_LEVELS, KEY_INDICATORS } from '../../lib/constants';
import { ClassificationBadge, SensitivityBadge, KeyBadge } from '../../lib/badges';

export interface AdvancedFilters {
  businessName: string;
  technicalName: string;
  businessDefinition: string;
  dataType: string;
  classification: string;
  sensitivityLevel: string;
  keyIndicator: string;
  nullable: string;
  subjectAreaId: string;
  entityId: string;
  steward: string;
  format: string;
  sourceColumn: string;
  lastModifiedFrom: string;
  lastModifiedTo: string;
}

const EMPTY_FILTERS: AdvancedFilters = {
  businessName: '', technicalName: '', businessDefinition: '', dataType: '',
  classification: '', sensitivityLevel: '', keyIndicator: '', nullable: '',
  subjectAreaId: '', entityId: '', steward: '', format: '', sourceColumn: '',
  lastModifiedFrom: '', lastModifiedTo: '',
};

interface Props {
  subjectAreas: SubjectArea[];
  onClose: () => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  initialFilters?: Partial<AdvancedFilters>;
}

const SectionLabel = ({ children }: { children: string }) => (
  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
    <span className="w-4 h-px bg-gray-300" />{children}
  </div>
);

export function AdvancedSearchModal({ subjectAreas, onClose, onDataItemClick, onEntityClick, initialFilters }: Props) {
  const [filters, setFilters] = useState<AdvancedFilters>({ ...EMPTY_FILTERS, ...initialFilters });
  const [searched, setSearched] = useState(!!initialFilters);

  const allDIs = useMemo(() => flattenDataItems(subjectAreas), [subjectAreas]);
  const allEntities = useMemo(() => flattenEntities(subjectAreas), [subjectAreas]);

  const results = useMemo<FlatDataItem[]>(() => {
    if (!searched) return [];
    return allDIs.filter(({ dataItem, entity, subjectArea }) => {
      const f = filters;
      if (f.businessName && !dataItem.name.toLowerCase().includes(f.businessName.toLowerCase())) return false;
      if (f.technicalName && !dataItem.technicalName.toLowerCase().includes(f.technicalName.toLowerCase())) return false;
      if (f.businessDefinition && !dataItem.businessDefinition.toLowerCase().includes(f.businessDefinition.toLowerCase())) return false;
      if (f.dataType && dataItem.dataType !== f.dataType) return false;
      if (f.classification && dataItem.classification !== f.classification) return false;
      if (f.sensitivityLevel && dataItem.sensitivityLevel !== f.sensitivityLevel) return false;
      if (f.keyIndicator) {
        if (f.keyIndicator === 'None' && dataItem.keyIndicator !== null) return false;
        if (f.keyIndicator !== 'None' && dataItem.keyIndicator !== f.keyIndicator) return false;
      }
      if (f.nullable === 'yes' && !dataItem.nullable) return false;
      if (f.nullable === 'no' && dataItem.nullable) return false;
      if (f.subjectAreaId && subjectArea.id !== f.subjectAreaId) return false;
      if (f.entityId && entity.id !== f.entityId) return false;
      if (f.steward && !(dataItem.steward ?? '').toLowerCase().includes(f.steward.toLowerCase())) return false;
      if (f.format && !(dataItem.format ?? '').toLowerCase().includes(f.format.toLowerCase())) return false;
      if (f.sourceColumn && !(dataItem.sourceColumn ?? '').toLowerCase().includes(f.sourceColumn.toLowerCase())) return false;
      if (f.lastModifiedFrom && (dataItem.lastModified ?? '') < f.lastModifiedFrom) return false;
      if (f.lastModifiedTo && (dataItem.lastModified ?? '') > f.lastModifiedTo) return false;
      return true;
    });
  }, [searched, filters, allDIs]);

  const set = (key: keyof AdvancedFilters, val: string) => setFilters(prev => ({ ...prev, [key]: val }));
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Modal onClose={onClose} maxWidth="max-w-4xl">
      <ModalHeader
        icon={<SlidersHorizontal className="w-5 h-5 text-blue-600" />}
        iconWrapClass="bg-blue-50"
        title="Advanced Search"
        subtitle="Search data items using any combination of attributes"
        onClose={onClose}
      >
        {activeCount > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {activeCount} active
          </span>
        )}
      </ModalHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Filter panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto p-5 bg-gray-50/40">
          <div className="space-y-4">
            <div>
              <SectionLabel>Identity</SectionLabel>
              <div className="space-y-3">
                <TextField label="Business Name" placeholder="e.g. Patient ID" value={filters.businessName} onChange={v => set('businessName', v)} />
                <TextField label="Technical Name" placeholder="e.g. patient_id" value={filters.technicalName} onChange={v => set('technicalName', v)} />
                <TextField label="Definition Keywords" placeholder="keyword in definition" value={filters.businessDefinition} onChange={v => set('businessDefinition', v)} />
              </div>
            </div>

            <div>
              <SectionLabel>Technical</SectionLabel>
              <div className="space-y-3">
                <SelectField label="Data Type" placeholder="Any" options={DATA_TYPES} value={filters.dataType} onChange={v => set('dataType', v)} />
                <SelectField label="Key Indicator" placeholder="Any" options={[...KEY_INDICATORS, 'None']} value={filters.keyIndicator} onChange={v => set('keyIndicator', v)} />
                <SelectField label="Nullable" placeholder="Any" options={['yes', 'no']} value={filters.nullable} onChange={v => set('nullable', v)} />
                <TextField label="Format / Pattern" placeholder="e.g. YYYY-MM-DD" value={filters.format} onChange={v => set('format', v)} />
                <TextField label="Source Column" placeholder="e.g. ehr.patients.pt_id" value={filters.sourceColumn} onChange={v => set('sourceColumn', v)} />
              </div>
            </div>

            <div>
              <SectionLabel>Governance</SectionLabel>
              <div className="space-y-3">
                <SelectField label="Classification" placeholder="Any" options={CLASSIFICATIONS} value={filters.classification} onChange={v => set('classification', v)} />
                <SelectField label="Sensitivity Level" placeholder="Any" options={SENSITIVITY_LEVELS} value={filters.sensitivityLevel} onChange={v => set('sensitivityLevel', v)} />
                <TextField label="Data Steward" placeholder="e.g. Alex Kim" value={filters.steward} onChange={v => set('steward', v)} />
              </div>
            </div>

            <div>
              <SectionLabel>Hierarchy</SectionLabel>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Subject Area</label>
                  <select
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
                    value={filters.subjectAreaId}
                    onChange={e => { set('subjectAreaId', e.target.value); set('entityId', ''); }}
                  >
                    <option value="">Any</option>
                    {subjectAreas.map(sa => <option key={sa.id} value={sa.id}>{sa.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Parent Entity</label>
                  <select
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
                    value={filters.entityId}
                    onChange={e => set('entityId', e.target.value)}
                  >
                    <option value="">Any</option>
                    {allEntities
                      .filter(fe => !filters.subjectAreaId || fe.subjectArea.id === filters.subjectAreaId)
                      .map(fe => <option key={fe.entity.id} value={fe.entity.id}>{fe.subjectArea.name} / {fe.entity.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Last Modified</SectionLabel>
              <div className="space-y-3">
                <TextField label="From" type="date" value={filters.lastModifiedFrom} onChange={v => set('lastModifiedFrom', v)} />
                <TextField label="To" type="date" value={filters.lastModifiedTo} onChange={v => set('lastModifiedTo', v)} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-2">
            <button
              onClick={() => setSearched(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            <button
              onClick={() => { setFilters(EMPTY_FILTERS); setSearched(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Results panel */}
        <div className="flex-1 overflow-y-auto">
          {!searched && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <div className="p-4 bg-gray-50 rounded-2xl mb-4">
                <SlidersHorizontal className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-sm font-medium text-gray-500 mb-1">Configure your search</div>
              <div className="text-xs text-gray-400">Set one or more filters on the left and click Search to find matching data items.</div>
            </div>
          )}

          {searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <div className="p-4 bg-gray-50 rounded-2xl mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-sm font-medium text-gray-500 mb-1">No results found</div>
              <div className="text-xs text-gray-400">Try removing some filters or broadening your search criteria.</div>
            </div>
          )}

          {searched && results.length > 0 && (
            <div>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{results.length}</span> data item{results.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {results.map(({ dataItem, entity, subjectArea }) => (
                  <button
                    key={dataItem.id}
                    onClick={() => { onDataItemClick(dataItem, entity, subjectArea); onClose(); }}
                    className="w-full px-5 py-3.5 flex items-start gap-4 hover:bg-blue-50/40 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {dataItem.name}
                        </span>
                        <KeyBadge value={dataItem.keyIndicator} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                        <code className="font-mono">{dataItem.technicalName}</code>
                        <span>·</span>
                        <span className="font-mono">{dataItem.dataType}{dataItem.length ? `(${dataItem.length})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-blue-600">{subjectArea.name}</span>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                        <button
                          onClick={e => { e.stopPropagation(); onEntityClick(entity, subjectArea); onClose(); }}
                          className="flex items-center gap-0.5 text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          <Database className="w-3 h-3" />{entity.name}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      <ClassificationBadge value={dataItem.classification} tone="subtle" />
                      <SensitivityBadge value={dataItem.sensitivityLevel} />
                      {dataItem.lastModified && (
                        <span className="text-xs text-gray-400 font-mono">{dataItem.lastModified}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
