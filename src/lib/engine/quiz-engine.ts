import { Question, QuestionOption } from '@/types/database';

export interface ScoreRule {
  positiveMarks: number;
  negativeMarks: number;
}

export interface EvaluationResult {
  questionId: string;
  selectedOptionId: string | null;
  selectedLetter: string | null;
  isCorrect: boolean;
  marksAwarded: number;
  explanation: {
    overall: string;
    conceptSummary: string | null;
    keyTakeaway: string | null;
    optionExplanations: Record<string, string>; // letter -> explanation
  };
}

export interface AttemptSummary {
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  rawScore: number;
  maxScore: number;
  accuracyPercentage: number;
}

/**
 * Centralized evaluation engine for individual question attempts.
 * Shared by both Learning Mode and Test Mode.
 */
export function evaluateQuestionAnswer(
  question: Question,
  options: QuestionOption[],
  selectedOptionId: string | null,
  rule: ScoreRule = { positiveMarks: 1.0, negativeMarks: 0.25 }
): EvaluationResult {
  const selectedOpt = options.find((o) => o.id === selectedOptionId);
  const correctOpt = options.find((o) => o.is_correct);

  const isCorrect = selectedOpt ? selectedOpt.is_correct : false;

  let marksAwarded = 0;
  if (selectedOptionId) {
    if (isCorrect) {
      marksAwarded = question.marks || rule.positiveMarks;
    } else {
      marksAwarded = -(question.negative_marks || rule.negativeMarks);
    }
  }

  // Map option-wise explanations
  const optionExplanations: Record<string, string> = {};
  options.forEach((opt) => {
    if (opt.explanation) {
      optionExplanations[opt.option_letter] = opt.explanation;
    }
  });

  return {
    questionId: question.id,
    selectedOptionId,
    selectedLetter: selectedOpt?.option_letter || null,
    isCorrect,
    marksAwarded,
    explanation: {
      overall: question.explanations?.overall_explanation || 'No overall explanation provided.',
      conceptSummary: question.explanations?.concept_summary || null,
      keyTakeaway: question.explanations?.key_takeaway || null,
      optionExplanations,
    },
  };
}

/**
 * Calculate overall scorecard summary for a set of attempt answers.
 */
export function calculateAttemptSummary(
  evaluations: EvaluationResult[],
  totalQuestionsCount: number
): AttemptSummary {
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let rawScore = 0;

  evaluations.forEach((ev) => {
    if (ev.selectedOptionId) {
      totalAttempted++;
      if (ev.isCorrect) {
        totalCorrect++;
      } else {
        totalIncorrect++;
      }
      rawScore += ev.marksAwarded;
    }
  });

  const totalUnattempted = totalQuestionsCount - totalAttempted;
  const accuracyPercentage = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  return {
    totalQuestions: totalQuestionsCount,
    totalAttempted,
    totalCorrect,
    totalIncorrect,
    totalUnattempted,
    rawScore: Math.max(0, Math.round(rawScore * 100) / 100),
    maxScore: totalQuestionsCount * 1.0,
    accuracyPercentage: Math.round(accuracyPercentage * 10) / 10,
  };
}
