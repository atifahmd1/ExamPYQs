export const APP_NAME = 'ExamPYQs';
export const APP_DESCRIPTION = 'Interactive Previous Year Questions Platform for Competitive Exams';

export const INITIAL_EXAM_CODE = 'bpsc';
export const INITIAL_PAPER_CODE = 'tre-3-cs-2024';

export const QUESTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  review: { label: 'In Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  published: { label: 'Published', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const SOURCE_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  official_pyq: { label: 'Official PYQ', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ai_generated: { label: 'AI Practice', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const DEFAULT_PAGINATION_LIMIT = 20;
