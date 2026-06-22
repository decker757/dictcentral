import { useState } from 'react';
import {
  Database, Shield, Activity, User, RefreshCw, Hash, Clock,
  Archive, GitBranch, Star, BookOpen, Gauge, Tag, Edit2, Save,
  XCircle, FileText, ChevronRight,
} from 'lucide-react';
import { Entity, DataItem, SubjectArea } from '../../types';
import { Modal, CloseButton } from '../ui/Modal';
import { TextField } from '../ui/Field';
import { MetaCell } from '../shared/MetaCell';
import { classificationBadgeClass } from '../../lib/badges';

interface EntityModalProps {
  entity: Entity;
  subjectArea: SubjectArea;
  onClose: () => void;
  onDataItemClick: (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) => void;
  onUpdate: (entityId: string, updates: Partial<Entity>) => void;
  readOnly?: boolean;
}

// Editable text fields shown in the "Technical Metadata" grid (edit mode).
const EDIT_FIELDS: [string, keyof Entity][] = [
  ['Technical Name', 'technicalName'],
  ['Owner', 'owner'],
  ['Data Steward', 'steward'],
  ['Source System', 'sourceSystem'],
  ['Record Count', 'recordCount'],
  ['Refresh Frequency', 'refreshFrequency'],
  ['Retention Policy', 'retentionPolicy'],
  ['Schema Version', 'schemaVersion'],
  ['SLA Target', 'slaTarget'],
  ['Lineage Source', 'lineageSource'],
  ['Business Glossary Ref', 'businessGlossaryRef'],
  ['Last Updated', 'lastUpdated'],
];

export function EntityModal({ entity: initialEntity, subjectArea, onClose, onDataItemClick, onUpdate, readOnly }: EntityModalProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...initialEntity });

  // Reflect live updates while modal is open
  const entity = editing ? draft : initialEntity;

  const statusColor = (s?: string) => {
    switch (s) {
      case 'Active': return 'bg-green-100 text-green-700 border-green-200';
      case 'Deprecated': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Archived': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const qualityColor = (score?: number) => {
    if (!score) return 'bg-green-500';
    if (score >= 95) return 'bg-green-500';
    if (score >= 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleSave = () => {
    onUpdate(initialEntity.id, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...initialEntity });
    setEditing(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-purple-600 rounded-lg flex-shrink-0 mt-0.5">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  className="text-xl font-semibold text-gray-900 border-b-2 border-purple-400 outline-none w-full bg-transparent"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">{entity.name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {subjectArea.name}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(entity.status)}`}>
                  <Activity className="w-3 h-3 inline mr-1" />{entity.status ?? 'Active'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${classificationBadgeClass(entity.classification, 'solid')}`}>
                  <Shield className="w-3 h-3 inline mr-1" />{entity.classification}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
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
        {/* Description / Business Definition */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business Definition</div>
          {editing ? (
            <textarea
              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              rows={3}
              value={draft.description ?? ''}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{entity.description ?? '—'}</p>
          )}
        </div>

        {/* Technical Metadata */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technical Metadata</div>

          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              {EDIT_FIELDS.map(([label, key]) => (
                <TextField
                  key={key}
                  label={label}
                  ring="purple"
                  density="compact"
                  value={(draft[key] as string) ?? ''}
                  onChange={v => setDraft(d => ({ ...d, [key]: v }))}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
              <MetaCell icon={<Database className="w-3.5 h-3.5" />} label="Technical Name" value={entity.technicalName} mono />
              <MetaCell icon={<User className="w-3.5 h-3.5" />} label="Owner" value={entity.owner ?? '—'} />
              <MetaCell icon={<User className="w-3.5 h-3.5" />} label="Data Steward" value={entity.steward ?? '—'} />
              <MetaCell icon={<Database className="w-3.5 h-3.5" />} label="Source System" value={entity.sourceSystem ?? '—'} />
              <MetaCell icon={<Hash className="w-3.5 h-3.5" />} label="Record Count" value={entity.recordCount ?? '—'} mono />
              <MetaCell icon={<RefreshCw className="w-3.5 h-3.5" />} label="Refresh Frequency" value={entity.refreshFrequency ?? '—'} />
              <MetaCell icon={<Archive className="w-3.5 h-3.5" />} label="Retention Policy" value={entity.retentionPolicy ?? '—'} />
              <MetaCell icon={<GitBranch className="w-3.5 h-3.5" />} label="Schema Version" value={entity.schemaVersion ?? '—'} mono />
              <MetaCell icon={<Star className="w-3.5 h-3.5" />} label="SLA Target" value={entity.slaTarget ?? '—'} />
              <MetaCell icon={<GitBranch className="w-3.5 h-3.5" />} label="Lineage Source" value={entity.lineageSource ?? '—'} wide />
              <MetaCell icon={<BookOpen className="w-3.5 h-3.5" />} label="Glossary Ref" value={entity.businessGlossaryRef ?? '—'} mono />
              <MetaCell icon={<Clock className="w-3.5 h-3.5" />} label="Last Updated" value={entity.lastUpdated ?? '—'} mono />
            </div>
          )}

          {/* Quality score */}
          {entity.qualityScore !== undefined && !editing && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 w-28">
                <Gauge className="w-3.5 h-3.5" /> Quality Score
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${qualityColor(entity.qualityScore)}`} style={{ width: `${entity.qualityScore}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right">{entity.qualityScore}%</span>
            </div>
          )}

          {/* Tags */}
          {(entity.tags ?? []).length > 0 && !editing && (
            <div className="flex items-center gap-2 mt-3">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <div className="flex flex-wrap gap-1.5">
                {(entity.tags ?? []).map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Data Items */}
        <div className="px-6 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Related Data Items
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{initialEntity.dataItems.length}</span>
          </div>
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
            {initialEntity.dataItems.map(di => (
              <button
                key={di.id}
                onClick={() => onDataItemClick(di, initialEntity, subjectArea)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-purple-700 transition-colors">{di.name}</span>
                    {di.keyIndicator && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-600 border-purple-200">
                        {di.keyIndicator}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{di.technicalName}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{di.dataType}{di.length ? `(${di.length})` : ''}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
