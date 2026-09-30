import { Question } from '@/types/database';
import { computeTextHash } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'exampyqs_custom_questions';
const INITIALIZED_KEY = 'exampyqs_initialized_v1';

/**
 * Helper to normalize paper IDs / exam codes into clean human-readable Exam Names
 */
export function normalizeExamName(paperIdOrExam?: string | null, year?: string | number): string {
  if (!paperIdOrExam) return 'BPSC TRE';
  const str = paperIdOrExam.toString().trim();

  // Known paper codes and names mapping
  if (str.includes('2023-08-26') || str.includes('26-Aug-2023') || str === 'TRE 1') {
    return 'TRE 1 (2023)';
  }
  if (str.includes('2023-12-15') || str.includes('15-Dec-2023') || str === 'TRE 2') {
    return 'TRE 2 (2023)';
  }
  if (str.includes('2024-08-09') || str.includes('09-Aug-2024') || str === 'TRE 3') {
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
    const rawPaper = row['exam name'] || row.exam_name || row.paper || row.paper_id || row.exam || '';
    const rawDate = row.date || row.year || '';
    examName = normalizeExamName(rawPaper, rawDate);
  }

  // Parse difficulty level: easy, medium, hard
  const rawDifficulty = (row['difficulty level'] || row.difficulty_level || row.difficulty || 'medium')
    .toString()
    .trim()
    .toLowerCase();
  const difficulty: 'easy' | 'medium' | 'hard' = ['easy', 'medium', 'hard'].includes(rawDifficulty)
    ? (rawDifficulty as 'easy' | 'medium' | 'hard')
    : 'medium';

  const qNum = row.question_no ? `Q.${row.question_no}` : `Q.${index + 1}`;
  const officialRef = row.official_source_ref || `${examName} ${qNum}`;

  return {
    id: `q-custom-${Date.now()}-${index + 1}`,
    exam_id: metadataOverride?.examName || row['exam name'] || row.exam || 'BPSC TRE',
    paper_id: examName,
    subject_id: rawSubject,
    chapter_id: row.chapter ? row.chapter.toString().trim() : (row.topic ? row.topic.toString().trim() : 'General Chapter'),
    topic_id: row.topic ? row.topic.toString().trim() : 'General Topic',
    question_text: qText,
    question_type: 'multiple_choice',
    source_type: 'official_pyq',
    official_source_ref: officialRef,
    derived_from_question_id: null,
    difficulty,
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
      overall_explanation: row.explanation || row.overall_explanation || 'Refer to standard concept solution.',
      concept_summary: row.source_basis || null,
      key_takeaway: row.source_basis || null,
      created_at: new Date().toISOString(),
    },
    tags: [rawSubject, row.topic || row.chapter || 'Exam', examName].filter(Boolean),
  };
}

/**
 * Dynamically gets all active questions from localStorage with async Supabase background sync
 */
export function getActiveQuestions(): Question[] {
  let questions: Question[] = [];

  if (typeof window !== 'undefined') {
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
 * Async background sync to fetch questions from Supabase Database
 */
export async function syncFromSupabase(): Promise<Question[]> {
  try {
    const supabase = createClient();
    const { data: remoteQuestions, error } = await supabase
      .from('questions')
      .select('*, options:question_options(*), explanations:question_explanations(*)');

    if (!error && Array.isArray(remoteQuestions) && remoteQuestions.length > 0) {
      const mapped: Question[] = remoteQuestions.map((q: any) => ({
        id: q.id,
        exam_id: q.exam_id || 'BPSC TRE',
        paper_id: normalizeExamName(q.paper_id || q.official_source_ref),
        subject_id: q.subject_id || 'General Studies',
        chapter_id: q.chapter_id || 'General Chapter',
        topic_id: q.topic_id || 'General Topic',
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        source_type: q.source_type || 'official_pyq',
        official_source_ref: q.official_source_ref || 'PYQ',
        derived_from_question_id: q.derived_from_question_id,
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 1.0,
        negative_marks: q.negative_marks || 0.25,
        status: q.status || 'published',
        language: q.language || 'en',
        text_hash: q.text_hash || computeTextHash(q.question_text),
        created_at: q.created_at,
        updated_at: q.updated_at,
        options: q.options || [],
        explanations: q.explanations?.[0] || q.explanations || undefined,
        tags: q.tags || [],
      }));

      saveImportedQuestions(mapped, false);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase sync unreachable, using localStorage fallback', err);
  }

  return getActiveQuestions();
}

export interface SupabaseSyncResult {
  supabaseSynced: boolean;
  syncedCount: number;
  error?: string;
}

/**
 * Saves questions list (supports appending new imported papers) and attempts database sync
 */
export function saveImportedQuestions(questions: Question[], append = false) {
  saveImportedQuestionsToSupabase(questions, append).catch((err) => {
    console.warn('Background Supabase sync error:', err);
  });
}

/**
 * Saves questions list to local storage and syncs to Supabase Database (including options and explanations)
 */
export async function saveImportedQuestionsToSupabase(
  questions: Question[],
  append = true
): Promise<SupabaseSyncResult> {
  let finalQuestions = questions;
  if (typeof window !== 'undefined') {
    if (append) {
      const current = getActiveQuestions();
      finalQuestions = [...current, ...questions];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQuestions));
    localStorage.setItem(INITIALIZED_KEY, 'true');
  }

  // Attempt database sync to Supabase
  try {
    const supabase = createClient();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder-project')) {
      return {
        supabaseSynced: false,
        syncedCount: 0,
        error: 'Supabase URL is not configured or using placeholder.',
      };
    }

    let syncedCount = 0;
    let lastError: string | undefined = undefined;

    for (const q of questions) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id);

      const questionPayload: any = {
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        source_type: q.source_type || 'official_pyq',
        official_source_ref: q.official_source_ref || null,
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 1.0,
        negative_marks: q.negative_marks || 0.25,
        status: q.status || 'published',
        language: q.language || 'en',
        text_hash: q.text_hash || computeTextHash(q.question_text),
      };

      if (isUuid) {
        questionPayload.id = q.id;
      }

      if (q.exam_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.exam_id)) {
        questionPayload.exam_id = q.exam_id;
      }
      if (q.paper_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.paper_id)) {
        questionPayload.paper_id = q.paper_id;
      }
      if (q.subject_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.subject_id)) {
        questionPayload.subject_id = q.subject_id;
      }

      // Insert question into public.questions
      const { data: insertedQ, error: qErr } = await supabase
        .from('questions')
        .insert(questionPayload)
        .select('id')
        .single();

      if (qErr) {
        console.error('Supabase question insert error:', qErr);
        if (qErr.code === 'PGRST205' || qErr.message.includes('schema cache')) {
          lastError = "Table 'public.questions' does not exist in your remote Supabase database. Please run the SQL migration script in your Supabase SQL Editor.";
        } else {
          lastError = qErr.message;
        }
        continue;
      }

      if (insertedQ?.id) {
        syncedCount++;
        const realQuestionId = insertedQ.id;

        // Insert options into public.question_options
        if (q.options && q.options.length > 0) {
          const optionsPayload = q.options.map((opt) => ({
            question_id: realQuestionId,
            option_letter: opt.option_letter,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            explanation: opt.explanation || null,
          }));

          const { error: optErr } = await supabase
            .from('question_options')
            .insert(optionsPayload);

          if (optErr) {
            console.error('Supabase options insert error:', optErr);
          }
        }

        // Insert explanations into public.question_explanations
        if (q.explanations && q.explanations.overall_explanation) {
          const { error: expErr } = await supabase
            .from('question_explanations')
            .insert({
              question_id: realQuestionId,
              overall_explanation: q.explanations.overall_explanation,
              concept_summary: q.explanations.concept_summary || null,
              key_takeaway: q.explanations.key_takeaway || null,
            });

          if (expErr) {
            console.error('Supabase explanation insert error:', expErr);
          }
        }

        // Insert tags into public.question_tags
        if (q.tags && q.tags.length > 0) {
          const uniqueTags = Array.from(new Set(q.tags)).filter(Boolean);
          const tagsPayload = uniqueTags.map((tag) => ({
            question_id: realQuestionId,
            tag_name: tag,
          }));

          const { error: tagErr } = await supabase
            .from('question_tags')
            .insert(tagsPayload);

          if (tagErr) {
            console.error('Supabase tags insert error:', tagErr);
          }
        }
      }
    }

    if (syncedCount > 0) {
      return {
        supabaseSynced: true,
        syncedCount,
      };
    } else {
      return {
        supabaseSynced: false,
        syncedCount: 0,
        error: lastError || 'Failed to insert questions into Supabase database.',
      };
    }
  } catch (err: any) {
    console.error('Supabase sync exception:', err);
    return {
      supabaseSynced: false,
      syncedCount: 0,
      error: err.message || 'An unexpected error occurred during database sync.',
    };
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
