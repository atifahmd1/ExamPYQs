'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Lightbulb, CheckCircle2 } from 'lucide-react';
import { convertRawRowToQuestion, getActiveQuestions, saveImportedQuestions } from '@/lib/data/question-repository';

export default function NewQuestionPage() {
  const router = useRouter();

  const [questionText, setQuestionText] = useState('');
  const [officialRef, setOfficialRef] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [chapter, setChapter] = useState('General');
  const [topic, setTopic] = useState('General');
  const [correctLetter, setCorrectLetter] = useState('A');
  const [overallExplanation, setOverallExplanation] = useState('');

  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [optE, setOptE] = useState('None of the above');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    const raw = {
      official_source_ref: officialRef || 'Custom PYQ',
      subject,
      chapter,
      topic,
      question: questionText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      option_e: optE,
      answer: correctLetter,
      explanation: overallExplanation,
    };

    const current = getActiveQuestions();
    const newQ = convertRawRowToQuestion(raw, current.length);
    saveImportedQuestions([...current, newQ]);

    router.push('/admin/questions');
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/questions"
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Create New Question</h1>
            <p className="text-xs text-slate-400 mt-0.5">Add an official PYQ or practice question manually</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save Question</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Question Statement Text
          </label>
          <textarea
            required
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question statement here..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 border border-slate-800 p-5 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Source Ref</label>
            <input
              type="text"
              value={officialRef}
              onChange={(e) => setOfficialRef(e.target.value)}
              placeholder="e.g. BPSC TRE 3.0 CS Q.1"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Correct Answer Key</label>
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

        {/* Options */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Question Options
          </h3>

          <div className="space-y-3">
            {[
              { letter: 'A', value: optA, setter: setOptA },
              { letter: 'B', value: optB, setter: setOptB },
              { letter: 'C', value: optC, setter: setOptC },
              { letter: 'D', value: optD, setter: setOptD },
              { letter: 'E', value: optE, setter: setOptE },
            ].map((o) => (
              <div key={o.letter} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${o.letter === correctLetter ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {o.letter}
                </span>
                <input
                  type="text"
                  value={o.value}
                  onChange={(e) => o.setter(e.target.value)}
                  placeholder={`Option ${o.letter} text...`}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            <span>Overall Concept Solution / Explanation</span>
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
