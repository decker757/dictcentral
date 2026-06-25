// The sticky top header shared by all three portals: the DictCentral brand
// mark, a pill-style tab switcher, and a right-hand action slot (each portal
// supplies its own — Board/DGO get Edit+Create+Leave, HOD just gets Leave).
// Tabs render unconditionally regardless of which is active, and the action
// slot is a fixed prop (not conditional on the tab) so the header never
// reflows when switching tabs — that exact bug (DGO's Edit/Create buttons
// used to only render on the Catalog tab, shifting "Leave" sideways) is why
// this component pins both down structurally instead of leaving it to each
// portal to remember.

import { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

export interface PortalHeaderTab<T extends string> {
  key: T;
  label: string;
  icon?: ReactNode;
  /** `corner`: a small red dot pinned to the tab's top-right corner (the review-queue
   * convention). `inline`: an amber pill sitting right after the label (the "my requests"
   * convention). */
  badge?: { count: number; variant: 'corner' | 'inline' };
}

interface PortalHeaderProps<T extends string> {
  activeTab: T;
  onTabChange: (tab: T) => void;
  tabs: PortalHeaderTab<T>[];
  actions: ReactNode;
}

export function PortalHeader<T extends string>({ activeTab, onTabChange, tabs, actions }: PortalHeaderProps<T>) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">DictCentral</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                  activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && tab.badge.count > 0 && tab.badge.variant === 'inline' && (
                  <span className="w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge.count}
                  </span>
                )}
                {tab.badge && tab.badge.count > 0 && tab.badge.variant === 'corner' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right-hand actions — portal-specific, always rendered (see header comment above) */}
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </div>
    </header>
  );
}
