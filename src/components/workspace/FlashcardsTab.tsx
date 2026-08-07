import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Markdown } from "../ui/Markdown";
import { supabase } from "../../lib/supabase";
import { invokeEdgeFunction } from "../../lib/api";
import type { Document, FlashcardSet } from "../../types";

interface FlashcardsTabProps {
  doc: Document;
}

export function FlashcardsTab({ doc }: FlashcardsTabProps) {
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studying, setStudying] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<number, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data } = await supabase
      .from("flashcard_sets")
      .select("*")
      .eq("document_id", doc.id)
      .maybeSingle();
    setSet((data as FlashcardSet) ?? null);
    setLoading(false);
  }, [doc.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<{ flashcard_set: FlashcardSet }>(
        "generate-flashcards",
        { document_id: doc.id },
      );
      setSet(result.flashcard_set);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't generate the flashcards.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const startStudy = () => {
    setStudying(true);
    setIndex(0);
    setFlipped(false);
    setKnown({});
    setReviewed(false);
  };

  const mark = (knew: boolean) => {
    setKnown((prev) => ({ ...prev, [index]: knew }));
    setFlipped(false);
    if (index < set!.cards.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finishReview(knew);
    }
  };

  const finishReview = async (lastKnew: boolean) => {
    if (!set) return;
    setSavingReview(true);
    const finalKnown = { ...known, [index]: lastKnew };
    setKnown(finalKnown);
    try {
      await supabase.from("flashcard_reviews").insert({
        flashcard_set_id: set.id,
        user_id: doc.user_id,
        cards_reviewed: set.cards.length,
      });
    } catch {
      // review tracking is best-effort
    } finally {
      setSavingReview(false);
      setReviewed(true);
    }
  };

  const reset = () => {
    setStudying(false);
    setIndex(0);
    setFlipped(false);
    setKnown({});
    setReviewed(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading flashcards…
      </div>
    );
  }

  // Setup screen
  if (!studying) {
    return (
      <Card padding="lg">
        {set ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {set.cards.length} flashcards ready
            </h3>
            <p className="mt-2 text-foreground/70 text-sm">
              Flip each card to check your knowledge.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={startStudy}>
                <Layers className="w-4 h-4" />
                Start Review
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
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              No flashcards yet
            </h3>
            <p className="mt-2 text-foreground/70 text-sm max-w-md mx-auto">
              Generate a deck of flashcards from this document to drill key
              concepts and definitions.
            </p>
            <div className="mt-6">
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
                    Generate Flashcards
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Review summary
  if (reviewed) {
    const knownCount = Object.values(known).filter(Boolean).length;
    const total = set!.cards.length;
    const pct = Math.round((knownCount / total) * 100);
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <h3 className="font-heading text-2xl font-bold text-foreground">
            {knownCount}/{total} known
          </h3>
          <p className="mt-1 text-foreground/70">
            {pct >= 80
              ? "Great recall! These concepts are sticking."
              : pct >= 50
              ? "Solid progress — review the tricky ones again soon."
              : "Keep at it — repeated review builds memory."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={startStudy}>
              <RotateCcw className="w-4 h-4" />
              Review Again
            </Button>
            <Button variant="ghost" onClick={reset}>
              Back to setup
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Card screen
  const card = set!.cards[index];
  const total = set!.cards.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm text-foreground/50 font-medium">
            Card {index + 1} of {total}
          </span>
        </div>
        <div className="flex gap-1">
          {set!.cards.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < index
                  ? known[i]
                    ? "bg-accent"
                    : "bg-destructive"
                  : i === index
                  ? "bg-primary"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Flip card */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full text-left cursor-pointer"
        aria-label={flipped ? "Show question side" : "Show answer side"}
      >
        <Card padding="lg" className="min-h-56 flex flex-col justify-center">
          <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-3">
            {flipped ? "Answer" : "Question"}
          </span>
          <div className="text-lg font-medium text-foreground leading-relaxed">
            {flipped ? <Markdown text={card.back} /> : <Markdown text={card.front} />}
          </div>
          <span className="mt-6 text-sm text-primary font-medium">
            {flipped ? "Tap to flip back" : "Tap to reveal answer"}
          </span>
        </Card>
      </button>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            setFlipped(false);
          }}
          disabled={index === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        {flipped ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => mark(false)}
              disabled={savingReview}
              className="!border-destructive/40 !text-destructive hover:!bg-destructive/5"
            >
              <XCircle className="w-4 h-4" />
              Still Learning
            </Button>
            <Button size="sm" onClick={() => mark(true)} disabled={savingReview}>
              <CheckCircle2 className="w-4 h-4" />
              Knew It
            </Button>
          </div>
        ) : (
          <span className="text-sm text-foreground/50">
            Flip the card to grade yourself
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIndex((i) => Math.min(total - 1, i + 1));
            setFlipped(false);
          }}
          disabled={index === total - 1}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
