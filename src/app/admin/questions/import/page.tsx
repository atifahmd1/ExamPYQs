'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  XCircle,
  FileCode,
  Info,
} from 'lucide-react';
import { computeTextHash, parseCsvToObjects } from '@/lib/utils';
import { convertRawRowToQuestion, saveImportedQuestions } from '@/lib/data/question-repository';
import { Question } from '@/types/database';

interface RowValidationError {
  row: number;
  field: string;
  message: string;
  isWarning?: boolean;
}

export default function BulkImportPage() {
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<RowValidationError[]>([]);
  const [validQuestions, setValidQuestions] = useState<Question[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'validated' | 'success'>('idle');

  // Paper Metadata Overrides
  const [examName, setExamName] = useState('');
  const [paperYear, setPaperYear] = useState('');
  const [paperShift, setPaperShift] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');

  const sampleCsvTemplate = `subject,topic,question,option_a,option_b,option_c,option_d,option_e,correct op,option_a_explanation,option_b_explanation,option_c_explanation,option_d_explanation,option_e_explanation
General Studies,General Knowledge,How many three-digit numbers are divisible by 5?,180,200,120,More than one of the above,None of the above,A,"Correct. A whole number is divisible by 5 when its last digit is 0 or 5. Among three-digit numbers, this gives 180 numbers (100–999).",200 — candidate value.,120 — candidate value.,,
Mathematics,Arithmetic / Algebra / Geometry,10% loss on selling price is what percent loss on cost price?,9 1 11%,9 2 11%,10%,More than one of the above,None of the above,A,"Correct. If SP is 90% of CP, loss as percentage of CP is (10/90)x100 = 11.11%.",9 2 11% — candidate value.,10% — candidate value.,,`;

  const sampleJsonTemplate = `[
  {
    "official_source_ref": "BPSC TRE 3.0 CS Q.4",
    "subject_code": "computer-science",
    "chapter_code": "dbms",
    "topic_code": "sql",
    "question_text": "Which SQL command is used to remove a table definition and all its data from the database?",
    "source_type": "official_pyq",
    "difficulty": "medium",
    "options": [
      { "letter": "A", "text": "DELETE", "is_correct": false, "explanation": "DELETE removes rows, not table structure." },
      { "letter": "B", "text": "REMOVE", "is_correct": false, "explanation": "REMOVE is not a valid SQL DDL command." },
      { "letter": "C", "text": "DROP", "is_correct": true, "explanation": "DROP TABLE deletes both data and relation schema." },
      { "letter": "D", "text": "TRUNCATE", "is_correct": false, "explanation": "TRUNCATE removes all rows but retains table structure." },
      { "letter": "E", "text": "None of the above", "is_correct": false, "explanation": "DROP is correct." }
    ],
    "overall_explanation": "DROP TABLE is a DDL command that removes table metadata and data completely from database schema.",
    "tags": ["DBMS", "SQL", "DDL"]
  }
]`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else {
        setImportFormat('json');
      }
      setInputText(text);
    };
    reader.readAsText(file);
  };

  const handleValidate = () => {
    setIsProcessing(true);
    setValidationErrors([]);
    setValidQuestions([]);
    setDuplicateCount(0);

    try {
      if (!examName.trim()) {
        setValidationErrors([{ row: 0, field: 'Exam Name', message: 'Exam Name is required (e.g. TRE 1 or BPSC TRE 3.0).' }]);
        setIsProcessing(false);
        return;
      }

      if (!paperYear.trim()) {
        setValidationErrors([{ row: 0, field: 'Year / Date', message: 'Year or Date is required (e.g. 2023 or 2024-08-09).' }]);
        setIsProcessing(false);
        return;
      }

      if (!inputText.trim()) {
        setValidationErrors([{ row: 0, field: 'Payload Input', message: 'Input CSV or JSON text cannot be empty.' }]);
        setIsProcessing(false);
        return;
      }

      let parsedRows: any[] = [];
      if (importFormat === 'json') {
        parsedRows = JSON.parse(inputText);
        if (!Array.isArray(parsedRows)) {
          setValidationErrors([{ row: 0, field: 'Root Structure', message: 'Expected an array of question objects.' }]);
          setIsProcessing(false);
          return;
        }
      } else {
        parsedRows = parseCsvToObjects(inputText);
        if (parsedRows.length === 0) {
          setValidationErrors([{ row: 0, field: 'CSV Header', message: 'No valid data rows found in CSV.' }]);
          setIsProcessing(false);
          return;
        }
      }

      const errors: RowValidationError[] = [];
      const seenRowKeys = new Set<string>();
      const convertedQuestions: Question[] = [];
      let dups = 0;

      const metadataOverride = {
        examName: examName.trim(),
        year: paperYear.trim(),
        shift: paperShift.trim(),
        subject: defaultSubject.trim(),
      };

      parsedRows.forEach((row, index) => {
        const rowNum = index + 1;
        const qText = row.question || row.question_text || '';
        const answer = row['correct op'] || row.correct_op || row.correct_option || row.answer || '';

        // Check fatal missing fields
        let isFatalError = false;

        if (!qText) {
          errors.push({ row: rowNum, field: 'question', message: 'Question statement text is missing.' });
          isFatalError = true;
        }

        if (!answer) {
          errors.push({ row: rowNum, field: 'correct op', message: 'Answer key (correct op: A, B, C, D, E) is missing.' });
          isFatalError = true;
        }

        if (qText) {
          const rowKey = `${examName}_${paperYear}_${index}_${computeTextHash(qText)}`;
          if (seenRowKeys.has(rowKey)) {
            dups++;
            errors.push({
              row: rowNum,
              field: 'duplicate',
              message: 'Repeated question in batch (Flagged for Review).',
              isWarning: true,
            });
          } else {
            seenRowKeys.add(rowKey);
          }
        }

        if (!isFatalError) {
          convertedQuestions.push(convertRawRowToQuestion(row, index, metadataOverride));
        }
      });

      setValidationErrors(errors);
      setValidQuestions(convertedQuestions);
      setDuplicateCount(dups);
      setImportStatus('validated');
    } catch (err: any) {
      setValidationErrors([{ row: 0, field: 'Parsing Error', message: `Failed to parse payload: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      saveImportedQuestions(validQuestions, true);
      setIsProcessing(false);
      setImportStatus('success');
    }, 600);
  };

  const fatalErrorsCount = validationErrors.filter((e) => !e.isWarning).length;
  const warningErrorsCount = validationErrors.filter((e) => e.isWarning).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Import New Question Paper</h1>
        <p className="text-sm text-slate-400 mt-1">
          Validate and import official PYQs or practice items via CSV or JSON with custom paper metadata overrides.
        </p>
      </div>

      {/* Paper Metadata Form Header Box */}
      <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>Paper Details & Metadata (Applied to Import Batch)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Exam Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. TRE 1 or BPSC TRE 3.0"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              Year / Date <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={paperYear}
              onChange={(e) => setPaperYear(e.target.value)}
              placeholder="e.g. 2023 or 2024-08-09"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Shift / Session (Optional)</label>
            <input
              type="text"
              value={paperShift}
              onChange={(e) => setPaperShift(e.target.value)}
              placeholder="e.g. Shift 1 (HS)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Default Subject (Optional)</label>
            <input
              type="text"
              value={defaultSubject}
              onChange={(e) => setDefaultSubject(e.target.value)}
              placeholder="e.g. General Studies"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor & Upload Column */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            {/* Format Toggle Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setImportFormat('csv');
                  if (!inputText) setInputText(sampleCsvTemplate);
                }}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                  importFormat === 'csv'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV Format</span>
              </button>

              <button
                onClick={() => {
                  setImportFormat('json');
                  if (!inputText) setInputText(sampleJsonTemplate);
                }}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                  importFormat === 'json'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON Format</span>
              </button>
            </div>

            <button
              onClick={() => setInputText(importFormat === 'csv' ? sampleCsvTemplate : sampleJsonTemplate)}
              className="text-xs text-indigo-400 hover:underline font-medium"
            >
              Load Sample {importFormat.toUpperCase()}
            </button>
          </div>

          {/* File Picker */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300 hover:file:bg-indigo-900 cursor-pointer"
            />
            <span className="text-slate-500 text-[11px] hidden sm:inline">Upload .csv or .json question bank file</span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              importFormat === 'csv'
                ? 'Paste CSV question bank rows here...'
                : 'Paste JSON question bank array here...'
            }
            rows={14}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleValidate}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>Parse & Validate {importFormat.toUpperCase()} Payload</span>
            </button>
          </div>
        </div>

        {/* Validation Report Column */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-5">
          <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Validation Report ({importFormat.toUpperCase()})</span>
            {importStatus === 'validated' && (
              <span className="text-xs font-mono text-emerald-400">{validQuestions.length} Questions Ready</span>
            )}
          </h2>

          {importStatus === 'idle' && (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <UploadCloud className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p>Paste or upload your CSV question bank and click Parse & Validate to review.</p>
            </div>
          )}

          {importStatus === 'validated' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Ready to Import</div>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{validQuestions.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Fatal Errors</div>
                  <div className="text-xl font-extrabold text-red-400 font-mono mt-1">{fatalErrorsCount}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">Review Flags</div>
                  <div className="text-xl font-extrabold text-amber-400 font-mono mt-1">{warningErrorsCount}</div>
                </div>
              </div>

              {/* Row Level Warnings & Errors List */}
              {validationErrors.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Row Validation & Audit Log</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {validationErrors.map((err, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 ${
                          err.isWarning ? 'text-amber-300' : 'text-red-300'
                        }`}
                      >
                        {err.isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span>
                          <strong className="font-mono">Row {err.row} ({err.field}):</strong> {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {validQuestions.length > 0 && (
                <button
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
                >
                  <span>Commit {validQuestions.length} Questions to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {importStatus === 'success' && (
            <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg p-6 text-center space-y-4">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-emerald-200">Import Batch Committed Successfully</h3>
              <p className="text-xs text-emerald-300/80">
                All {validQuestions.length} questions, option-wise explanations, and subject tags are now active across Learning Mode and CBT Test Mode!
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/admin/exams"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800"
                >
                  Go to Exams & Papers
                </Link>
                <Link
                  href="/admin/questions"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  View Question Bank
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
