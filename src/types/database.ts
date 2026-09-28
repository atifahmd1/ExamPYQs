export type UserRole = 'student' | 'editor' | 'admin';
export type QuestionStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
export type SourceType = 'official_pyq' | 'ai_generated';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TestType = 'pyq_paper' | 'subject_test' | 'chapter_test' | 'custom_test';
export type AttemptMode = 'learning' | 'test';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type ProgressStatus = 'unattempted' | 'correct' | 'incorrect';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamPaper {
  id: string;
  exam_id: string;
  code: string;
  title: string;
  year: number;
  session_name: string | null;
  shift: string | null;
  total_marks: number;
  duration_minutes: number;
  rules_config: Record<string, unknown>;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  code: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Topic {
  id: string;
  chapter_id: string;
  code: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_letter: 'A' | 'B' | 'C' | 'D' | 'E';
  option_text: string;
  is_correct: boolean;
  explanation: string | null;
}

export interface QuestionExplanation {
  id: string;
  question_id: string;
  overall_explanation: string;
  concept_summary: string | null;
  key_takeaway: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  exam_id: string | null;
  paper_id: string | null;
  subject_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  question_text: string;
  question_type: string;
  source_type: SourceType;
  official_source_ref: string | null;
  derived_from_question_id: string | null;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  status: QuestionStatus;
  language: string;
  text_hash: string;
  created_at: string;
  updated_at: string;
  // Joined relation types for UI
  options?: QuestionOption[];
  explanations?: QuestionExplanation;
  tags?: string[];
}

export interface Test {
  id: string;
  title: string;
  test_type: TestType;
  exam_id: string | null;
  paper_id: string | null;
  subject_id: string | null;
  chapter_id: string | null;
  total_questions: number;
  duration_minutes: number;
  marking_rule: {
    positive: number;
    negative: number;
  };
  status: QuestionStatus;
  created_at: string;
}

export interface UserAttempt {
  id: string;
  user_id: string | null;
  session_token: string | null;
  test_id: string | null;
  mode: AttemptMode;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  score: number;
  total_correct: number;
  total_incorrect: number;
  total_unattempted: number;
  accuracy_percentage: number;
  time_taken_seconds: number;
  created_at: string;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  selected_letter: string | null;
  is_correct: boolean | null;
  marks_awarded: number;
  time_spent_seconds: number;
  marked_for_review: boolean;
  answered_at: string;
}

export interface UserQuestionProgress {
  id: string;
  user_id: string;
  question_id: string;
  total_attempts: number;
  correct_attempts: number;
  last_status: ProgressStatus;
  last_attempted_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DailyAnalytics {
  date: string;
  active_users_count: number;
  new_users_count: number;
  total_questions_attempted: number;
  total_tests_completed: number;
  created_at: string;
  updated_at: string;
}
