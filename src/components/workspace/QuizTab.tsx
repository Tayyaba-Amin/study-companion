import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { supabase } from "../../lib/supabase";
import { invokeEdgeFunction } from "../../lib/api";
import type { Document, Quiz, QuizAttempt } from "../../types";

type QuizType = "multiple_choice" | "true_false" | "short_answer";

interface QuizTabProps {
  doc: Document;
}

export function QuizTab({ doc }: QuizTabProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizType, setQuizType] = useState<QuizType>("multiple_choice");
  const [questionCount, setQuestionCount] = useState(5);

  // Quiz playing state
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false); // answer shown for current question
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data } = await supabase
      .from("quizzes")
      .select("*")
      .eq("document_id", doc.id)
      .maybeSingle();
    setQuiz((data as Quiz) ?? null);
    setLoading(false);
  }, [doc.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<{ quiz: Quiz }>("generate-quiz", {
        document_id: doc.id,
        quiz_type: quizType,
        question_count: questionCount,
      });
      setQuiz(result.quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the quiz.");
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = () => {
    setPlaying(true);
    setCurrentIndex(0);
    setAnswers({});
    setRevealed(false);
    setAttempt(null);
  };

  const selectAnswer = (answer: string) => {
    if (revealed) return;
    setAnswers((prev) => ({ ...prev, [String(currentIndex)]: answer }));
  };

  const isCorrect = (questionIdx: number): boolean => {
    const q = quiz!.questions[questionIdx];
    const userAnswer = (answers[String(questionIdx)] ?? "").trim().toLowerCase();
    const correct = q.correct_answer.trim().toLowerCase();
    if (q.type === "multiple_choice") {
      // correct_answer might be a letter (a/b/c/d) or the full answer text
      if (/^[a-d]$/.test(correct)) return userAnswer[0] === correct[0];
      // Full text — find the matching option index and convert to letter
      const idx = (q.options ?? []).findIndex((o) => o.trim().toLowerCase() === correct);
      if (idx === -1) return false;
      return userAnswer[0] === String.fromCharCode(97 + idx);
    }
    if (q.type === "true_false") return userAnswer === correct;
    // Short answer: fuzzy match — half of the significant words present
    const words = correct.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return userAnswer === correct;
    const hits = words.filter((w) => userAnswer.includes(w)).length;
    return hits / words.length >= 0.5 || userAnswer === correct;
  };

  const finishQuiz = async () => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      let correct = 0;
      quiz.questions.forEach((_, i) => {
        if (isCorrect(i)) correct++;
      });
      const score = Math.round((correct / quiz.questions.length) * 100);

      const { data } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          user_id: doc.user_id,
          score,
          answers,
        })
        .select()
        .single();

      setAttempt((data as QuizAttempt) ?? null);
    } catch {
      setError("We couldn't save your score — but here's how you did.");
      // Still show results even if save fails
      let correct = 0;
      quiz.questions.forEach((_, i) => {
        if (isCorrect(i)) correct++;
      });
      const score = Math.round((correct / quiz.questions.length) * 100);
      setAttempt({ id: "", quiz_id: quiz.id, user_id: doc.user_id, score, answers, completed_at: new Date().toISOString() } as QuizAttempt);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setPlaying(false);
    setCurrentIndex(0);
    setAnswers({});
    setRevealed(false);
    setAttempt(null);
  };

  const next = () => {
    if (currentIndex < quiz!.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    }
  };
  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setRevealed(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading quiz…
      </div>
    );
  }

  // Setup screen — no quiz yet, or quiz exists but not started
  if (!playing) {
    return (
      <Card padding="lg">
        {quiz ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Quiz ready
            </h3>
            <p className="mt-2 text-foreground/70 text-sm">
              {quiz.questions.length} questions to test your knowledge
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={startQuiz}>
                <Brain className="w-4 h-4" />
                Start Quiz
              </Button>
              <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>
                <RotateCcw className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Generate a Quiz
              </h3>
              <p className="mt-2 text-foreground/70 text-sm max-w-md mx-auto">
                Create practice questions to test your understanding of this
                document.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-4">
              <div>
                <span className="block text-sm font-medium text-foreground mb-1.5">
                  Question type
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      ["multiple_choice", "Multiple Choice"],
                      ["true_false", "True/False"],
                      ["short_answer", "Short Answer"],
                    ] as [QuizType, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setQuizType(value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                        quizType === value
                          ? "bg-primary text-white"
                          : "bg-muted text-foreground/70 hover:bg-border"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-foreground mb-1.5">
                  Number of questions: {questionCount}
                </span>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={generate}
                disabled={generating || doc.status !== "ready"}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Results screen
  if (attempt) {
    const total = quiz!.questions.length;
    const correctCount = Math.round((attempt.score / 100) * total);
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h3 className="font-heading text-3xl font-bold text-foreground">
            {attempt.score}%
          </h3>
          <p className="mt-1 text-foreground/70">
            You got {correctCount} out of {total} correct
          </p>
          <p className="mt-1 text-sm text-foreground/50">
            {attempt.score >= 80
              ? "Excellent work! You've mastered this material."
              : attempt.score >= 60
              ? "Good job — review the missed questions and try again."
              : "Keep practicing — review the document and retake the quiz."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={startQuiz}>
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </Button>
            <Button variant="ghost" onClick={reset}>
              Back to setup
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Question screen
  const question = quiz!.questions[currentIndex];
  const total = quiz!.questions.length;
  const isLast = currentIndex === total - 1;
  const answered = answers[String(currentIndex)] !== undefined;
  const allAnswered = quiz!.questions.every(
    (_, i) => answers[String(i)] !== undefined,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-sm text-foreground/50 font-medium shrink-0">
          {currentIndex + 1}/{total}
        </span>
      </div>

      <Card padding="lg">
        <div className="space-y-6">
          <div>
            <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">
              {question.type.replace("_", " ")}
            </span>
            <p className="mt-2 text-lg font-medium text-foreground">
              {question.question}
            </p>
          </div>

          {question.type === "true_false" && (
            <div className="flex gap-3">
              {["True", "False"].map((opt) => {
                const isSelected =
                  answers[String(currentIndex)]?.toLowerCase() === opt.toLowerCase();
                const isRight =
                  question.correct_answer.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    disabled={revealed}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      revealed
                        ? isRight
                          ? "border-accent bg-accent/5 text-accent"
                          : isSelected
                          ? "border-destructive bg-destructive/5 text-destructive"
                          : "border-border text-foreground/50"
                        : isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "multiple_choice" && question.options && (
            <div className="space-y-2">
              {question.options.map((opt, oi) => {
                const letter = String.fromCharCode(97 + oi);
                const isSelected = (answers[String(currentIndex)] ?? "")
                  .toLowerCase()
                  .startsWith(letter);
                const correctLetter = (() => {
                  const ca = question.correct_answer.trim().toLowerCase();
                  if (/^[a-d]$/.test(ca)) return ca;
                  const idx = (question.options ?? []).findIndex(
                    (o) => o.trim().toLowerCase() === ca,
                  );
                  return idx === -1 ? "" : String.fromCharCode(97 + idx);
                })();
                const isRight = letter === correctLetter;
                return (
                  <button
                    key={oi}
                    onClick={() => selectAnswer(letter)}
                    disabled={revealed}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                      revealed
                        ? isRight
                          ? "border-accent bg-accent/5 text-accent"
                          : isSelected
                          ? "border-destructive bg-destructive/5 text-destructive"
                          : "border-border text-foreground/50"
                        : isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <span className="font-bold mr-2">{letter})</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "short_answer" && (
            <div className="space-y-3">
              <textarea
                value={answers[String(currentIndex)] ?? ""}
                onChange={(e) => selectAnswer(e.target.value)}
                disabled={revealed}
                placeholder="Type your answer…"
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl text-base bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors duration-200 resize-y"
              />
              {revealed && (
                <div className="text-sm text-foreground/70 bg-muted rounded-xl px-4 py-3">
                  <span className="font-semibold">Expected answer: </span>
                  {question.correct_answer}
                </div>
              )}
            </div>
          )}

          {revealed && question.type !== "short_answer" && (
            <div
              className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 ${
                isCorrect(currentIndex)
                  ? "bg-accent/5 text-accent"
                  : "bg-destructive/5 text-destructive"
              }`}
            >
              {isCorrect(currentIndex) ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>
                {isCorrect(currentIndex)
                  ? "Correct!"
                  : `Not quite — the correct answer is: ${
                      question.type === "multiple_choice" && question.options
                        ? (() => {
                            const ca = question.correct_answer.trim().toLowerCase();
                            if (/^[a-d]$/.test(ca)) {
                              const idx = ca.charCodeAt(0) - 97;
                              return question.options[idx] ?? question.correct_answer;
                            }
                            return question.correct_answer;
                          })()
                        : question.correct_answer
                    }`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            {!revealed ? (
              <Button size="sm" onClick={() => setRevealed(true)} disabled={!answered}>
                Check Answer
              </Button>
            ) : isLast ? (
              <Button
                size="sm"
                onClick={finishQuiz}
                disabled={!allAnswered || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scoring…
                  </>
                ) : (
                  "Finish & See Score"
                )}
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
