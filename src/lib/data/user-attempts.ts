import { Question } from '@/types/database';

export interface UserQuestionAttempt {
  questionId: string;
  isAttempted: boolean;
  isCorrect: boolean;
  selectedOptionId?: string;
  timestamp: number;
}

const ATTEMPTS_STORAGE_KEY = 'exampyqs_anonymous_attempts';

/**
 * Retrieves all user attempts from localStorage
 */
export function getUserAttempts(): Record<string, UserQuestionAttempt> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse user attempts from localStorage', e);
  }
  return {};
}

/**
 * Records or updates a single question attempt in localStorage
 */
export function recordUserAttempt(
  questionId: string,
  isCorrect: boolean,
  selectedOptionId?: string
): Record<string, UserQuestionAttempt> {
  const current = getUserAttempts();
  current[questionId] = {
    questionId,
    isAttempted: true,
    isCorrect,
    selectedOptionId,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save user attempt to localStorage', e);
    }
  }

  return current;
}

/**
 * Computes status of a single question
 */
export function getQuestionStatus(
  questionId: string,
  attemptsMap: Record<string, UserQuestionAttempt>
): 'solved' | 'attempted' | 'not_attempted' {
  const attempt = attemptsMap[questionId];
  if (!attempt || !attempt.isAttempted) return 'not_attempted';
  return attempt.isCorrect ? 'solved' : 'attempted';
}

/**
 * Filter criteria interface for Landing Page and Learning Mode
 */
export interface QuestionFilterCriteria {
  exam?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  year?: string;
  status?: string; // 'all' | 'solved' | 'attempted' | 'not_attempted'
  searchQuery?: string;
}

/**
 * Extracts year string from question paper_id, official_source_ref, or created_at
 */
export function getQuestionYear(q: Question): string {
  const textToScan = `${q.paper_id} ${q.official_source_ref} ${q.exam_id}`;
  const match = textToScan.match(/\b(20\d{2}|19\d{2})\b/);
  if (match) return match[1];
  return '2024';
}

/**
 * Applies filters to a list of questions
 */
export function filterQuestions(
  questions: Question[],
  criteria: QuestionFilterCriteria,
  attemptsMap: Record<string, UserQuestionAttempt> = {}
): Question[] {
  return questions.filter((q) => {
    // 1. Exam filter
    if (criteria.exam && criteria.exam !== 'all') {
      const qExam = (q.paper_id || q.exam_id || '').toLowerCase();
      if (!qExam.includes(criteria.exam.toLowerCase())) {
        return false;
      }
    }

    // 2. Subject filter
    if (criteria.subject && criteria.subject !== 'all') {
      const qSub = (q.subject_id || '').toLowerCase();
      if (qSub !== criteria.subject.toLowerCase()) {
        return false;
      }
    }

    // 3. Topic filter
    if (criteria.topic && criteria.topic !== 'all') {
      const qTopic = `${q.topic_id || ''} ${q.chapter_id || ''}`.toLowerCase();
      if (!qTopic.includes(criteria.topic.toLowerCase())) {
        return false;
      }
    }

    // 4. Difficulty filter
    if (criteria.difficulty && criteria.difficulty !== 'all') {
      const qDiff = (q.difficulty || 'medium').toLowerCase();
      if (qDiff !== criteria.difficulty.toLowerCase()) {
        return false;
      }
    }

    // 5. Year filter
    if (criteria.year && criteria.year !== 'all') {
      const qYr = getQuestionYear(q);
      if (qYr !== criteria.year) {
        return false;
      }
    }

    // 6. Status filter
    if (criteria.status && criteria.status !== 'all') {
      const st = getQuestionStatus(q.id, attemptsMap);
      if (st !== criteria.status) {
        return false;
      }
    }

    // 7. Search query
    if (criteria.searchQuery && criteria.searchQuery.trim() !== '') {
      const query = criteria.searchQuery.toLowerCase().trim();
      const searchableText = `${q.question_text} ${q.official_source_ref} ${q.subject_id} ${q.topic_id} ${q.paper_id}`.toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}
