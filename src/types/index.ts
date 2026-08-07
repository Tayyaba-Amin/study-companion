export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  extracted_text: string | null;
  status: "uploading" | "processing" | "ready" | "error";
  created_at: string;
}

export interface Summary {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
}

export type QuizType = "multiple_choice" | "true_false" | "short_answer";

export interface QuizQuestion {
  type: QuizType;
  question: string;
  options?: string[];
  correct_answer: string;
}

export interface Quiz {
  id: string;
  document_id: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  answers: Record<string, string>;
  completed_at: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  document_id: string;
  cards: Flashcard[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  document_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Activity {
  id?: string;
  type: "document_upload" | "quiz_completed" | "flashcards_reviewed" | "summary_generated" | "chat";
  description: string;
  timestamp: string;
}

export interface DashboardStats {
  total_documents: number;
  total_quizzes_completed: number;
  total_flashcards_reviewed: number;
  recent_documents: Pick<Document, "id" | "title" | "status" | "created_at">[];
  recent_activity: Activity[];
}

export interface StudyProgress {
  total_documents: number;
  total_quizzes_completed: number;
  total_flashcards_reviewed: number;
  recent_activity: Activity[];
}

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};
