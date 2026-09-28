'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  LogOut,
  Filter,
  Search,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Question } from '@/types/database';
import { getActiveQuestions } from '@/lib/data/question-repository';
import {
  getUserAttempts,
  getQuestionStatus,
  filterQuestions,
  getQuestionYear,
  UserQuestionAttempt,
  QuestionFilterCriteria,
} from '@/lib/data/user-attempts';

export default function HomePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null);

  // Question bank & user attempt state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, UserQuestionAttempt>>({});

  // Filter state
  const [examFilter, setExamFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Check dev role or auth session
    if (typeof window !== 'undefined') {
      const cookies = document.cookie || '';
      if (cookies.includes('exampyqs_dev_role=admin')) {
        setUserRole('admin');
      }
    }

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          if (session.user.email?.toLowerCase().includes('admin')) {
            setUserRole('admin');
          } else {
            setUserRole('student');
          }
        }
      });
    } catch {
      // Ignore if Supabase is not connected in local dev
    }

    // Load active questions and user attempts from localStorage
    const active = getActiveQuestions();
    setQuestions(active);

    const attempts = getUserAttempts();
    setAttemptsMap(attempts);
  }, []);

  const handleSignOut = async () => {
    document.cookie = 'exampyqs_dev_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore fallback
    }
    setUserRole(null);
    router.push('/');
    router.refresh();
  };

  // Extract unique filter dropdown values from questions
  const availableExams = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.paper_id) set.add(q.paper_id);
      else if (q.exam_id) set.add(q.exam_id);
    });
    return Array.from(set).sort();
  }, [questions]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.subject_id) set.add(q.subject_id);
    });
    return Array.from(set).sort();
  }, [questions]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (subjectFilter !== 'all' && q.subject_id !== subjectFilter) return;
      if (q.topic_id) set.add(q.topic_id);
      if (q.chapter_id) set.add(q.chapter_id);
    });
    return Array.from(set).sort();
  }, [questions, subjectFilter]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const yr = getQuestionYear(q);
      if (yr) set.add(yr);
    });
    return Array.from(set).sort().reverse();
  }, [questions]);

  // Compute filtered question list
  const filteredQuestions = useMemo(() => {
    const criteria: QuestionFilterCriteria = {
      exam: examFilter,
      subject: subjectFilter,
      topic: topicFilter,
      difficulty: difficultyFilter,
      year: yearFilter,
      status: statusFilter,
      searchQuery: searchQuery,
    };
    return filterQuestions(questions, criteria, attemptsMap);
  }, [
    questions,
    attemptsMap,
    examFilter,
    subjectFilter,
    topicFilter,
    difficultyFilter,
    yearFilter,
    statusFilter,
    searchQuery,
  ]);

  // Compute status metrics for filtered subset
  const stats = useMemo(() => {
    let solved = 0;
    let attempted = 0;
    let notAttempted = 0;

    filteredQuestions.forEach((q) => {
      const st = getQuestionStatus(q.id, attemptsMap);
      if (st === 'solved') solved++;
      else if (st === 'attempted') attempted++;
      else notAttempted++;
    });

    return { total: filteredQuestions.length, solved, attempted, notAttempted };
  }, [filteredQuestions, attemptsMap]);

  const handleResetFilters = () => {
    setExamFilter('all');
    setSubjectFilter('all');
    setTopicFilter('all');
    setDifficultyFilter('all');
    setYearFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  // Launch Learning Mode with current active filters starting at target question
  const handleOpenQuestionInLearningMode = (targetQuestionId: string) => {
    const queryParams = new URLSearchParams();
    queryParams.set('questionId', targetQuestionId);
    if (examFilter !== 'all') queryParams.set('exam', examFilter);
    if (subjectFilter !== 'all') queryParams.set('subject', subjectFilter);
    if (topicFilter !== 'all') queryParams.set('topic', topicFilter);
    if (difficultyFilter !== 'all') queryParams.set('difficulty', difficultyFilter);
    if (yearFilter !== 'all') queryParams.set('year', yearFilter);
    if (statusFilter !== 'all') queryParams.set('status', statusFilter);
    if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

    router.push(`/learn/bpsc-tre-cs?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>ExamPYQs</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              Admin Portal
            </Link>

            {userRole === 'admin' ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-mono font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Signed In</span>
                </span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : userRole === 'student' ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-mono font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Student Signed In</span>
                </span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950 border border-indigo-800 text-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Exam: BPSC TRE Computer Science & General Studies</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Master Previous Year Questions with Interactive Learning
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Practice authentic official PYQs. Filter questions by Exam, Subject, Topic, Difficulty & Status. Jump straight into untimed Learning Mode with option-wise explanations.
          </p>
        </div>

        {/* Core Modes Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Mode Card */}
          <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all shadow-sm hover:shadow-indigo-500/5 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-semibold rounded-full">
                  Untimed Practice
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  1. Learning Mode
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Question-by-question interactive practice. Submit answer → view immediate feedback → read option-wise explanations → continue smoothly without timer pressure.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immediate correct/incorrect response</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Comprehensive option A, B, C, D, E explanations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Filter-based custom learning sets</span>
                </li>
              </ul>
            </div>

            <Link
              href="/learn/bpsc-tre-cs"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
            >
              <span>Start Learning Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Test Mode Card */}
          <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold rounded-full">
                  CBT Environment
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  2. Full Test Mode
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Real Computer-Based Test experience with exam countdown timer, question palette, mark for review, and full score analysis at completion.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Timed exam simulation with palette navigation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Negative marking evaluation logic</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Detailed scorecard & question review</span>
                </li>
              </ul>
            </div>

            <Link
              href="/test/bpsc-tre-cs"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm rounded-xl transition-colors"
            >
              <span>Launch CBT Test Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dynamic Question Set Section */}
        <section id="question-set" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-400" />
                <span>Question Set Bank</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Browse questions by serial number, track attempt statuses, filter by multiple criteria, and jump straight into Learning Mode.
              </p>
            </div>

            {/* Quick Status Stats Summary Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-500">Total:</span>
                <span className="font-bold text-white">{stats.total}</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Solved:</span>
                <span className="font-bold">{stats.solved}</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-amber-400" />
                <span>Attempted:</span>
                <span className="font-bold">{stats.attempted}</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Not Attempted:</span>
                <span className="font-bold">{stats.notAttempted}</span>
              </span>
            </div>
          </div>

          {/* Filters Control Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-400" />
                <span>Filter Questions</span>
              </div>

              {(examFilter !== 'all' ||
                subjectFilter !== 'all' ||
                topicFilter !== 'all' ||
                difficultyFilter !== 'all' ||
                yearFilter !== 'all' ||
                statusFilter !== 'all' ||
                searchQuery !== '') && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Exam Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Exam / Paper</label>
                <select
                  value={examFilter}
                  onChange={(e) => setExamFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Exams</option>
                  {availableExams.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Subject</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setTopicFilter('all');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter / Topic Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Chapter / Topic</label>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Topics</option>
                  {availableTopics.map((top) => (
                    <option key={top} value={top}>
                      {top}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Attempt Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="solved">Solved (Correct)</option>
                  <option value="attempted">Attempted (Wrong)</option>
                  <option value="not_attempted">Not Attempted</option>
                </select>
              </div>
            </div>

            {/* Keyword Search Input */}
            <div className="relative pt-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search questions by text, code or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Questions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">S.No.</th>
                    <th className="py-3.5 px-4 w-32">Status</th>
                    <th className="py-3.5 px-4">Question & Reference</th>
                    <th className="py-3.5 px-4 w-44">Subject / Topic</th>
                    <th className="py-3.5 px-4 w-28">Difficulty</th>
                    <th className="py-3.5 px-4 w-36 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 space-y-3">
                        <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold">No questions match your selected filters.</p>
                        <button
                          onClick={handleResetFilters}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q, idx) => {
                      const status = getQuestionStatus(q.id, attemptsMap);
                      const yr = getQuestionYear(q);

                      return (
                        <tr
                          key={q.id}
                          onClick={() => handleOpenQuestionInLearningMode(q.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          {/* Serial Number */}
                          <td className="py-4 px-4 text-center font-mono font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                            #{idx + 1}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4">
                            {status === 'solved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Solved
                              </span>
                            ) : status === 'attempted' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950 border border-amber-800 text-amber-300">
                                <X className="w-3 h-3 text-amber-400" />
                                Attempted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                                Not Attempted
                              </span>
                            )}
                          </td>

                          {/* Question Text & Official Ref */}
                          <td className="py-4 px-4 space-y-1.5 max-w-md">
                            <p className="font-medium text-slate-100 line-clamp-2 leading-relaxed group-hover:text-indigo-300 transition-colors">
                              {q.question_text}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                                {q.paper_id || q.exam_id}
                              </span>
                              <span className="text-slate-500">
                                {q.official_source_ref || `Ref #${q.id.slice(-4)}`}
                              </span>
                              <span className="text-slate-500">({yr})</span>
                            </div>
                          </td>

                          {/* Subject & Topic */}
                          <td className="py-4 px-4 space-y-1">
                            <div className="font-semibold text-slate-200">{q.subject_id}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {q.topic_id || q.chapter_id || 'General Topic'}
                            </div>
                          </td>

                          {/* Difficulty Badge */}
                          <td className="py-4 px-4">
                            {q.difficulty === 'easy' ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase font-mono bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                                Easy
                              </span>
                            ) : q.difficulty === 'hard' ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase font-mono bg-red-950/80 border border-red-800 text-red-300">
                                Hard
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase font-mono bg-amber-950/80 border border-amber-800 text-amber-300">
                                Medium
                              </span>
                            )}
                          </td>

                          {/* Action Link */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuestionInLearningMode(q.id);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 group-hover:translate-x-0.5 transition-all"
                            >
                              <span>Solve</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Product Distinction Highlight */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Strict Content Authenticity Distinction</span>
              <p className="text-slate-400 mt-0.5">
                Official source-backed PYQs are clearly labeled with source paper details. AI-generated practice questions are strictly marked as AI Practice.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">Official PYQ</span>
            <span className="px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">AI Practice</span>
          </div>
        </div>
      </main>

      {/* Simple Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>ExamPYQs — Serious Competitive Exam Preparation • Designed Mobile-First</p>
      </footer>
    </div>
  );
}
