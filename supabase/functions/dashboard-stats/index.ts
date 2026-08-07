import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"],
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Documents count
    const { count: documentCount } = await supabaseAdmin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Quizzes completed (attempts)
    const { count: quizCount } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Flashcards reviewed (sum of cards_reviewed)
    const { data: reviews } = await supabaseAdmin
      .from("flashcard_reviews")
      .select("cards_reviewed")
      .eq("user_id", user.id);

    const flashcardsReviewed = (reviews || []).reduce(
      (sum: number, r: any) => sum + (r.cards_reviewed || 0),
      0,
    );

    // Recent documents
    const { data: recentDocs } = await supabaseAdmin
      .from("documents")
      .select("id, title, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Recent quiz attempts with quiz info
    const { data: recentQuizzes } = await supabaseAdmin
      .from("quiz_attempts")
      .select("score, completed_at, quizzes(document_id)")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(5);

    // Recent summaries with document title
    const { data: recentSummaries } = await supabaseAdmin
      .from("summaries")
      .select("created_at, documents!inner(title)")
      .eq("documents.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Recent flashcard reviews with document title via flashcard_sets
    const { data: recentFlashcardReviews } = await supabaseAdmin
      .from("flashcard_reviews")
      .select("reviewed_at, flashcard_sets!inner(document_id, documents!inner(title))")
      .eq("user_id", user.id)
      .order("reviewed_at", { ascending: false })
      .limit(5);

    // Recent chat activity
    const { data: recentChats } = await supabaseAdmin
      .from("chat_messages")
      .select("document_id, created_at")
      .eq("user_id", user.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(5);

    // Build activity feed (most recent first, merged)
    const activity = [
      ...(recentDocs || []).map((d: any) => ({
        type: "document_upload" as const,
        description: `Uploaded "${d.title}"`,
        timestamp: d.created_at,
      })),
      ...(recentQuizzes || []).map((q: any) => ({
        type: "quiz_completed" as const,
        description: `Completed a quiz with score ${q.score}%`,
        timestamp: q.completed_at,
      })),
      ...(recentSummaries || []).map((s: any) => ({
        type: "summary_generated" as const,
        description: `Generated summary for "${(s as any).documents?.title ?? "a document"}"`,
        timestamp: s.created_at,
      })),
      ...(recentFlashcardReviews || []).map((r: any) => {
        const set = (r as any).flashcard_sets;
        const doc = set?.documents;
        return {
          type: "flashcards_reviewed" as const,
          description: `Reviewed flashcards for "${doc?.title ?? "a document"}"`,
          timestamp: r.reviewed_at,
        };
      }),
      ...(recentChats || []).map((c: any) => ({
        type: "chat" as const,
        description: "Asked the AI assistant a question",
        timestamp: c.created_at,
      })),
    ]
      .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);

    return new Response(
      JSON.stringify({
        total_documents: documentCount || 0,
        total_quizzes_completed: quizCount || 0,
        total_flashcards_reviewed: flashcardsReviewed,
        recent_documents: recentDocs || [],
        recent_activity: activity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});