'use client';

import { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCsvToObjects } from '@/lib/utils';
import { convertRawRowToQuestion, saveImportedQuestions } from '@/lib/data/question-repository';
import { Question } from '@/types/database';

interface ImportPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export default function ImportPaperModal({ isOpen, onClose, onImportSuccess }: ImportPaperModalProps) {
  const [examName, setExamName] = useState('');
  const [paperYear, setPaperYear] = useState('');
  const [paperShift, setPaperShift] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');

  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!examName.trim()) {
      setErrorMsg('Exam Name is mandatory (e.g. BPSC TRE 3.0 or TRE 1).');
      return;
    }

    if (!paperYear.trim()) {
      setErrorMsg('Year / Date is mandatory (e.g. 2023 or 2024-08-09).');
      return;
    }

    if (!fileContent.trim()) {
      setErrorMsg('Please select a valid CSV or JSON question bank file.');
      return;
    }

    setIsProcessing(true);

    try {
      let rawRows: any[] = [];
      if (fileName.endsWith('.json') || fileContent.trim().startsWith('[')) {
        rawRows = JSON.parse(fileContent);
        if (!Array.isArray(rawRows)) {
          throw new Error('Expected JSON array of question objects.');
        }
      } else {
        rawRows = parseCsvToObjects(fileContent);
        if (rawRows.length === 0) {
          throw new Error('No valid question rows found in CSV file.');
        }
      }

      const parsedQuestions: Question[] = [];
      let skippedCount = 0;

      rawRows.forEach((row, idx) => {
        const qText = row.question || row.question_text || '';
        const answerKey = row['correct op'] || row.correct_op || row.correct_option || row.answer;

        if (qText && answerKey) {
          const q = convertRawRowToQuestion(row, idx, {
            examName: examName.trim(),
            year: paperYear.trim(),
            shift: paperShift.trim(),
            subject: defaultSubject.trim(),
          });
          parsedQuestions.push(q);
        } else {
          skippedCount++;
        }
      });

      if (parsedQuestions.length === 0) {
        throw new Error('Could not parse any valid questions. Ensure CSV has "question" and "correct op" / "answer" columns.');
      }

      // Append new paper questions to repository
      saveImportedQuestions(parsedQuestions, true);

      setIsProcessing(false);
      setSuccessMsg(`Successfully imported ${parsedQuestions.length} questions for "${examName.trim()}"! ${skippedCount > 0 ? `(${skippedCount} invalid rows skipped)` : ''}`);

      setTimeout(() => {
        if (onImportSuccess) onImportSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err.message || 'Failed to import question paper.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Import New Question Paper</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Exam Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. TRE 1, BPSC TRE 3.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Date / Year (Optional)</label>
              <input
                type="text"
                value={paperYear}
                onChange={(e) => setPaperYear(e.target.value)}
                placeholder="e.g. 2023 or 2024-08-09"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Shift / Session (Optional)</label>
              <input
                type="text"
                value={paperShift}
                onChange={(e) => setPaperShift(e.target.value)}
                placeholder="e.g. Shift 1, HS Teacher"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Default Subject (Optional)</label>
              <input
                type="text"
                value={defaultSubject}
                onChange={(e) => setDefaultSubject(e.target.value)}
                placeholder="e.g. General Studies"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Question Bank File (.csv or .json) <span className="text-red-400">*</span>
            </label>
            <div className="bg-slate-950 border border-dashed border-slate-800 p-3.5 rounded-xl text-center cursor-pointer hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300 hover:file:bg-indigo-900 cursor-pointer"
              />
              {fileName && <div className="text-xs font-mono text-indigo-400 mt-1.5">Selected: {fileName}</div>}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Import Paper'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
