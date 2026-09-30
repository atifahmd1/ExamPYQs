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

interface RowValidationError {
  row: number;
  field: string;
  message: string;
  isWarning?: boolean;
}

interface ImportQuestion {
  slug: string;

  exam_name: string;
  exam_year: number;
  date: string | null;
  shift: string;
  class_level: string | null;

  language: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  difficulty_level: 'easy' | 'medium' | 'hard';

  question_type: 'MCQ' | 'MSQ' | 'NAT';
  question: string;
  question_image_url: string | null;
  has_latex: boolean;

  meta_title: string | null;
  meta_description: string | null;
  core_concept_summary: string | null;
  reference: string | null;

  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;

  correct_op: 'A' | 'B' | 'C' | 'D' | 'E';

  option_a_explanation: string | null;
  option_b_explanation: string | null;
  option_c_explanation: string | null;
  option_d_explanation: string | null;
  option_e_explanation: string | null;

  option_concept_tags: Record<string, string[]> | null;

  solution_image_url: string | null;
  solution_video_url: string | null;

  ideal_time_seconds: number | null;
  marks: number | 1;
  negative_marks: number | 0;

  is_published: boolean;
  verification_status:
  | 'unverified'
  | 'community_verified'
  | 'verified';

  uploaded_by_user_id: string | null;
}

interface ImportResult {
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  error?: string;
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function nullable(value: unknown): string | null {
  const valueClean = clean(value);
  return valueClean || null;
}

function toBoolean(value: unknown, defaultValue = false): boolean {
  const v = clean(value).toLowerCase();

  if (!v) return defaultValue;

  return ['true', '1', 'yes', 'y'].includes(v);
}

function toNumber(
  value: unknown,
  defaultValue: number | null = null
): number | null {
  const v = clean(value);

  if (!v) return defaultValue;

  const n = Number(v);

  return Number.isFinite(n) ? n : defaultValue;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeSlug(
  examName: string,
  subject: string,
  question: string,
  rowIndex: number
): string {
  const base = slugify(
    `${examName}-${subject}-${question}`
  );

  return `${base}-${rowIndex + 1}`;
}

function normalizeCorrectOption(
  value: unknown
): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  const answer = clean(value).toUpperCase();

  if (['A', 'B', 'C', 'D', 'E'].includes(answer)) {
    return answer as 'A' | 'B' | 'C' | 'D' | 'E';
  }

  return null;
}

function parseConceptTags(
  value: unknown
): Record<string, string[]> | null {
  const raw = clean(value);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }
  } catch {
    // Allow simple text fallback.
  }

  return {
    general: raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

function convertRow(
  row: Record<string, any>,
  index: number
): ImportQuestion {
  const examName =
    clean(row['exam name']) ||
    clean(row.exam_name);

  const examYear =
    toNumber(
      row['exam year'] ||
      row.exam_year
    ) ?? new Date().getFullYear();

  const subject = clean(row.subject);
  const question =
    clean(row.question) ||
    clean(row.question_text);

  const correctOp = normalizeCorrectOption(
    row['correct op'] ||
    row.correct_op ||
    row.correct_option ||
    row.answer
  )!;

  const slug =
    clean(row.slug) ||
    makeSlug(
      examName,
      subject,
      question,
      index
    );

  return {
    slug,

    exam_name: examName,
    exam_year: examYear,

    date:
      nullable(row.date),

    shift:
      clean(row.shift) || '1',

    class_level:
      nullable(
        row['class level'] ||
        row.class_level
      ),

    language:
      clean(row.language) || 'en',

    subject,

    topic:
      clean(row.topic),

    subtopic:
      nullable(row.subtopic),

    difficulty_level:
      (
        clean(
          row['difficulty level'] ||
          row.difficulty_level
        ).toLowerCase() || 'medium'
      ) as 'easy' | 'medium' | 'hard',

    question_type:
      (
        clean(row.question_type)
          .toUpperCase() || 'MCQ'
      ) as 'MCQ' | 'MSQ' | 'NAT',

    question,

    question_image_url:
      nullable(
        row.question_image_url ||
        row.question_image
      ),

    has_latex:
      toBoolean(row.has_latex),

    meta_title:
      nullable(row.meta_title),

    meta_description:
      nullable(row.meta_description),

    core_concept_summary:
      nullable(row.core_concept_summary),

    reference:
      nullable(
        row.reference ||
        row.ncert_reference
      ),

    option_a: nullable(row.option_a),
    option_b: nullable(row.option_b),
    option_c: nullable(row.option_c),
    option_d: nullable(row.option_d),
    option_e: nullable(row.option_e),

    correct_op: correctOp,

    option_a_explanation:
      nullable(row.option_a_explanation),

    option_b_explanation:
      nullable(row.option_b_explanation),

    option_c_explanation:
      nullable(row.option_c_explanation),

    option_d_explanation:
      nullable(row.option_d_explanation),

    option_e_explanation:
      nullable(row.option_e_explanation),

    option_concept_tags:
      parseConceptTags(
        row.option_concept_tags
      ),

    solution_image_url:
      nullable(row.solution_image_url),

    solution_video_url:
      nullable(row.solution_video_url),

    ideal_time_seconds:
      toNumber(row.ideal_time_seconds),

    marks:
      toNumber(row.marks, 1) ?? 1,

    negative_marks:
      toNumber(row.negative_marks, 0) ?? 0,

    is_published:
      toBoolean(row.is_published, false),

    verification_status:
      (
        clean(row.verification_status)
          .toLowerCase() || 'verified'
      ) as
      | 'unverified'
      | 'community_verified'
      | 'verified',

    uploaded_by_user_id:
      nullable(row.uploaded_by_user_id),
  };
}

export default function BulkImportPage() {
  const [importFormat, setImportFormat] =
    useState<'csv' | 'json'>('csv');

  const [inputText, setInputText] =
    useState('');

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [validationErrors, setValidationErrors] =
    useState<RowValidationError[]>([]);

  const [validQuestions, setValidQuestions] =
    useState<ImportQuestion[]>([]);

  const [duplicateCount, setDuplicateCount] =
    useState(0);

  const [importStatus, setImportStatus] =
    useState<
      'idle' | 'validated' | 'success'
    >('idle');

  const [dbSyncResult, setDbSyncResult] =
    useState<ImportResult | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text =
        String(event.target?.result ?? '');

      const isCsv =
        file.name.toLowerCase().endsWith('.csv');

      setImportFormat(
        isCsv ? 'csv' : 'json'
      );

      setInputText(text);
      setImportStatus('idle');
      setValidationErrors([]);
      setValidQuestions([]);
    };

    reader.readAsText(file);
  };

  const handleValidate = () => {
    setIsProcessing(true);
    setValidationErrors([]);
    setValidQuestions([]);
    setDuplicateCount(0);

    try {
      if (!inputText.trim()) {
        setValidationErrors([
          {
            row: 0,
            field: 'Input',
            message:
              'CSV or JSON input cannot be empty.',
          },
        ]);

        return;
      }

      let parsedRows: Record<string, any>[] = [];

      if (importFormat === 'json') {
        const parsed =
          JSON.parse(inputText);

        if (!Array.isArray(parsed)) {
          throw new Error(
            'JSON root must be an array of question objects.'
          );
        }

        parsedRows = parsed;
      } else {
        parsedRows =
          parseCsvToObjects(inputText);

        if (!parsedRows.length) {
          throw new Error(
            'No valid CSV rows found.'
          );
        }
      }

      const errors: RowValidationError[] = [];
      const converted: ImportQuestion[] = [];

      /*
       * IMPORTANT:
       * Do NOT include row index in duplicate key.
       * Otherwise identical questions will never
       * be detected as duplicates.
       */
      const seenQuestions =
        new Set<string>();

      let duplicates = 0;

      parsedRows.forEach(
        (row, index) => {
          const rowNum = index + 2;

          const question =
            clean(
              row.question ||
              row.question_text
            );

          const examName =
            clean(
              row['exam name'] ||
              row.exam_name
            );

          const subject =
            clean(row.subject);

          const topic =
            clean(row.topic);

          const answer =
            normalizeCorrectOption(
              row['correct op'] ||
              row.correct_op ||
              row.correct_option ||
              row.answer
            );

          let fatal = false;

          if (!examName) {
            errors.push({
              row: rowNum,
              field: 'exam_name',
              message:
                'Exam name is required.',
            });

            fatal = true;
          }

          if (!question) {
            errors.push({
              row: rowNum,
              field: 'question',
              message:
                'Question statement is required.',
            });

            fatal = true;
          }

          if (!subject) {
            errors.push({
              row: rowNum,
              field: 'subject',
              message:
                'Subject is required.',
            });

            fatal = true;
          }

          if (!topic) {
            errors.push({
              row: rowNum,
              field: 'topic',
              message:
                'Topic is required.',
            });

            fatal = true;
          }

          if (!answer) {
            errors.push({
              row: rowNum,
              field: 'correct_op',
              message:
                'Correct option must be A, B, C, D or E.',
            });

            fatal = true;
          }

          const difficulty =
            clean(
              row['difficulty level'] ||
              row.difficulty_level
            ).toLowerCase();

          if (
            difficulty &&
            !['easy', 'medium', 'hard']
              .includes(difficulty)
          ) {
            errors.push({
              row: rowNum,
              field: 'difficulty_level',
              message:
                'Difficulty must be easy, medium or hard.',
            });

            fatal = true;
          }

          /*
           * Duplicate detection based on actual
           * question identity, not row number.
           */
          if (question) {
            const duplicateKey =
              [
                examName
                  .toLowerCase(),
                clean(row.date),
                clean(row.shift) || '1',
                subject.toLowerCase(),
                computeTextHash(question),
              ].join('|');

            if (
              seenQuestions.has(
                duplicateKey
              )
            ) {
              duplicates++;

              errors.push({
                row: rowNum,
                field: 'duplicate',
                message:
                  'Duplicate question found in this import batch.',
                isWarning: true,
              });
            } else {
              seenQuestions.add(
                duplicateKey
              );
            }
          }

          if (!fatal) {
            converted.push(
              convertRow(row, index)
            );
          }
        }
      );

      setValidationErrors(errors);
      setValidQuestions(converted);
      setDuplicateCount(duplicates);
      setImportStatus('validated');
    } catch (error: any) {
      setValidationErrors([
        {
          row: 0,
          field: 'Parsing Error',
          message:
            error?.message ||
            'Failed to parse import file.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validQuestions.length) return;

    setIsProcessing(true);
    setDbSyncResult(null);

    try {
      const response =
        await fetch(
          '/api/admin/questions/import',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              questions:
                validQuestions,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Failed to import questions.'
        );
      }

      setDbSyncResult(result);
      setImportStatus('success');
    } catch (error: any) {
      setDbSyncResult({
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        error:
          error?.message ||
          'Failed to sync with Supabase.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fatalErrorsCount =
    validationErrors.filter(
      (e) => !e.isWarning
    ).length;

  const warningErrorsCount =
    validationErrors.filter(
      (e) => e.isWarning
    ).length;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white">
          Import Question Paper
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Upload or paste CSV/JSON question
          data and import it into Exampyqs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* INPUT */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">

              <button
                onClick={() =>
                  setImportFormat('csv')
                }
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${importFormat === 'csv'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400'
                  }`}
              >
                <FileSpreadsheet className="inline w-3.5 h-3.5 mr-1" />
                CSV
              </button>

              <button
                onClick={() =>
                  setImportFormat('json')
                }
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${importFormat === 'json'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400'
                  }`}
              >
                <FileCode className="inline w-3.5 h-3.5 mr-1" />
                JSON
              </button>

            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <input
              type="file"
              accept=".csv,.json"
              onChange={
                handleFileUpload
              }
              className="text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300"
            />
          </div>

          <textarea
            value={inputText}
            onChange={(e) =>
              setInputText(e.target.value)
            }
            placeholder={
              importFormat === 'csv'
                ? 'Paste CSV here...'
                : 'Paste JSON array here...'
            }
            rows={18}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={
              handleValidate
            }
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}

            Parse & Validate
          </button>

        </div>

        {/* VALIDATION */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">

          <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
            Validation Report
          </h2>

          {importStatus === 'idle' && (
            <div className="text-center py-16 text-slate-500 text-xs">
              <UploadCloud className="w-10 h-10 mx-auto mb-3" />

              <p>
                Upload or paste your
                question bank and validate it.
              </p>
            </div>
          )}

          {importStatus === 'validated' && (
            <div className="space-y-4 mt-4">

              <div className="grid grid-cols-3 gap-3 text-center">

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">
                    Ready
                  </div>

                  <div className="text-xl font-bold text-emerald-400">
                    {validQuestions.length}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">
                    Errors
                  </div>

                  <div className="text-xl font-bold text-red-400">
                    {fatalErrorsCount}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-400">
                    Duplicates
                  </div>

                  <div className="text-xl font-bold text-amber-400">
                    {duplicateCount}
                  </div>
                </div>

              </div>

              {validationErrors.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-72 overflow-y-auto">

                  <div className="text-xs font-semibold text-slate-200 mb-3">
                    Validation Issues
                  </div>

                  <div className="space-y-2">

                    {validationErrors.map(
                      (err, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 text-xs ${err.isWarning
                            ? 'text-amber-300'
                            : 'text-red-300'
                            }`}
                        >
                          {err.isWarning ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          )}

                          <span>
                            <strong>
                              Row {err.row}
                              {' '}
                              ({err.field}):
                            </strong>{' '}
                            {err.message}
                          </span>
                        </div>
                      )
                    )}

                  </div>
                </div>
              )}

              {validQuestions.length > 0 &&
                fatalErrorsCount === 0 && (
                  <button
                    onClick={
                      handleConfirmImport
                    }
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Commit{' '}
                        {validQuestions.length}{' '}
                        Questions
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

            </div>
          )}

          {importStatus === 'success' && (
            <div className="mt-4 bg-emerald-950/40 border border-emerald-900/60 rounded-lg p-6 text-center">

              {dbSyncResult?.success ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />

                  <h3 className="mt-3 text-base font-bold text-emerald-200">
                    Import Successful
                  </h3>

                  <p className="text-xs text-emerald-300 mt-2">
                    Inserted{' '}
                    {dbSyncResult.insertedCount}{' '}
                    questions into Supabase.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-400 mx-auto" />

                  <h3 className="mt-3 text-base font-bold text-red-200">
                    Import Failed
                  </h3>

                  <pre className="mt-3 text-left text-xs text-red-300 whitespace-pre-wrap">
                    {dbSyncResult?.error}
                  </pre>
                </>
              )}

              <div className="flex justify-center gap-3 mt-5">

                <Link
                  href="/admin/exams"
                  className="px-3.5 py-2 bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800"
                >
                  Exams & Papers
                </Link>

                <Link
                  href="/admin/questions"
                  className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                >
                  Question Bank
                </Link>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}