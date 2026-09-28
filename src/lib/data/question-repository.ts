import { Question } from '@/types/database';
import { computeTextHash } from '@/lib/utils';
import seedData from '@/lib/seed/seed-data.json';

const STORAGE_KEY = 'exampyqs_custom_questions';
const INITIALIZED_KEY = 'exampyqs_initialized_v1';

/**
 * Helper to normalize paper IDs / exam codes into clean human-readable Exam Names
 */
export function normalizeExamName(paperIdOrExam?: string | null, year?: string | number): string {
  if (!paperIdOrExam) return 'TRE 1 (2023)';
  const str = paperIdOrExam.toString().trim();

  // Known paper codes and names mapping
  if (str.includes('2023-08-26') || str.includes('NB-2023-08-26') || str === 'TRE 1') {
    return 'TRE 1 (2023)';
  }
  if (str.includes('2023-12-15') || str.includes('NB-2023-12-15') || str === 'TRE 2') {
    return 'TRE 2 (2023)';
  }
  if (str.includes('2024-08-09') || str.includes('NB-2024-08-09') || str === 'TRE 3') {
    return 'TRE 3 (2024)';
  }

  if (year && !str.includes('(')) {
    return `${str} (${year})`;
  }

  if (/^TRE \d+ \(\d{4}\)$/i.test(str)) {
    return str;
  }

  if (str.startsWith('NB-')) {
    if (str.includes('2023')) return 'TRE 1 (2023)';
    if (str.includes('2024')) return 'TRE 3 (2024)';
    return 'BPSC TRE';
  }

  return str;
}

/**
 * Normalizes user CSV/JSON input into system Question entities with optional paper metadata overrides
 */
export function convertRawRowToQuestion(
  row: any,
  index: number,
  metadataOverride?: { examName?: string; year?: string; shift?: string; subject?: string }
): Question {
  const qText = row.question || row.question_text || '';
  const correctLetter = (
    row['correct op'] ||
    row.correct_op ||
    row.correct_option ||
    row.answer ||
    'A'
  ).toString().trim().toUpperCase();

  const options = [
    {
      id: `opt-${index}-a`,
      question_id: `q-${index}`,
      option_letter: 'A' as const,
      option_text: row.option_a || '',
      is_correct: correctLetter === 'A',
      explanation: row.option_a_explanation || null,
    },
    {
      id: `opt-${index}-b`,
      question_id: `q-${index}`,
      option_letter: 'B' as const,
      option_text: row.option_b || '',
      is_correct: correctLetter === 'B',
      explanation: row.option_b_explanation || null,
    },
    {
      id: `opt-${index}-c`,
      question_id: `q-${index}`,
      option_letter: 'C' as const,
      option_text: row.option_c || '',
      is_correct: correctLetter === 'C',
      explanation: row.option_c_explanation || null,
    },
    {
      id: `opt-${index}-d`,
      question_id: `q-${index}`,
      option_letter: 'D' as const,
      option_text: row.option_d || '',
      is_correct: correctLetter === 'D',
      explanation: row.option_d_explanation || null,
    },
    {
      id: `opt-${index}-e`,
      question_id: `q-${index}`,
      option_letter: 'E' as const,
      option_text: row.option_e || '',
      is_correct: correctLetter === 'E',
      explanation: row.option_e_explanation || null,
    },
  ].filter((opt) => Boolean(opt.option_text && opt.option_text.trim() !== ''));

  const rawSubject = metadataOverride?.subject || (row.subject ? row.subject.toString().trim() : 'General Studies');

  let examName = 'BPSC TRE';
  if (metadataOverride?.examName) {
    const eName = metadataOverride.examName.trim();
    const yr = metadataOverride.year ? ` (${metadataOverride.year.trim()})` : '';
    const shft = metadataOverride.shift ? ` - ${metadataOverride.shift.trim()}` : '';
    examName = `${eName}${yr}${shft}`;
  } else {
    const rawPaper = row.paper || row.paper_id || row.exam || '';
    examName = normalizeExamName(rawPaper, row.year);
  }

  const qNum = row.question_no ? `Q.${row.question_no}` : `Q.${index + 1}`;
  const officialRef = row.official_source_ref || `${examName} ${qNum}`;

  return {
    id: `q-custom-${Date.now()}-${index + 1}`,
    exam_id: metadataOverride?.examName || row.exam || 'BPSC TRE',
    paper_id: examName,
    subject_id: rawSubject,
    chapter_id: row.chapter ? row.chapter.toString().trim() : 'General Chapter',
    topic_id: row.topic ? row.topic.toString().trim() : 'General Topic',
    question_text: qText,
    question_type: 'multiple_choice',
    source_type: 'official_pyq',
    official_source_ref: officialRef,
    derived_from_question_id: null,
    difficulty: 'medium',
    marks: 1.0,
    negative_marks: 0.25,
    status: 'published',
    language: row.language || 'en',
    text_hash: computeTextHash(qText),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options,
    explanations: {
      id: `exp-${index}`,
      question_id: `q-custom-${Date.now()}-${index + 1}`,
      overall_explanation: row.explanation || row.overall_explanation || 'Refer to standard NCERT/SCERT concept solution.',
      concept_summary: row.source_basis || null,
      key_takeaway: row.source_basis || null,
      created_at: new Date().toISOString(),
    },
    tags: [rawSubject, row.topic || row.chapter || 'Exam', examName].filter(Boolean),
  };
}

/**
 * Dynamically gets all active questions from localStorage without re-seeding dropped data
 */
export function getActiveQuestions(): Question[] {
  let questions: Question[] = [];

  if (typeof window !== 'undefined') {
    const isInitialized = localStorage.getItem(INITIALIZED_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          questions = parsed;
        }
      } catch (e) {
        console.error('Failed to parse stored custom questions', e);
      }
    }

    // Only populate seed data if local storage was NEVER initialized before
    if (!isInitialized && questions.length === 0) {
      questions = seedData.questions.map((q, idx) => convertRawRowToQuestion(q, idx));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
  } else {
    // SSR Fallback
    questions = seedData.questions.map((q, idx) => convertRawRowToQuestion(q, idx));
  }

  return questions.map((q) => {
    const cleanPaper = normalizeExamName(q.paper_id || q.exam_id);
    return {
      ...q,
      paper_id: cleanPaper,
    };
  });
}

/**
 * Saves questions list (supports appending new imported papers)
 */
export function saveImportedQuestions(questions: Question[], append = false) {
  if (typeof window !== 'undefined') {
    let finalQuestions = questions;
    if (append) {
      const current = getActiveQuestions();
      finalQuestions = [...current, ...questions];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQuestions));
    localStorage.setItem(INITIALIZED_KEY, 'true');
  }
}

/**
 * Updates a single question by ID
 */
export function updateQuestion(updated: Question): Question[] {
  const current = getActiveQuestions();
  const index = current.findIndex((q) => q.id === updated.id);
  if (index !== -1) {
    current[index] = { ...updated, updated_at: new Date().toISOString() };
    saveImportedQuestions(current);
  }
  return current;
}

/**
 * Drops (deletes) an entire question paper or exam by paper_id or exam_id
 */
export function deleteQuestionPaper(paperIdOrRef: string): Question[] {
  const current = getActiveQuestions();
  const targetNorm = normalizeExamName(paperIdOrRef).toLowerCase();
  const targetRaw = paperIdOrRef.trim().toLowerCase();

  const nextList = current.filter((q) => {
    const pIdNorm = normalizeExamName(q.paper_id || q.exam_id).toLowerCase();
    const pIdRaw = (q.paper_id || '').trim().toLowerCase();
    const eIdRaw = (q.exam_id || '').trim().toLowerCase();
    const refRaw = (q.official_source_ref || '').trim().toLowerCase();

    // Match by normalized title or raw code substrings
    const matchesTarget =
      pIdNorm === targetNorm ||
      pIdRaw === targetRaw ||
      eIdRaw === targetRaw ||
      refRaw.includes(targetRaw) ||
      (targetRaw.includes('tre 1') && (pIdRaw.includes('tre 1') || pIdRaw.includes('2023-08-26') || refRaw.includes('tre 1'))) ||
      (targetRaw.includes('tre 2') && (pIdRaw.includes('tre 2') || pIdRaw.includes('2023-12-15') || refRaw.includes('tre 2'))) ||
      (targetRaw.includes('tre 3') && (pIdRaw.includes('tre 3') || pIdRaw.includes('2024-08-09') || refRaw.includes('tre 3')));

    return !matchesTarget;
  });

  saveImportedQuestions(nextList, false);
  return nextList;
}

/**
 * Gets unique list of subjects available in current question bank
 */
export function getUniqueSubjects(): string[] {
  const questions = getActiveQuestions();
  const set = new Set<string>();
  questions.forEach((q) => {
    if (q.subject_id) set.add(q.subject_id);
  });
  return Array.from(set).sort();
}

/**
 * Gets unique list of exam names available in current question bank
 */
export function getUniqueExamPapers(): string[] {
  const questions = getActiveQuestions();
  const set = new Set<string>();
  questions.forEach((q) => {
    if (q.paper_id) set.add(q.paper_id);
  });
  return Array.from(set).sort();
}
