'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getActiveQuestions, deleteQuestionPaper } from '@/lib/data/question-repository';

export default function AdminExamsPage() {
  const [examPapers, setExamPapers] = useState<any[]>([]);
  const [dropTargetPaper, setDropTargetPaper] = useState<any | null>(null);

  const refreshPapers = () => {
    const questions = getActiveQuestions();
    const paperMap: Record<string, { count: number; exam: string }> = {};

    questions.forEach((q) => {
      const paperName = q.paper_id || 'BPSC TRE';
      if (!paperMap[paperName]) {
        paperMap[paperName] = {
          count: 0,
          exam: q.exam_id || 'BPSC TRE',
        };
      }
      paperMap[paperName].count += 1;
    });

    const list = Object.entries(paperMap).map(([title, data], idx) => ({
      id: `paper-${idx}`,
      title,
      exam: data.exam,
      questionCount: data.count,
      status: 'published',
    }));

    setExamPapers(list);
  };

  useEffect(() => {
    refreshPapers();
  }, []);

  const handleConfirmDropPaper = () => {
    if (dropTargetPaper) {
      deleteQuestionPaper(dropTargetPaper.title);
      setDropTargetPaper(null);
      refreshPapers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Exams & Papers Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, manage, and drop question papers across all competitive exams ({examPapers.length} Papers Active).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Import New Paper</span>
          </Link>
        </div>
      </div>

      {/* Exam Papers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examPapers.map((paper) => (
          <div key={paper.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-mono font-bold rounded uppercase">
                  {paper.exam}
                </span>
                <button
                  onClick={() => setDropTargetPaper(paper)}
                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-400 hover:text-red-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Drop Paper"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Drop Paper</span>
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white leading-snug">{paper.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{paper.questionCount} Official PYQs Loaded</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Marking: +1.0 / -0.25</span>
              <Link
                href={`/admin/questions?paper=${encodeURIComponent(paper.title)}`}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal for Dropping Question Paper */}
      {dropTargetPaper && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Drop Entire Question Paper?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-white">"{dropTargetPaper.title}"</strong> and all its <strong className="text-white">{dropTargetPaper.questionCount} questions</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDropTargetPaper(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDropPaper}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Confirm Drop Paper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
