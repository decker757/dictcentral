import { useState } from 'react';
import {
  Edit2, FileSpreadsheet, CheckCircle, Search, Database, FileText, Shield, Download, ChevronRight, ShieldCheck, Route,
} from 'lucide-react';
import { Entity, DataItem, SubjectArea, RecordAttributes } from '../../types';
import { Modal, ModalHeader } from '../ui/Modal';
import { Segmented } from '../ui/Segmented';
import { TextField, SelectField, TextAreaField } from '../ui/Field';
import { ExcelDropzone, useExcelImport } from '../shared/ExcelDropzone';
import { ValidationSummary } from '../shared/ValidationSummary';
import { FlatEntity, FlatDataItem, flattenEntities, flattenDataItems } from '../../lib/catalog';
import { DATA_TYPES, CLASSIFICATIONS, SENSITIVITY_LEVELS, ENTITY_STATUSES, KEY_INDICATORS, DGO_DIRECTORY, HOD_DIRECTORY, CURRENT_DGO } from '../../lib/constants';
import { classificationBadgeClass } from '../../lib/badges';
import { validateRecordForm, FieldError, SoftWarning } from '../../lib/validation';
import { RequestOpts } from '../../hooks/useCatalog';

interface EditModalProps {
  subjectAreas: SubjectArea[];
  /** 'dgo' shows the compulsory Staff Approver picker (one-stage peer review); 'board'
   * shows the optional Reroute-to-Another-HOD checkbox. */
  mode?: 'board' | 'dgo';
  onClose: () => void;
  onUpdateEntity: (entityId: string, updates: Partial<Entity>, opts?: RequestOpts) => void;
  onUpdateDataItem: (dataItemId: string, updates: Partial<DataItem>, opts?: RequestOpts) => void;
}

type Method = 'form' | 'excel';
type RecordType = 'entity' | 'dataitem';
type Step = 'select' | 'edit';

const DI_TEXT_FIELDS: [keyof DataItem, string][] = [
  ['name', 'Business Name'], ['technicalName', 'Technical Name'],
  ['format', 'Format / Pattern'], ['defaultValue', 'Default Value'],
  ['steward', 'Data Steward'], ['sourceColumn', 'Source Column'],
];
const ENTITY_TEXT_FIELDS: [keyof Entity, string][] = [
  ['name', 'Entity Name'], ['technicalName', 'Technical Name'],
  ['owner', 'Owner'], ['steward', 'Data Steward'], ['sourceSystem', 'Source System'],
  ['recordCount', 'Record Count'], ['refreshFrequency', 'Refresh Frequency'],
  ['retentionPolicy', 'Retention Policy'], ['schemaVersion', 'Schema Version'], ['slaTarget', 'SLA Target'],
];

export function EditModal({ subjectAreas, mode = 'board', onClose, onUpdateEntity, onUpdateDataItem }: EditModalProps) {
  const [method, setMethod] = useState<Method>('form');
  const [recordType, setRecordType] = useState<RecordType>('dataitem');
  const [step, setStep] = useState<Step>('select');
  const [query, setQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<FlatEntity | null>(null);
  const [selectedDI, setSelectedDI] = useState<FlatDataItem | null>(null);
  const imp = useExcelImport();

  const [entityDraft, setEntityDraft] = useState<Partial<Entity>>({});
  const [diDraft, setDIDraft] = useState<Partial<DataItem>>({});

  // Validate Fields → real submit button — see CreateModal for the same pattern.
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [warnings, setWarnings] = useState<SoftWarning[]>([]);
  const invalidate = () => setValidated(false);

  // Mode-specific extras (mutually exclusive with each other, picked per `mode`)
  const [staffApprover, setStaffApprover] = useState('');
  const [rerouteChecked, setRerouteChecked] = useState(false);
  const [rerouteHod, setRerouteHod] = useState('');
  const [rerouteComment, setRerouteComment] = useState('');

  const allEntities = flattenEntities(subjectAreas);
  const allDIs = flattenDataItems(subjectAreas);

  const q = query.toLowerCase();
  const filteredEntities = allEntities.filter(({ entity, subjectArea }) =>
    !q || entity.name.toLowerCase().includes(q) || subjectArea.name.toLowerCase().includes(q)
  );
  const filteredDIs = allDIs.filter(({ dataItem, entity }) =>
    !q || dataItem.name.toLowerCase().includes(q) || dataItem.technicalName.toLowerCase().includes(q) || entity.name.toLowerCase().includes(q)
  );

  const backToSelect = () => { setStep('select'); setSelectedEntity(null); setSelectedDI(null); invalidate(); };

  const handleSelectEntity = (fe: FlatEntity) => { setSelectedEntity(fe); setEntityDraft({ ...fe.entity }); setStep('edit'); invalidate(); };
  const handleSelectDI = (fdi: FlatDataItem) => { setSelectedDI(fdi); setDIDraft({ ...fdi.dataItem }); setStep('edit'); invalidate(); };

  const setEntityField = (updater: (d: Partial<Entity>) => Partial<Entity>) => { setEntityDraft(updater); invalidate(); };
  const setDIField = (updater: (d: Partial<DataItem>) => Partial<DataItem>) => { setDIDraft(updater); invalidate(); };

  /** Compulsory-field/structural checks beyond the record's own attributes — whichever
   * mode-specific extra applies (parent selection isn't relevant here; editing an existing
   * record always has one already). */
  const structuralErrors = (): FieldError[] => {
    const errs: FieldError[] = [];
    if (mode === 'dgo' && !staffApprover) {
      errs.push({ field: 'staffApprover', message: 'Staff Approver is required \u2014 select another DGO to approve this request.' });
    }
    if (mode === 'board' && rerouteChecked) {
      if (!rerouteHod) errs.push({ field: 'rerouteHod', message: 'Select an HOD to reroute to.' });
      if (!rerouteComment.trim()) errs.push({ field: 'rerouteComment', message: 'A comment explaining the reroute is required.' });
    }
    return errs;
  };

  const handleValidate = () => {
    const record = recordType === 'entity' ? entityDraft : diDraft;
    const result = validateRecordForm(record as Partial<RecordAttributes>, recordType);
    const allErrors = [...structuralErrors(), ...result.errors];
    setErrors(allErrors);
    setWarnings(result.warnings);
    setValidated(allErrors.length === 0);
  };

  const buildOpts = (): RequestOpts | undefined => {
    if (mode === 'dgo') return staffApprover ? { staffApprover } : undefined;
    if (mode === 'board' && rerouteChecked) return { rerouteHod, rerouteComment: rerouteComment.trim() };
    return undefined;
  };

  const handleSaveEntity = () => { if (!selectedEntity || !validated) return; onUpdateEntity(selectedEntity.entity.id, entityDraft, buildOpts()); onClose(); };
  const handleSaveDI = () => { if (!selectedDI || !validated) return; onUpdateDataItem(selectedDI.dataItem.id, diDraft, buildOpts()); onClose(); };

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={<Edit2 className="w-5 h-5 text-orange-600" />}
        iconWrapClass="bg-orange-50"
        title="Edit Record"
        subtitle="Modify an existing entity or data item"
        onClose={onClose}
      />

      {/* Controls */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50 flex-shrink-0">
        <Segmented<Method>
          value={method}
          onChange={m => { setMethod(m); if (m === 'form') backToSelect(); }}
          options={[
            { value: 'form', label: 'Via Form', icon: <Edit2 className="w-3.5 h-3.5" />, activeClass: 'bg-orange-500 text-white' },
            { value: 'excel', label: 'Via Excel', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, activeClass: 'bg-orange-500 text-white' },
          ]}
        />
        {method === 'form' && step === 'select' && (
          <Segmented<RecordType>
            value={recordType}
            onChange={setRecordType}
            options={[
              { value: 'dataitem', label: 'Data Item', icon: <FileText className="w-3.5 h-3.5" />, activeClass: 'bg-green-600 text-white' },
              { value: 'entity', label: 'Entity', icon: <Database className="w-3.5 h-3.5" />, activeClass: 'bg-purple-600 text-white' },
            ]}
          />
        )}
        {method === 'form' && step === 'edit' && (
          <button onClick={backToSelect} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to search
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {/* Excel edit */}
        {method === 'excel' && (
          <div className="px-6 py-5 space-y-4">
            <ExcelDropzone
              accent="orange"
              idleText="Upload your modified export file"
              loadingText="Applying updates…"
              successText={`Updates applied from "${imp.fileName}"`}
              hint="Accepts re-exported .xlsx files with modified fields"
              status={imp.status}
              fileInputRef={imp.fileInputRef}
              pickFile={imp.pickFile}
              onFileChange={imp.onFileChange}
            />
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Export the current catalog, make changes in Excel, then re-upload.
              </div>
              <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 ml-4 flex-shrink-0">
                <Download className="w-3.5 h-3.5" /> Export Current Data
              </button>
            </div>
          </div>
        )}

        {/* Form — Step 1: Select */}
        {method === 'form' && step === 'select' && (
          <div className="px-6 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder={recordType === 'dataitem' ? 'Search data items by name or technical name…' : 'Search entities by name…'}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
              {recordType === 'dataitem' && filteredDIs.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No data items found</div>
              )}
              {recordType === 'dataitem' && filteredDIs.slice(0, 50).map(({ dataItem, entity, subjectArea }) => (
                <button
                  key={dataItem.id}
                  onClick={() => handleSelectDI({ dataItem, entity, subjectArea })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50/40 transition-colors text-left border-b border-gray-50 last:border-0 group"
                >
                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-orange-700 transition-colors">{dataItem.name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{dataItem.technicalName} · {subjectArea.name} / {entity.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs border ${classificationBadgeClass(dataItem.classification, 'subtle')}`}>
                      <Shield className="w-2.5 h-2.5 inline mr-0.5" />{dataItem.classification}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                </button>
              ))}

              {recordType === 'entity' && filteredEntities.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No entities found</div>
              )}
              {recordType === 'entity' && filteredEntities.slice(0, 30).map(({ entity, subjectArea }) => (
                <button
                  key={entity.id}
                  onClick={() => handleSelectEntity({ entity, subjectArea })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50/40 transition-colors text-left border-b border-gray-50 last:border-0 group"
                >
                  <Database className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-orange-700 transition-colors">{entity.name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{entity.technicalName} · {subjectArea.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs border ${classificationBadgeClass(entity.classification, 'subtle')}`}>
                      {entity.classification}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400 text-right">
              Showing {recordType === 'dataitem' ? Math.min(filteredDIs.length, 50) : Math.min(filteredEntities.length, 30)} results
            </div>
          </div>
        )}

        {/* Form — Step 2: Edit Data Item */}
        {method === 'form' && step === 'edit' && selectedDI && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-5">
              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="text-sm font-medium text-green-800">{selectedDI.dataItem.name}</div>
              <span className="text-xs text-green-600 ml-auto">{selectedDI.subjectArea.name} / {selectedDI.entity.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {DI_TEXT_FIELDS.map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  ring="orange"
                  density="compact"
                  value={(diDraft[key] as string) ?? ''}
                  onChange={v => setDIField(d => ({ ...d, [key]: v }))}
                />
              ))}
              <SelectField label="Data Type" ring="orange" density="compact" options={DATA_TYPES} value={(diDraft.dataType as string) ?? ''} onChange={v => setDIField(d => ({ ...d, dataType: v }))} />
              <SelectField label="Classification" ring="orange" density="compact" options={CLASSIFICATIONS} value={(diDraft.classification as string) ?? ''} onChange={v => setDIField(d => ({ ...d, classification: v as DataItem['classification'] }))} />
              <SelectField label="Sensitivity Level" ring="orange" density="compact" options={SENSITIVITY_LEVELS} value={(diDraft.sensitivityLevel as string) ?? ''} onChange={v => setDIField(d => ({ ...d, sensitivityLevel: v as DataItem['sensitivityLevel'] }))} />
              <SelectField label="Key Indicator" ring="orange" density="compact" placeholder="— None —" options={KEY_INDICATORS} value={(diDraft.keyIndicator as string) ?? ''} onChange={v => setDIField(d => ({ ...d, keyIndicator: (v || null) as DataItem['keyIndicator'] }))} />
              <TextAreaField colSpan2 label="Business Definition" ring="orange" density="compact" value={(diDraft.description as string) ?? ''} onChange={v => setDIField(d => ({ ...d, description: v }))} />
              <TextField colSpan2 mono label="Validation Rule" ring="orange" density="compact" value={(diDraft.validationRule as string) ?? ''} onChange={v => setDIField(d => ({ ...d, validationRule: v }))} />
            </div>
          </div>
        )}

        {/* Form — Step 2: Edit Entity */}
        {method === 'form' && step === 'edit' && selectedEntity && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg mb-5">
              <Database className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <div className="text-sm font-medium text-purple-800">{selectedEntity.entity.name}</div>
              <span className="text-xs text-purple-600 ml-auto">{selectedEntity.subjectArea.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {ENTITY_TEXT_FIELDS.map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  ring="orange"
                  density="compact"
                  value={(entityDraft[key] as string) ?? ''}
                  onChange={v => setEntityField(d => ({ ...d, [key]: v }))}
                />
              ))}
              <SelectField label="Classification" ring="orange" density="compact" options={CLASSIFICATIONS} value={(entityDraft.classification as string) ?? ''} onChange={v => setEntityField(d => ({ ...d, classification: v as Entity['classification'] }))} />
              <SelectField label="Status" ring="orange" density="compact" options={ENTITY_STATUSES} value={(entityDraft.status as string) ?? ''} onChange={v => setEntityField(d => ({ ...d, status: v as Entity['status'] }))} />
              <TextAreaField colSpan2 label="Description / Business Definition" ring="orange" density="compact" value={(entityDraft.description as string) ?? ''} onChange={v => setEntityField(d => ({ ...d, description: v }))} />
            </div>
          </div>
        )}

        {/* Mode-specific extras — shown for both record types, step 'edit' only */}
        {method === 'form' && step === 'edit' && mode === 'dgo' && (
          <div className="px-6 pb-5">
            <div className="pt-4 border-t border-gray-100">
              <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Staff Approver (required) *</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                value={staffApprover}
                onChange={e => { setStaffApprover(e.target.value); invalidate(); }}
              >
                <option value="">— Select another DGO to approve this request —</option>
                {DGO_DIRECTORY.filter(d => d.name !== CURRENT_DGO).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                One-stage peer review — once they approve, this is applied immediately (no HOD review).
              </p>
            </div>
          </div>
        )}
        {method === 'form' && step === 'edit' && mode === 'board' && (
          <div className="px-6 pb-5">
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rerouteChecked}
                  onChange={e => { setRerouteChecked(e.target.checked); invalidate(); }}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <Route className="w-4 h-4 text-blue-500" /> Re-route to Another HOD
              </label>
              {rerouteChecked && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Reroute to HOD *</label>
                    <select
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      value={rerouteHod}
                      onChange={e => { setRerouteHod(e.target.value); invalidate(); }}
                    >
                      <option value="">— Select HOD —</option>
                      {HOD_DIRECTORY.map(h => <option key={h.name} value={h.name}>{h.name}{h.department ? ` — ${h.department}` : ''}</option>)}
                    </select>
                  </div>
                  <TextAreaField
                    colSpan2 label="Reason for reroute" ring="orange" required rows={2}
                    value={rerouteComment}
                    onChange={v => { setRerouteComment(v); invalidate(); }}
                    placeholder="e.g. HOD is on leave until next week"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {method === 'form' && step === 'edit' && (errors.length > 0 || warnings.length > 0) && (
          <div className="px-6 pb-5 grid grid-cols-2 gap-4">
            <ValidationSummary errors={errors} warnings={warnings} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
        <div className="text-xs text-gray-400">
          {method === 'form' && step === 'select' && `${recordType === 'dataitem' ? filteredDIs.length : filteredEntities.length} records available`}
          {method === 'form' && step === 'edit' && 'Changes saved in-session'}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          {method === 'form' && step === 'edit' && !validated && (
            <button
              onClick={handleValidate}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Validate Fields
            </button>
          )}
          {method === 'form' && step === 'edit' && validated && (
            <button
              onClick={recordType === 'entity' ? handleSaveEntity : handleSaveDI}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Save Changes
            </button>
          )}
          {method === 'excel' && imp.status === 'success' && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Done
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
