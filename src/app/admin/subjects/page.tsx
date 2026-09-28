'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { getActiveQuestions } from '@/lib/data/question-repository';

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const questions = getActiveQuestions();
    const subjMap: Record<string, number> = {};

    questions.forEach((q) => {
      const subj = q.subject_id || 'General Studies';
      subjMap[subj] = (subjMap[subj] || 0) + 1;
    });

    const list = Object.entries(subjMap).map(([title, count], idx) => ({
      id: `subj-${idx}`,
      title,
      questionCount: count,
    }));

    setSubjects(list);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subjects & Topics Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse subjects, chapters, and topic breakdowns for syllabus indexing ({subjects.length} Subjects Active).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Import Subject Items</span>
          </Link>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subj) => (
          <div key={subj.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white capitalize">{subj.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{subj.questionCount} Questions</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Syllabus Indexed</span>
              <Link
                href={`/admin/questions?subject=${encodeURIComponent(subj.title)}`}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
