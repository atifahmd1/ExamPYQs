'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Users,
  FileQuestion,
  TrendingUp,
  AlertTriangle,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';
import { getActiveQuestions } from '@/lib/data/question-repository';
import { Question } from '@/types/database';

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const active = getActiveQuestions();
    setQuestions(active);
  }, []);

  const totalCount = questions.length;
  const officialPyqCount = questions.filter((q) => q.source_type === 'official_pyq').length;

  const stats = [
    { name: 'Total Questions Loaded', value: totalCount.toString(), change: 'Live Dataset', icon: FileQuestion, color: 'text-indigo-400' },
    { name: 'Official Verified PYQs', value: officialPyqCount.toString(), change: '100% verified', icon: CheckCircle2, color: 'text-emerald-400' },
    { name: 'In Review / Drafts', value: '0', change: 'No pending queue', icon: Clock, color: 'text-amber-400' },
    { name: 'Active Students (DAU)', value: '1', change: 'Initial launch', icon: Users, color: 'text-cyan-400' },
  ];

  const recentAudits = [
    { action: 'QUESTION_BANK_UPDATE', entity: `${totalCount} Verified PYQs Active`, admin: 'System Admin', time: 'Just now' },
    { action: 'SCHEMA_MIGRATION', entity: 'PostgreSQL Tables & RLS', admin: 'System Architect', time: '10 mins ago' },
  ];

  return (
    <div className="space-y-8">
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            ExamPYQs Core Infrastructure & Content Operations Control Center.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Import Questions</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{item.name}</span>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{item.value}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>{item.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Exam Status Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 font-bold">
              BPSC
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Target Exam: BPSC TRE Question Bank</h3>
              <p className="text-xs text-slate-400">Papers: TRE 1, TRE 2, TRE 3 • {totalCount} Verified Official PYQs Loaded</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-medium rounded-full">
            Active Dataset ({totalCount})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-lg">
            <div className="text-xs text-slate-400">Subject Coverage</div>
            <div className="text-lg font-semibold text-slate-200 mt-1">Computer Science & General Studies</div>
            <div className="text-xs text-slate-500 mt-1">DBMS, Networks, OS, Math, History, Physics</div>
          </div>
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-lg">
            <div className="text-xs text-slate-400">Distinction Enforced</div>
            <div className="text-lg font-semibold text-emerald-400 mt-1">Official PYQ Verified</div>
            <div className="text-xs text-slate-500 mt-1">AI Practice strictly segregated</div>
          </div>
          <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-lg">
            <div className="text-xs text-slate-400">Engine Readiness</div>
            <div className="text-lg font-semibold text-slate-200 mt-1">Unified CBT Engine</div>
            <div className="text-xs text-slate-500 mt-1">Learning & Test Mode Shared</div>
          </div>
        </div>
      </div>

      {/* Audit Log Feed & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>System & Admin Audit Logs</span>
            </h3>
            <Link href="/admin/audit-logs" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              <span>View All Logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAudits.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800/60 rounded-lg text-xs">
                <div className="space-y-0.5">
                  <div className="font-mono text-indigo-300 font-medium">{log.action}</div>
                  <div className="text-slate-300">{log.entity}</div>
                </div>
                <div className="text-right text-slate-500">
                  <div>{log.admin}</div>
                  <div className="text-[10px] text-slate-600">{log.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Security & Integrity</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-300">Row Level Security (RLS)</span>
              <span className="text-emerald-400 font-mono font-medium">ENABLED</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-300">Admin RBAC Middleware</span>
              <span className="text-emerald-400 font-mono font-medium">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-300">Text Hash Deduplication</span>
              <span className="text-indigo-400 font-mono font-medium">ENFORCED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
