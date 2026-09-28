import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  HelpCircle,
  UploadCloud,
  History,
  Shield,
  ExternalLink,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Bulk Import', href: '/admin/questions/import', icon: UploadCloud },
    { name: 'Exams & Papers', href: '/admin/exams', icon: FileText },
    { name: 'Subjects & Topics', href: '/admin/subjects', icon: BookOpen },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand logo & Badge */}
          <div className="flex items-center justify-between px-2 py-3 border-b border-slate-800 mb-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-white tracking-tight">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>ExamPYQs <span className="text-xs text-indigo-400 font-mono px-1.5 py-0.5 bg-indigo-950 border border-indigo-800 rounded">ADMIN</span></span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 rounded border border-slate-800 transition-colors"
          >
            <span>View Student Platform</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <div className="px-3 py-1.5 text-[11px] text-slate-500 font-mono">
            Environment: Production Ready
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-900 overflow-y-auto">
        <header className="h-14 border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-slate-200">Management Portal</h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950 border border-emerald-800 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              System Online
            </span>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
