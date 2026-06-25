// The footer credit line shared by all three portals — just identifies
// which portal you're in. Carries `relative z-40` unconditionally so it
// always sits above a portal's sticky bottom action bar, if it has one
// (DGO/HOD do, Board doesn't — harmless either way).

export function PortalFooter({ label }: { label: string }) {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto relative z-40">
      <div className="max-w-[1600px] mx-auto px-6 py-3 text-xs text-gray-400">
        <span>DictCentral · {label}</span>
      </div>
    </footer>
  );
}
