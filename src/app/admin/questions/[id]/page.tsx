'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { getActiveQuestions, updateQuestion } from '@/lib/data/question-repository';
import { Question } from '@/types/database';

function EditQuestionContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const questionId = (params?.id as string) || '';
  const pageParam = searchParams.get('page') || '1';
  const subjectParam = searchParams.get('subject') || '';
  const paperParam = searchParams.get('paper') || '';
  const searchParam = searchParams.get('search') || '';
  const sourceParam = searchParams.get('source') || '';
  const statusParam = searchParams.get('status') || '';

  const returnUrl = (() => {
    const p = new URLSearchParams();
    if (pageParam && pageParam !== '1') p.set('page', pageParam);
    if (subjectParam) p.set('subject', subjectParam);
    if (paperParam) p.set('paper', paperParam);
    if (searchParam) p.set('search', searchParam);
    if (sourceParam) p.set('source', sourceParam);
    if (statusParam) p.set('status', statusParam);
    const str = p.toString();
    return `/admin/questions${str ? `?${str}` : ''}`;
  })();

  const [question, setQuestion] = useState<Question | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [questionText, setQuestionText] = useState('');
  const [officialRef, setOfficialRef] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [correctLetter, setCorrectLetter] = useState('A');
  const [overallExplanation, setOverallExplanation] = useState('');
  const [options, setOptions] = useState<
    { letter: 'A' | 'B' | 'C' | 'D' | 'E'; text: string; explanation: string }[]
  >([
    { letter: 'A', text: '', explanation: '' },
    { letter: 'B', text: '', explanation: '' },
    { letter: 'C', text: '', explanation: '' },
    { letter: 'D', text: '', explanation: '' },
    { letter: 'E', text: '', explanation: '' },
  ]);

  useEffect(() => {
    const all = getActiveQuestions();
    const found = all.find((q) => q.id === questionId);
    if (found) {
      setQuestion(found);
      setQuestionText(found.question_text);
      setOfficialRef(found.official_source_ref || '');
      setSubject(found.subject_id || '');
      setChapter(found.chapter_id || '');
      setTopic(found.topic_id || '');
      setOverallExplanation(found.explanations?.overall_explanation || '');

      const correctOpt = found.options?.find((o) => o.is_correct);
      if (correctOpt) {
        setCorrectLetter(correctOpt.option_letter);
      }

      // Map options
      const optList: { letter: 'A' | 'B' | 'C' | 'D' | 'E'; text: string; explanation: string }[] = ['A', 'B', 'C', 'D', 'E'].map(
        (lettr) => {
          const matched = found.options?.find((o) => o.option_letter === lettr);
          return {
            letter: lettr as 'A' | 'B' | 'C' | 'D' | 'E',
            text: matched?.option_text || '',
            explanation: matched?.explanation || '',
          };
        }
      );
      setOptions(optList);
    }
  }, [questionId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    const updatedOptions = options
      .filter((o) => o.text.trim() !== '')
      .map((o) => ({
        id: `opt-${question.id}-${o.letter.toLowerCase()}`,
        question_id: question.id,
        option_letter: o.letter,
        option_text: o.text,
        is_correct: o.letter === correctLetter,
        explanation: o.explanation || null,
      }));

    const updatedQuestion: Question = {
      ...question,
      question_text: questionText,
      official_source_ref: officialRef,
      subject_id: subject,
      chapter_id: chapter,
      topic_id: topic,
      options: updatedOptions,
      explanations: {
        id: question.explanations?.id || `exp-${question.id}`,
        question_id: question.id,
        overall_explanation: overallExplanation,
        concept_summary: question.explanations?.concept_summary || null,
        key_takeaway: question.explanations?.key_takeaway || null,
        created_at: new Date().toISOString(),
      },
    };

    updateQuestion(updatedQuestion);
    setSaveSuccess(true);

    // Smoothly redirect back to Question Bank Management page preserving page & active filters
    setTimeout(() => {
      router.push(returnUrl);
      router.refresh();
    }, 1000);
  };

  if (!question) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <h2 className="text-lg font-bold text-white">Question not found.</h2>
        <Link href={returnUrl} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
          Return to Question Bank
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={returnUrl}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Edit Question #{questionId}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{officialRef || 'Official PYQ'}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Question saved successfully! Returning to Question Bank (Page {pageParam})...</span>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Question Statement */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Question Statement Text
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 border border-slate-800 p-5 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Reference</label>
            <input
              type="text"
              value={officialRef}
              onChange={(e) => setOfficialRef(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chapter</label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Correct Option Key</label>
            <select
              value={correctLetter}
              onChange={(e) => setCorrectLetter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
              <option value="E">Option E</option>
            </select>
          </div>
        </div>

        {/* Options & Explanations */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Options & Explanations
          </h3>

          <div className="space-y-4">
            {options.map((opt, idx) => (
              <div key={opt.letter} className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${opt.letter === correctLetter ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    Option {opt.letter} {opt.letter === correctLetter ? '(CORRECT)' : ''}
                  </span>
                </div>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx].text = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${opt.letter} Text`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={opt.explanation}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx].explanation = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${opt.letter} Specific Explanation (Optional)`}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overall Explanation */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            <span>Overall Concept Solution & Explanation</span>
          </label>
          <textarea
            value={overallExplanation}
            onChange={(e) => setOverallExplanation(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </form>
    </div>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={<div className="text-white text-xs p-4">Loading question editor...</div>}>
      <EditQuestionContent />
    </Suspense>
  );
}
