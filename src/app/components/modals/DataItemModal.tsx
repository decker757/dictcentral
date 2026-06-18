import { useState } from 'react';
import {
  Key, User, Clock, GitBranch, CheckSquare, Code2, List,
  Edit2, Save, XCircle, Database, ChevronRight,
} from 'lucide-react';
import { DataItem, Entity, SubjectArea } from '../../types';
import { Modal, CloseButton } from '../ui/Modal';
import { TextField } from '../ui/Field';
import { MetaCell } from '../shared/MetaCell';
import { ClassificationBadge, SensitivityBadge, keyIndicatorBadgeClass } from '../../lib/badges';

interface DataItemModalProps {
  dataItem: DataItem;
  entity: Entity;
  subjectArea: SubjectArea;
  onClose: () => void;
  onEntityClick: (entity: Entity, subjectArea: SubjectArea) => void;
  onUpdate: (dataItemId: string, updates: Partial<DataItem>) => void;
  readOnly?: boolean;
}

// Free-text fields in edit mode (mono where the value is technical).
const EDIT_FIELDS: [keyof DataItem, string, boolean?][] = [
  ['technicalName', 'Technical Name', true],
  ['dataType', 'Data Type', true],
  ['length', 'Length / Precision', true],
  ['format', 'Format / Pattern', true],
  ['defaultValue', 'Default Value', true],
  ['validationRule', 'Validation Rule'],
  ['sourceColumn', 'Source Column', true],
  ['steward', 'Data Steward'],
  ['lastModified', 'Last Modified'],
  ['transformationLogic', 'Transformation Logic'],
];

export function DataItemModal({ dataItem: initialDI, entity, subjectArea, onClose, onEntityClick, onUpdate, readOnly }: DataItemModalProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...initialDI });

  const di = editing ? draft : initialDI;

  const handleSave = () => {
    onUpdate(initialDI.id, draft);
    setEditing(false);
  };
  const handleCancel = () => { setDraft({ ...initialDI }); setEditing(false); };

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                className="text-xl font-semibold text-gray-900 border-b-2 border-green-400 outline-none w-full bg-transparent"
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{di.name}</h2>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-500 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                {subjectArea.name}
              </span>
              {/* Parent entity — clickable */}
              <button
                onClick={() => { onClose(); setTimeout(() => onEntityClick(entity, subjectArea), 50); }}
                className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
              >
                <Database className="w-3 h-3" />
                {entity.name}
                <ChevronRight className="w-3 h-3" />
              </button>
              <ClassificationBadge value={di.classification} tone="solid" />
              <SensitivityBadge value={di.sensitivityLevel} withBorder />
              {di.keyIndicator && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${keyIndicatorBadgeClass(di.keyIndicator)}`}>
                  <Key className="w-3 h-3" />{di.keyIndicator}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              </>
            ) : (
              !readOnly && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              )
            )}
            <CloseButton onClose={onClose} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {/* Business Definition */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business Definition</div>
          {editing ? (
            <textarea
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-400 resize-none"
              rows={3}
              value={draft.businessDefinition}
              onChange={e => setDraft(d => ({ ...d, businessDefinition: e.target.value }))}
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{di.businessDefinition}</p>
          )}
        </div>

        {/* Technical Metadata */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technical Metadata</div>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              {EDIT_FIELDS.map(([key, label, mono]) => (
                <TextField
                  key={key}
                  label={label}
                  mono={mono}
                  ring="green"
                  density="compact"
                  value={(draft[key] as string) ?? ''}
                  onChange={v => setDraft(d => ({ ...d, [key]: v }))}
                />
              ))}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 block mb-0.5">Nullable</label>
                <select
                  className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-green-400"
                  value={draft.nullable ? 'yes' : 'no'}
                  onChange={e => setDraft(d => ({ ...d, nullable: e.target.value === 'yes' }))}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 block mb-0.5">Key Indicator</label>
                <select
                  className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-green-400"
                  value={draft.keyIndicator ?? ''}
                  onChange={e => setDraft(d => ({ ...d, keyIndicator: (e.target.value || null) as DataItem['keyIndicator'] }))}
                >
                  <option value="">None</option>
                  <option value="PK">PK</option>
                  <option value="FK">FK</option>
                  <option value="UK">UK</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <MetaCell icon={<Code2 className="w-3.5 h-3.5" />} label="Technical Name" value={di.technicalName} mono />
              <MetaCell icon={<Code2 className="w-3.5 h-3.5" />} label="Data Type" value={`${di.dataType}${di.length ? `(${di.length})` : ''}`} mono />
              <MetaCell icon={<CheckSquare className="w-3.5 h-3.5" />} label="Nullable" value={di.nullable ? 'Yes' : 'No — Required'} />
              <MetaCell icon={<Key className="w-3.5 h-3.5" />} label="Key Indicator" value={di.keyIndicator ?? 'None'} />
              <MetaCell icon={<Code2 className="w-3.5 h-3.5" />} label="Format / Pattern" value={di.format ?? '—'} mono />
              <MetaCell icon={<CheckSquare className="w-3.5 h-3.5" />} label="Default Value" value={di.defaultValue ?? 'None'} mono />
              <MetaCell icon={<User className="w-3.5 h-3.5" />} label="Data Steward" value={di.steward ?? '—'} />
              <MetaCell icon={<Clock className="w-3.5 h-3.5" />} label="Last Modified" value={di.lastModified ?? '—'} mono />
              <MetaCell icon={<GitBranch className="w-3.5 h-3.5" />} label="Source Column" value={di.sourceColumn ?? '—'} mono wide />
            </div>
          )}
        </div>

        {/* Validation Rule */}
        {di.validationRule && !editing && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Validation Rule</div>
            <code className="text-xs text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded-lg block">{di.validationRule}</code>
          </div>
        )}

        {/* Transformation Logic */}
        {di.transformationLogic && !editing && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transformation Logic</div>
            <p className="text-sm text-gray-600 leading-relaxed">{di.transformationLogic}</p>
          </div>
        )}

        {/* Allowed Values */}
        {di.allowedValues && di.allowedValues.length > 0 && !editing && (
          <div className="px-6 py-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" /> Allowed Values
            </div>
            <div className="flex flex-wrap gap-1.5">
              {di.allowedValues.map(v => (
                <span key={v} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-md text-xs font-mono">{v}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
