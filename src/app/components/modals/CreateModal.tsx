import { useState } from 'react';
import { Plus, Database, FileText, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Entity, DataItem, SubjectArea } from '../../types';
import { Modal, ModalHeader } from '../ui/Modal';
import { Segmented } from '../ui/Segmented';
import { TextField, SelectField, TextAreaField } from '../ui/Field';
import { ExcelDropzone, useExcelImport } from '../shared/ExcelDropzone';
import { flattenEntities } from '../../lib/catalog';
import { DATA_TYPES, CLASSIFICATIONS, SENSITIVITY_LEVELS, ENTITY_STATUSES, KEY_INDICATORS } from '../../lib/constants';

interface CreateModalProps {
  subjectAreas: SubjectArea[];
  onClose: () => void;
  onCreateEntity: (subjectAreaId: string, entity: Entity) => void;
  onCreateDataItem: (entityId: string, dataItem: DataItem) => void;
}

type Method = 'form' | 'excel';
type RecordType = 'entity' | 'dataitem';

export function CreateModal({ subjectAreas, onClose, onCreateEntity, onCreateDataItem }: CreateModalProps) {
  const [method, setMethod] = useState<Method>('form');
  const [recordType, setRecordType] = useState<RecordType>('dataitem');
  const imp = useExcelImport(() => Math.floor(Math.random() * 40) + 5);

  const [entityForm, setEntityForm] = useState({
    name: '', physicalTableName: '', description: '', owner: '', steward: '',
    sourceSystem: '', recordCount: '', refreshFrequency: 'Daily',
    classification: 'Internal', status: 'Active', retentionPolicy: '',
    schemaVersion: 'v1.0.0', slaTarget: '', subjectAreaId: subjectAreas[0]?.id ?? '',
  });

  const [diForm, setDiForm] = useState({
    name: '', technicalName: '', dataType: 'VARCHAR', length: '',
    nullable: 'yes', keyIndicator: '', classification: 'Internal',
    sensitivityLevel: 'Low', businessDefinition: '', format: '',
    defaultValue: '', validationRule: '', steward: '', sourceColumn: '',
    transformationLogic: '', entityId: '',
  });

  const allEntities = flattenEntities(subjectAreas);
  const setE = (k: string, v: string) => setEntityForm(f => ({ ...f, [k]: v }));
  const setD = (k: string, v: string) => setDiForm(f => ({ ...f, [k]: v }));

  const handleCreateEntity = () => {
    if (!entityForm.name || !entityForm.subjectAreaId) return;
    onCreateEntity(entityForm.subjectAreaId, {
      id: `e-${Date.now()}`,
      name: entityForm.name,
      physicalTableName: entityForm.physicalTableName || entityForm.name.toLowerCase().replace(/\s+/g, '_'),
      description: entityForm.description,
      owner: entityForm.owner, steward: entityForm.steward,
      sourceSystem: entityForm.sourceSystem,
      recordCount: entityForm.recordCount || '0',
      refreshFrequency: entityForm.refreshFrequency,
      classification: entityForm.classification as Entity['classification'],
      status: entityForm.status as Entity['status'],
      tags: [], dataItems: [],
      retentionPolicy: entityForm.retentionPolicy,
      schemaVersion: entityForm.schemaVersion, slaTarget: entityForm.slaTarget,
      qualityScore: 100,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
    onClose();
  };

  const handleCreateDataItem = () => {
    if (!diForm.name || !diForm.entityId) return;
    onCreateDataItem(diForm.entityId, {
      id: `di-${Date.now()}`,
      name: diForm.name,
      technicalName: diForm.technicalName || diForm.name.toLowerCase().replace(/\s+/g, '_'),
      dataType: diForm.dataType,
      length: diForm.length || undefined,
      nullable: diForm.nullable === 'yes',
      keyIndicator: (diForm.keyIndicator || null) as DataItem['keyIndicator'],
      classification: diForm.classification as DataItem['classification'],
      sensitivityLevel: diForm.sensitivityLevel as DataItem['sensitivityLevel'],
      businessDefinition: diForm.businessDefinition,
      format: diForm.format || undefined,
      defaultValue: diForm.defaultValue || undefined,
      validationRule: diForm.validationRule || undefined,
      steward: diForm.steward || undefined,
      sourceColumn: diForm.sourceColumn || undefined,
      transformationLogic: diForm.transformationLogic || undefined,
      allowedValues: [],
      lastModified: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={<Plus className="w-5 h-5 text-blue-600" />}
        iconWrapClass="bg-blue-50"
        title="Create New Record"
        subtitle="Add a new Entity or Data Item to the catalog"
        onClose={onClose}
      />

      {/* Controls */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50 flex-shrink-0">
        <Segmented<Method>
          value={method}
          onChange={setMethod}
          options={[
            { value: 'form', label: 'Via Form', icon: <Plus className="w-3.5 h-3.5" />, activeClass: 'bg-blue-600 text-white' },
            { value: 'excel', label: 'Via Excel', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, activeClass: 'bg-blue-600 text-white' },
          ]}
        />
        {method === 'form' && (
          <Segmented<RecordType>
            value={recordType}
            onChange={setRecordType}
            options={[
              { value: 'dataitem', label: 'Data Item', icon: <FileText className="w-3.5 h-3.5" />, activeClass: 'bg-green-600 text-white' },
              { value: 'entity', label: 'Entity', icon: <Database className="w-3.5 h-3.5" />, activeClass: 'bg-purple-600 text-white' },
            ]}
          />
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-5">
        {/* Excel import */}
        {method === 'excel' && (
          <div className="space-y-4">
            <ExcelDropzone
              accent="blue"
              idleText="Drop your file here or click to browse"
              loadingText="Processing file…"
              successText={`Imported ${imp.count} records from "${imp.fileName}"`}
              hint="Supports .xlsx, .xls, and .csv · Max 10,000 rows"
              status={imp.status}
              fileInputRef={imp.fileInputRef}
              pickFile={imp.pickFile}
              onFileChange={imp.onFileChange}
            />

            {/* Template */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expected Column Format</div>
                <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download Template
                </button>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div>
                  <span className="font-semibold text-purple-700">Entity columns:</span>{' '}
                  subject_area, name, physical_table, description, owner, steward, source_system, record_count, refresh_frequency, classification, status
                </div>
                <div>
                  <span className="font-semibold text-green-700">Data Item columns:</span>{' '}
                  subject_area, entity, name, technical_name, data_type, length, nullable, key_indicator, classification, sensitivity, definition, steward
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form — Data Item */}
        {method === 'form' && recordType === 'dataitem' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Parent Entity *</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={diForm.entityId}
                onChange={e => setD('entityId', e.target.value)}
              >
                <option value="">— Select Entity —</option>
                {allEntities.map(({ entity, subjectArea }) => (
                  <option key={entity.id} value={entity.id}>{subjectArea.name} / {entity.name}</option>
                ))}
              </select>
            </div>
            <TextField label="Business Name" required value={diForm.name} onChange={v => setD('name', v)} />
            <TextField label="Technical Name" value={diForm.technicalName} onChange={v => setD('technicalName', v)} />
            <SelectField label="Data Type" options={DATA_TYPES} value={diForm.dataType} onChange={v => setD('dataType', v)} />
            <TextField label="Length / Precision" value={diForm.length} onChange={v => setD('length', v)} />
            <SelectField label="Nullable" options={['yes', 'no']} value={diForm.nullable} onChange={v => setD('nullable', v)} />
            <SelectField label="Key Indicator" placeholder="— None —" options={KEY_INDICATORS} value={diForm.keyIndicator} onChange={v => setD('keyIndicator', v)} />
            <SelectField label="Classification" options={CLASSIFICATIONS} value={diForm.classification} onChange={v => setD('classification', v)} />
            <SelectField label="Sensitivity Level" options={SENSITIVITY_LEVELS} value={diForm.sensitivityLevel} onChange={v => setD('sensitivityLevel', v)} />
            <TextAreaField colSpan2 label="Business Definition" value={diForm.businessDefinition} onChange={v => setD('businessDefinition', v)} />
            <TextField label="Format / Pattern" value={diForm.format} onChange={v => setD('format', v)} />
            <TextField label="Default Value" value={diForm.defaultValue} onChange={v => setD('defaultValue', v)} />
            <TextField label="Data Steward" value={diForm.steward} onChange={v => setD('steward', v)} />
            <TextField label="Source Column" value={diForm.sourceColumn} onChange={v => setD('sourceColumn', v)} />
          </div>
        )}

        {/* Form — Entity */}
        {method === 'form' && recordType === 'entity' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Subject Area *</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={entityForm.subjectAreaId}
                onChange={e => setE('subjectAreaId', e.target.value)}
              >
                {subjectAreas.map(sa => <option key={sa.id} value={sa.id}>{sa.name}</option>)}
              </select>
            </div>
            <TextField label="Entity Name" required value={entityForm.name} onChange={v => setE('name', v)} />
            <TextField label="Physical Table Name" value={entityForm.physicalTableName} onChange={v => setE('physicalTableName', v)} />
            <TextField label="Owner" value={entityForm.owner} onChange={v => setE('owner', v)} />
            <TextField label="Data Steward" value={entityForm.steward} onChange={v => setE('steward', v)} />
            <TextField label="Source System" value={entityForm.sourceSystem} onChange={v => setE('sourceSystem', v)} />
            <TextField label="Record Count" value={entityForm.recordCount} onChange={v => setE('recordCount', v)} />
            <TextField label="Refresh Frequency" value={entityForm.refreshFrequency} onChange={v => setE('refreshFrequency', v)} />
            <SelectField label="Classification" options={CLASSIFICATIONS} value={entityForm.classification} onChange={v => setE('classification', v)} />
            <SelectField label="Status" options={ENTITY_STATUSES} value={entityForm.status} onChange={v => setE('status', v)} />
            <TextAreaField colSpan2 label="Description / Business Definition" value={entityForm.description} onChange={v => setE('description', v)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
        <div className="text-xs text-gray-400">* Required fields</div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          {method === 'form' && (
            <button
              onClick={recordType === 'entity' ? handleCreateEntity : handleCreateDataItem}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create {recordType === 'entity' ? 'Entity' : 'Data Item'}
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
