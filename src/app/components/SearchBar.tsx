import { Search, SlidersHorizontal, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onAdvancedSearch: () => void;
  resultCount?: number;
  totalCount?: number;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onAdvancedSearch, resultCount, totalCount, placeholder }: SearchBarProps) {
  const hasQuery = value.trim().length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Search data items by business name…'}
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow hover:shadow-md"
        />
        {hasQuery && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <button
        onClick={onAdvancedSearch}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-colors shadow-sm whitespace-nowrap"
      >
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        Advanced Search
      </button>

      {hasQuery && resultCount !== undefined && totalCount !== undefined && (
        <div className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
          <span className="font-semibold text-gray-800">{resultCount}</span>
          <span className="text-gray-400"> / {totalCount}</span>
        </div>
      )}
    </div>
  );
}
