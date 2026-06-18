// Shared mock Excel-import dropzone, used by both Create and Edit modals.
// (Import is simulated — there is no backend.)

import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export function useExcelImport(onSuccess?: () => number) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [fileName, setFileName] = useState('');
  const [count, setCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = () => { setStatus('idle'); fileInputRef.current?.click(); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { setStatus('error'); return; }
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      if (onSuccess) setCount(onSuccess());
    }, 1500);
  };

  return { status, fileName, count, fileInputRef, pickFile, onFileChange };
}

type Accent = 'blue' | 'orange';
const ACCENT: Record<Accent, { hover: string; loadingBg: string }> = {
  blue: { hover: 'hover:border-blue-400 hover:bg-blue-50/20', loadingBg: 'bg-blue-50' },
  orange: { hover: 'hover:border-orange-400 hover:bg-orange-50/20', loadingBg: 'bg-orange-50' },
};

interface ExcelDropzoneProps {
  accent: Accent;
  hint: string;
  idleText: string;
  loadingText: string;
  successText: string;
  status: ImportStatus;
  fileInputRef: React.RefObject<HTMLInputElement>;
  pickFile: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ExcelDropzone({
  accent, hint, idleText, loadingText, successText,
  status, fileInputRef, pickFile, onFileChange,
}: ExcelDropzoneProps) {
  const iconBg = status === 'success' ? 'bg-green-50' : status === 'loading' ? ACCENT[accent].loadingBg : 'bg-gray-50';
  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors ${ACCENT[accent].hover}`}
        onClick={pickFile}
      >
        <div className={`p-4 rounded-full ${iconBg}`}>
          {status === 'success'
            ? <CheckCircle className="w-8 h-8 text-green-500" />
            : <Upload className="w-8 h-8 text-gray-400" />}
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-700">
            {status === 'idle' && idleText}
            {status === 'loading' && loadingText}
            {status === 'success' && successText}
            {status === 'error' && 'Unsupported file format'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{hint}</div>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">Please upload an .xlsx, .xls, or .csv file.</span>
        </div>
      )}
    </div>
  );
}
