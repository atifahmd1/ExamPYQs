import { ShieldCheck, UserCheck, Calendar } from 'lucide-react';

export default function AuditLogsPage() {
  const logs = [
    {
      id: 'log-1',
      action: 'INITIAL_SEED_IMPORT',
      entity_type: 'questions',
      entity_id: 'bpsc-tre-3-cs',
      admin: 'System Architect',
      timestamp: '2026-09-28 08:25:00',
      payload: { imported_count: 360, paper: 'BPSC TRE 3.0 Computer Science' },
    },
    {
      id: 'log-2',
      action: 'SCHEMA_MIGRATION_EXECUTE',
      entity_type: 'database',
      entity_id: '20260928000000_initial_schema',
      admin: 'Database Admin',
      timestamp: '2026-09-28 08:20:00',
      payload: { rls_enabled: true, tables_created: 18 },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Audit Logs</h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete, unalterable trail of administrative mutations, question publications, and security events.
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-medium">
              <tr>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Payload Details</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-xs font-semibold text-indigo-400">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                      <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-slate-300">
                    <div>{log.entity_type}</div>
                    <div className="text-[11px] text-slate-500">{log.entity_id}</div>
                  </td>
                  <td className="py-4 px-4 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{log.admin}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                    {JSON.stringify(log.payload)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
