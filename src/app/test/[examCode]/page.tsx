'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BarChart2,
  Grid,
} from 'lucide-react';
import { getActiveQuestions } from '@/lib/data/question-repository';
import { calculateAttemptSummary, evaluateQuestionAnswer, AttemptSummary } from '@/lib/engine/quiz-engine';
import { formatDuration } from '@/lib/utils';
import { Question, QuestionOption } from '@/types/database';

interface QuestionState {
  selectedOptionId: string | null;
  markedForReview: boolean;
  visited: boolean;
}

export default function TestModePage() {
  const params = useParams();
  const examCode = (params?.examCode as string) || 'bpsc-tre-cs';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 mins
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [summary, setSummary] = useState<AttemptSummary | null>(null);

  // Map of question ID -> student state
  const [userStateMap, setUserStateMap] = useState<Record<string, QuestionState>>({});

  useEffect(() => {
    const active = getActiveQuestions();
    setQuestions(active);

    const initial: Record<string, QuestionState> = {};
    active.forEach((q, idx) => {
      initial[q.id] = {
        selectedOptionId: null,
        markedForReview: false,
        visited: idx === 0,
      };
    });
    setUserStateMap(initial);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, questions]);

  const currentQuestion = questions[currentIndex];
  const currentState = userStateMap[currentQuestion?.id] || {
    selectedOptionId: null,
    markedForReview: false,
    visited: true,
  };

  const handleOptionSelect = (optId: string) => {
    if (isSubmitted || !currentQuestion) return;
    setUserStateMap((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        selectedOptionId: optId,
      },
    }));
  };

  const handleClearResponse = () => {
    if (isSubmitted || !currentQuestion) return;
    setUserStateMap((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        selectedOptionId: null,
      },
    }));
  };

  const handleToggleMarkForReview = () => {
    if (isSubmitted || !currentQuestion) return;
    setUserStateMap((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        markedForReview: !prev[currentQuestion.id]?.markedForReview,
      },
    }));
  };

  const navigateQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      const targetId = questions[index].id;
      setUserStateMap((prev) => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          visited: true,
        },
      }));
    }
  };

  const handleFinalSubmit = () => {
    setShowSubmitModal(false);

    // Evaluate all questions
    const evaluations = questions.map((q) => {
      const state = userStateMap[q.id];
      return evaluateQuestionAnswer(q, q.options || [], state?.selectedOptionId || null);
    });

    const sum = calculateAttemptSummary(evaluations, questions.length);
    setSummary(sum);
    setIsSubmitted(true);
  };

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <h2 className="text-xl font-bold text-white">Loading CBT exam module...</h2>
      </div>
    );
  }

  // Palette metrics calculation
  let answeredCount = 0;
  let markedCount = 0;
  let unattemptedCount = 0;

  Object.values(userStateMap).forEach((st) => {
    if (st.selectedOptionId) answeredCount++;
    if (st.markedForReview) markedCount++;
    if (!st.selectedOptionId) unattemptedCount++;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* CBT Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">BPSC TRE CBT Mock Test</h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Computer Science & General Studies • Official Engine</p>
            </div>
          </div>

          {/* Timer Display */}
          {!isSubmitted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-amber-400">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Time Left: {formatDuration(timeRemaining)}</span>
            </div>
          )}

          {/* Submit Test Button */}
          {!isSubmitted ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              Submit Test
            </button>
          ) : (
            <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-full">
              Test Completed
            </span>
          )}
        </div>
      </header>

      {/* Main CBT Layout */}
      {!isSubmitted ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Display Column (3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                  Question {currentIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
                    Official PYQ
                  </span>
                  <span className="text-slate-500">Marks: +1.0 / -0.25</span>
                </div>
              </div>

              {/* Statement */}
              <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                  {currentQuestion.question_text}
                </h2>

                {/* Options list */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.options?.map((opt: QuestionOption) => {
                    const isSelected = currentState.selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 text-sm ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-2 ring-indigo-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 font-mono ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {opt.option_letter}
                        </span>
                        <span className="flex-1 pt-0.5 leading-relaxed">{opt.option_text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMarkForReview}
                  className={`px-3 py-2 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                    currentState.markedForReview
                      ? 'bg-purple-950 border-purple-800 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{currentState.markedForReview ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>
                {currentState.selectedOptionId && (
                  <button
                    onClick={handleClearResponse}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    Clear Response
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 disabled:opacity-40 rounded-lg text-slate-200 flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => navigateQuestion(currentIndex + 1)}
                  disabled={currentIndex === questions.length - 1}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar (1 col) */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span>Question Palette</span>
              </h3>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span>Review ({markedCount})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></span>
                  <span>Unattempted ({unattemptedCount})</span>
                </div>
              </div>

              {/* Question Number Palette Grid */}
              <div className="grid grid-cols-5 gap-2 pt-2 max-h-80 overflow-y-auto">
                {questions.map((q, idx) => {
                  const state = userStateMap[q.id];
                  const isCurrent = idx === currentIndex;
                  let bgStyle = 'bg-slate-950 border-slate-800 text-slate-400';

                  if (state?.selectedOptionId) {
                    bgStyle = 'bg-emerald-600 text-white border-emerald-500 font-bold';
                  } else if (state?.markedForReview) {
                    bgStyle = 'bg-purple-600 text-white border-purple-500 font-bold';
                  }

                  if (isCurrent) {
                    bgStyle += ' ring-2 ring-indigo-400';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateQuestion(idx)}
                      className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center ${bgStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
            >
              Submit Test Now
            </button>
          </div>
        </main>
      ) : (
        /* Test Scorecard Results Section */
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
              <BarChart2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white">Test Scorecard & Analysis</h2>
              <p className="text-xs text-slate-400 mt-1">
                BPSC TRE Computer Science & General Studies • Performance Metrics
              </p>
            </div>

            {/* Scorecard Summary Metrics Grid */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Total Score</div>
                  <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">
                    {summary.rawScore} / {summary.maxScore}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Accuracy</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                    {summary.accuracyPercentage}%
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Correct</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                    {summary.totalCorrect}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Incorrect</div>
                  <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">
                    {summary.totalIncorrect}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href="/learn/bpsc-tre-cs"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Review Explanations in Learning Mode
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      )}

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Test Submission</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded border border-slate-800">
                <span>Attempted Questions:</span>
                <span className="font-mono font-bold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded border border-slate-800">
                <span>Unattempted Questions:</span>
                <span className="font-mono font-bold text-amber-400">{unattemptedCount}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to finalize and submit your test? You cannot modify your answers after submission.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel & Continue Test
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
