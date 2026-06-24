import { BookOpen, Database, ShieldCheck, UserCog } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: 'board' | 'dgo' | 'hod') => void;
}

export function LandingPage({ onSelectRole }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 bg-blue-600 rounded-xl">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900 tracking-tight">DictCentral</span>
      </div>
      <p className="text-sm text-gray-500 mb-12">Enterprise Data Dictionary Platform</p>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl">
        {/* Board Member */}
        <button
          onClick={() => onSelectRole('board')}
          className="group bg-white border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:border-blue-500"
        >
          <div className="p-3 bg-blue-50 rounded-xl w-fit mb-5 group-hover:bg-blue-100 transition-colors">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1.5">Board Member</div>
          <div className="text-sm text-gray-500 leading-relaxed">
            UDP Board Member
          </div>
          <div className="mt-6 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
            Enter portal →
          </div>
        </button>

        {/* DGO */}
        <button
          onClick={() => onSelectRole('dgo')}
          className="group bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl p-8 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:border-emerald-500"
        >
          <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-5 group-hover:bg-emerald-100 transition-colors">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1.5">DGO</div>
          <div className="text-sm text-gray-500 leading-relaxed">
            Data Governance Officer
          </div>
          <div className="mt-6 text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
            Enter portal →
          </div>
        </button>

        {/* HOD */}
        <button
          onClick={() => onSelectRole('hod')}
          className="group bg-white border-2 border-gray-200 hover:border-indigo-500 rounded-2xl p-8 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:border-indigo-500"
        >
          <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-5 group-hover:bg-indigo-100 transition-colors">
            <UserCog className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1.5">HOD</div>
          <div className="text-sm text-gray-500 leading-relaxed">
            Head of Department
          </div>
          <div className="mt-6 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
            Enter portal →
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-10">Select your role to continue</p>
    </div>
  );
}
