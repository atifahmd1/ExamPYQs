'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  getActiveQuestions,
  getUniqueSubjects,
  getUniqueExamPapers,
} from '@/lib/data/question-repository';
import { Question } from '@/types/database';
import { QUESTION_STATUS_LABELS, SOURCE_TYPE_LABELS } from '@/lib/constants';

function QuestionsTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [papersList, setPapersList] = useState<string[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const refreshData = () => {
    const active = getActiveQuestions();
    setQuestions(active);
    setSubjectsList(getUniqueSubjects());
    setPapersList(getUniqueExamPapers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Synchronize state from URL query parameters (or fallback to sessionStorage)
  useEffect(() => {
    const pPage = searchParams.get('page');
    const pSubj = searchParams.get('subject');
    const pPaper = searchParams.get('paper');
    const pSearch = searchParams.get('search');
    const pSource = searchParams.get('source');
    const pStatus = searchParams.get('status');

    const hasUrlParams = Boolean(pPage || pSubj || pPaper || pSearch || pSource || pStatus);

    if (!hasUrlParams && typeof window !== 'undefined') {
      const savedQuery = sessionStorage.getItem('exampyqs_admin_questions_query');
      if (savedQuery) {
        router.replace(`/admin/questions?${savedQuery}`, { scroll: false });
        return;
      }
    }

    if (pPage) {
      const parsed = parseInt(pPage, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setCurrentPage(parsed);
      }
    } else {
      setCurrentPage(1);
    }

    setSelectedSubject(pSubj || '');
    setSelectedPaper(pPaper || '');
    setSearchQuery(pSearch || '');
    setSourceFilter(pSource || '');
    setStatusFilter(pStatus || '');
  }, [searchParams, router]);

  // Helper to persist state to URL and sessionStorage
  const updateUrlAndStorage = (
    page: number,
    subj: string,
    paper: string,
    search: string,
    source: string,
    status: string
  ) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (subj) params.set('subject', subj);
    if (paper) params.set('paper', paper);
    if (search) params.set('search', search);
    if (source) params.set('source', source);
    if (status) params.set('status', status);

    const qStr = params.toString();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('exampyqs_admin_questions_query', qStr);
    }

    const newUrl = `/admin/questions${qStr ? `?${qStr}` : ''}`;
    router.replace(newUrl, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateUrlAndStorage(newPage, selectedSubject, selectedPaper, searchQuery, sourceFilter, statusFilter);
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setCurrentPage(1);
    updateUrlAndStorage(1, val, selectedPaper, searchQuery, sourceFilter, statusFilter);
  };

  const handlePaperChange = (val: string) => {
    setSelectedPaper(val);
    setCurrentPage(1);
    updateUrlAndStorage(1, selectedSubject, val, searchQuery, sourceFilter, statusFilter);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlAndStorage(1, selectedSubject, selectedPaper, val, sourceFilter, statusFilter);
  };

  const handleSourceChange = (val: string) => {
    setSourceFilter(val);
    setCurrentPage(1);
    updateUrlAndStorage(1, selectedSubject, selectedPaper, searchQuery, val, statusFilter);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
    updateUrlAndStorage(1, selectedSubject, selectedPaper, searchQuery, sourceFilter, val);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSubject('');
    setSelectedPaper('');
    setSourceFilter('');
    setStatusFilter('');
    setCurrentPage(1);
    updateUrlAndStorage(1, '', '', '', '', '');
  };

  const normalizeStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Filter logic
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.official_source_ref && q.official_source_ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.subject_id && q.subject_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const qSubj = normalizeStr(q.subject_id || '');
    const targetSubj = normalizeStr(selectedSubject);
    const matchesSubject =
      !selectedSubject ||
      qSubj.includes(targetSubj) ||
      targetSubj.includes(qSubj) ||
      q.tags?.some((t) => normalizeStr(t).includes(targetSubj));

    const qPaperRef = normalizeStr(`${q.paper_id || ''} ${q.official_source_ref || ''}`);
    const targetPaper = normalizeStr(selectedPaper);
    const matchesPaper =
      !selectedPaper || qPaperRef.includes(targetPaper) || targetPaper.includes(qPaperRef);

    const matchesSource = !sourceFilter || q.source_type === sourceFilter;
    const matchesStatus = !statusFilter || q.status === statusFilter;

    return matchesSearch && matchesSubject && matchesPaper && matchesSource && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = filteredQuestions.slice((activePage - 1) * pageSize, activePage * pageSize);

  const hasActiveFilters = Boolean(
    searchQuery || selectedSubject || selectedPaper || sourceFilter || statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Bank Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, inspect, filter, and edit questions ({filteredQuestions.length} of {questions.length} Questions Displayed).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions/import"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import New Paper</span>
          </Link>

          <Link
            href="/admin/questions/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search question text or ref..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Subjects ({subjectsList.length})</option>
              {subjectsList.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            {/* Exam Paper Filter */}
            <select
              value={selectedPaper}
              onChange={(e) => handlePaperChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Exam Papers ({papersList.length})</option>
              {papersList.map((paper) => (
                <option key={paper} value={paper}>
                  {paper}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Sources</option>
              <option value="official_pyq">Official PYQ Only</option>
              <option value="ai_generated">AI Practice Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="review">In Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Filter Badges Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-900">
            <span className="font-semibold text-slate-400">Filtered by:</span>

            {selectedSubject && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-200 font-mono text-xs">
                <span>Subject: {selectedSubject}</span>
                <button
                  onClick={() => handleSubjectChange('')}
                  className="hover:text-white p-0.5 rounded hover:bg-indigo-900"
                  title="Remove Subject Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPaper && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-200 font-mono text-xs">
                <span>Paper: {selectedPaper}</span>
                <button
                  onClick={() => handlePaperChange('')}
                  className="hover:text-white p-0.5 rounded hover:bg-indigo-900"
                  title="Remove Paper Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs">
                <span>Search: "{searchQuery}"</span>
                <button
                  onClick={() => handleSearchChange('')}
                  className="hover:text-white p-0.5 rounded hover:bg-slate-800"
                  title="Clear Search Query"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {sourceFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-200 font-mono text-xs">
                <span>Source: {sourceFilter}</span>
                <button
                  onClick={() => handleSourceChange('')}
                  className="hover:text-white p-0.5 rounded hover:bg-purple-900"
                  title="Remove Source Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs">
                <span>Status: {statusFilter}</span>
                <button
                  onClick={() => handleStatusChange('')}
                  className="hover:text-white p-0.5 rounded hover:bg-slate-800"
                  title="Remove Status Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Questions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-medium">
              <tr>
                <th className="py-3.5 px-4">Ref / Code</th>
                <th className="py-3.5 px-4">Question Text</th>
                <th className="py-3.5 px-4">Subject & Tags</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedQuestions.map((q) => {
                const statusInfo = QUESTION_STATUS_LABELS[q.status] || QUESTION_STATUS_LABELS.published;
                const sourceInfo = SOURCE_TYPE_LABELS[q.source_type] || SOURCE_TYPE_LABELS.official_pyq;

                const editParams = new URLSearchParams();
                if (activePage > 1) editParams.set('page', activePage.toString());
                if (selectedSubject) editParams.set('subject', selectedSubject);
                if (selectedPaper) editParams.set('paper', selectedPaper);
                if (searchQuery) editParams.set('search', searchQuery);
                if (sourceFilter) editParams.set('source', sourceFilter);
                if (statusFilter) editParams.set('status', statusFilter);

                const editQueryStr = editParams.toString();
                const editUrl = `/admin/questions/${q.id}${editQueryStr ? `?${editQueryStr}` : ''}`;

                return (
                  <tr key={q.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-indigo-300 whitespace-nowrap">
                      {q.official_source_ref || 'Official PYQ'}
                    </td>
                    <td className="py-4 px-4 max-w-md text-slate-200">
                      <p className="line-clamp-2">{q.question_text}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-xs">
                      <div className="font-semibold text-slate-200 capitalize">{q.subject_id || 'General'}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[150px]">
                        {q.tags?.join(', ') || 'PYQ'}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${sourceInfo.badge}`}>
                        {q.source_type === 'official_pyq' ? (
                          <ShieldCheck className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-purple-400" />
                        )}
                        {sourceInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-medium border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap text-xs">
                      <Link
                        href={editUrl}
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Showing {paginatedQuestions.length > 0 ? (activePage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(activePage * pageSize, filteredQuestions.length)} of {filteredQuestions.length} entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="p-1.5 rounded border border-slate-800 bg-slate-950 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {activePage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="p-1.5 rounded border border-slate-800 bg-slate-950 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminQuestionsPage() {
  return (
    <Suspense fallback={<div className="text-white text-xs p-4">Loading questions management...</div>}>
      <QuestionsTableContent />
    </Suspense>
  );
}
