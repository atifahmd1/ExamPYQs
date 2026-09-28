'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  Check,
  X,
  BarChart2,
  Filter,
} from 'lucide-react';
import { getActiveQuestions } from '@/lib/data/question-repository';
import { evaluateQuestionAnswer, EvaluationResult } from '@/lib/engine/quiz-engine';
import { Question, QuestionOption } from '@/types/database';
import {
  getUserAttempts,
  recordUserAttempt,
  filterQuestions,
  QuestionFilterCriteria,
  UserQuestionAttempt,
} from '@/lib/data/user-attempts';

function LearningModeContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const examCode = (params?.examCode as string) || 'bpsc-tre-cs';

  // Read filter searchParams
  const initialQuestionId = searchParams.get('questionId');
  const examFilter = searchParams.get('exam') || 'all';
  const subjectFilter = searchParams.get('subject') || 'all';
  const topicFilter = searchParams.get('topic') || 'all';
  const difficultyFilter = searchParams.get('difficulty') || 'all';
  const yearFilter = searchParams.get('year') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const searchQuery = searchParams.get('search') || '';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, UserQuestionAttempt>>({});

  // User state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Cumulative progress counters
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  useEffect(() => {
    const allActive = getActiveQuestions();
    const attempts = getUserAttempts();
    setAttemptsMap(attempts);

    const criteria: QuestionFilterCriteria = {
      exam: examFilter,
      subject: subjectFilter,
      topic: topicFilter,
      difficulty: difficultyFilter,
      year: yearFilter,
      status: statusFilter,
      searchQuery: searchQuery,
    };

    const filtered = filterQuestions(allActive, criteria, attempts);
    const finalSet = filtered.length > 0 ? filtered : allActive;
    setQuestions(finalSet);

    // Locate initial question index if requested
    if (initialQuestionId) {
      const idx = finalSet.findIndex((q) => q.id === initialQuestionId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(0);
    }
  }, [
    initialQuestionId,
    examFilter,
    subjectFilter,
    topicFilter,
    difficultyFilter,
    yearFilter,
    statusFilter,
    searchQuery,
  ]);

  const currentQuestion = questions[currentIndex];
  const isBookmarked = currentQuestion ? bookmarkedIds.has(currentQuestion.id) : false;

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    setSelectedOptionId(optId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isSubmitted || !currentQuestion) return;

    const result = evaluateQuestionAnswer(
      currentQuestion,
      currentQuestion.options || [],
      selectedOptionId
    );

    setEvaluation(result);
    setIsSubmitted(true);

    if (result.isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }

    // Record attempt for anonymous / logged in user session
    const nextAttempts = recordUserAttempt(currentQuestion.id, result.isCorrect, selectedOptionId);
    setAttemptsMap(nextAttempts);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setEvaluation(null);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setEvaluation(null);
    setCorrectCount(0);
    setIncorrectCount(0);
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;
    const next = new Set(bookmarkedIds);
    if (next.has(currentQuestion.id)) {
      next.delete(currentQuestion.id);
    } else {
      next.add(currentQuestion.id);
    }
    setBookmarkedIds(next);
  };

  const attemptedCount = correctCount + incorrectCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  const activeFilterLabels = [
    examFilter !== 'all' ? `Exam: ${examFilter}` : null,
    subjectFilter !== 'all' ? `Subject: ${subjectFilter}` : null,
    topicFilter !== 'all' ? `Topic: ${topicFilter}` : null,
    difficultyFilter !== 'all' ? `Difficulty: ${difficultyFilter}` : null,
    yearFilter !== 'all' ? `Year: ${yearFilter}` : null,
    statusFilter !== 'all' ? `Status: ${statusFilter}` : null,
  ].filter(Boolean);

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <h2 className="text-xl font-bold text-white">Loading question set...</h2>
        <Link href="/" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Learning Header (NO TIMER) */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Learning</span>
          </Link>

          {/* Progress Indicators Bar */}
          <div className="flex items-center gap-3 sm:gap-6 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-500">Q:</span>
              <span className="font-bold text-white">{currentIndex + 1}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{questions.length}</span>
              {activeFilterLabels.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-sans border border-indigo-800 hidden sm:inline-block">
                  Filtered Set
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{correctCount}</span>
              </div>
              <div className="flex items-center gap-1 text-red-400 font-medium">
                <X className="w-3.5 h-3.5" />
                <span>{incorrectCount}</span>
              </div>
              <div className="flex items-center gap-1 text-indigo-400 font-medium border-l border-slate-800 pl-3">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{accuracy}% Accuracy</span>
              </div>
            </div>
          </div>

          {/* Bookmark Action */}
          <button
            onClick={toggleBookmark}
            title="Bookmark Question"
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </header>

      {/* Filter Badges Bar if user filtered questions */}
      {activeFilterLabels.length > 0 && (
        <div className="bg-indigo-950/40 border-b border-indigo-900/60 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap text-xs">
            <span className="text-indigo-300 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Active Filter:
            </span>
            {activeFilterLabels.map((label, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-md bg-indigo-900/80 border border-indigo-700 text-indigo-200 text-[11px] font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Question Card Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Source Authenticity Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            {currentQuestion.source_type === 'official_pyq' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950 border border-indigo-800 text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Official Source-Backed PYQ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950 border border-purple-800 text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                AI Practice Question
              </span>
            )}
            <span className="font-mono text-slate-400 text-[11px]">
              {currentQuestion.paper_id || currentQuestion.official_source_ref || 'Reference PYQ'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Marks: +{currentQuestion.marks} | -{currentQuestion.negative_marks}
          </div>
        </div>

        {/* Question Statement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed tracking-tight">
            {currentQuestion.question_text}
          </h2>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options?.map((opt: QuestionOption) => {
              const isSelected = selectedOptionId === opt.id;
              let optionStyle = 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200';
              let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

              if (isSubmitted) {
                if (opt.is_correct) {
                  optionStyle = 'bg-emerald-950/60 border-emerald-600 text-emerald-100 font-medium ring-1 ring-emerald-500/50';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-500';
                } else if (isSelected && !opt.is_correct) {
                  optionStyle = 'bg-red-950/60 border-red-600 text-red-100 ring-1 ring-red-500/50';
                  badgeStyle = 'bg-red-600 text-white border-red-500';
                } else {
                  optionStyle = 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                optionStyle = 'bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-2 ring-indigo-500/40';
                badgeStyle = 'bg-indigo-600 text-white border-indigo-500';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 text-sm sm:text-base group ${optionStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 font-mono ${badgeStyle}`}
                  >
                    {opt.option_letter}
                  </span>
                  <span className="flex-1 pt-0.5 leading-relaxed">{opt.option_text}</span>

                  {/* Icon status indicator */}
                  {isSubmitted && opt.is_correct && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold shrink-0 pt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Correct Answer</span>
                    </span>
                  )}
                  {isSubmitted && isSelected && !opt.is_correct && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold shrink-0 pt-0.5">
                      <XCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Your Answer</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Action Button */}
        {!isSubmitted && (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedOptionId}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-950 flex items-center justify-center gap-2"
          >
            <span>Check Answer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Post-Submission Feedback & Explanation Panel */}
        {isSubmitted && evaluation && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-sm font-bold ${
                evaluation.isCorrect
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-red-950/80 border-red-700 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {evaluation.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <span>{evaluation.isCorrect ? 'Correct Answer! (+1.0 Mark)' : 'Incorrect Answer (-0.25 Mark)'}</span>
              </div>
              <span className="font-mono text-xs opacity-90">
                {evaluation.isCorrect ? 'Great Job!' : 'Review Explanation Below'}
              </span>
            </div>

            {/* Comprehensive Explanation Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6">
              {/* Overall Explanation */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-400" />
                  <span>Overall Concept Explanation</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {evaluation.explanation.overall}
                </p>
              </div>

              {/* Option-Wise Explanations */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Option-Wise Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  {currentQuestion.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                        opt.is_correct
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 shrink-0">
                        Option {opt.option_letter}
                      </span>
                      <span className="leading-relaxed">
                        {evaluation.explanation.optionExplanations[opt.option_letter] || opt.explanation || 'Option breakdown.'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Takeaway Banner */}
              {evaluation.explanation.keyTakeaway && (
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-xs text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exam Key Takeaway</span>
                  </div>
                  <p className="text-amber-200/90 leading-relaxed">
                    {evaluation.explanation.keyTakeaway}
                  </p>
                </div>
              )}
            </div>

            {/* Next Question / Finish Action */}
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 group"
              >
                <span>Continue to Next Question</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Filtered Learning Module Complete!</h3>
                <p className="text-xs text-slate-400">
                  You answered {correctCount} out of {questions.length} questions correctly ({accuracy}% accuracy).
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart Set</span>
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    <span>Back to Question Bank</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function LearningModePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
          <h2 className="text-xl font-bold text-white">Initializing Learning Mode...</h2>
        </div>
      }
    >
      <LearningModeContent />
    </Suspense>
  );
}
