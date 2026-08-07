import { useCallback, useEffect, useState } from "react";
import { Sparkles, FileText, Loader2, RefreshCw } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Markdown } from "../ui/Markdown";
import { supabase } from "../../lib/supabase";
import { invokeEdgeFunction } from "../../lib/api";
import type { Document, Summary } from "../../types";

export function SummaryTab({ doc }: { doc: Document }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .eq("document_id", doc.id)
      .maybeSingle();
    setSummary((data as Summary) ?? null);
    setLoading(false);
  }, [doc.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<{ summary: Summary }>("generate-summary", {
        document_id: doc.id,
      });
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the summary.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading summary…
      </div>
    );
  }

  if (summary) {
    return (
      <div className="space-y-4">
        <Card padding="lg">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Summary
              </h3>
            </div>
            <span className="text-xs text-foreground/50">
              Generated {new Date(summary.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="max-w-none">
            <Markdown text={summary.content} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card padding="lg">
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          No summary yet
        </h3>
        <p className="mt-2 text-foreground/70 max-w-md mx-auto text-sm">
          Generate a concise, structured summary of this document — key
          concepts, definitions, and takeaways at a glance.
        </p>
        <div className="mt-6">
          <Button onClick={generate} disabled={generating || doc.status !== "ready"}>
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Summary
              </>
            )}
          </Button>
        </div>
        {doc.status !== "ready" && (
          <p className="mt-4 text-xs text-foreground/50">
            This document is still processing. Summary generation will be
            available once it&apos;s ready.
          </p>
        )}
        {error && (
          <div className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}

export function SummaryRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center py-10">
      <Button variant="secondary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4" />
        Refresh status
      </Button>
    </div>
  );
}