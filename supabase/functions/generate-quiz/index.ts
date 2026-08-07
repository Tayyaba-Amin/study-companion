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

    const body = await req.json();
    const { document_id, quiz_type, question_count } = body;

    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = quiz_type || "multiple_choice";
    const count = Math.min(Math.max(parseInt(question_count) || 5, 1), 20);

    if (!["multiple_choice", "true_false", "short_answer"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid quiz_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify document ownership
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("id, extracted_text, status")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (doc.status !== "ready" || !doc.extracted_text) {
      return new Response(
        JSON.stringify({ error: "Document is not ready for processing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text =
      doc.extracted_text.length > 60000
        ? doc.extracted_text.slice(0, 60000) +
          "\n\n[Note: text was truncated due to length]"
        : doc.extracted_text;

    const apiKey = Deno.env.get("AI_ML_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    const baseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.aimlapi.com/v1";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeInstructions: Record<string, string> = {
      multiple_choice:
        "Generate multiple choice questions. Each question must have exactly 4 options (a, b, c, d), with exactly one correct answer. The correct_answer field must be EXACTLY the letter of the correct option (a, b, c, or d), not the full answer text.",
      true_false:
        "Generate true/false questions. Set options to ['True', 'False'] and correct_answer must be exactly 'True' or 'False'.",
      short_answer:
        "Generate short-answer questions. Leave options empty or omit them. correct_answer should be a concise expected answer (1-3 sentences).",
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert quiz creator for students. Create accurate, fair quiz questions based strictly on the provided document content. All questions must be answerable from the given text.

Respond with ONLY a single valid JSON object — no markdown, no code fences, no commentary. The object must match this shape exactly:
{"questions":[{"type":"multiple_choice|true_false|short_answer","question":"...","options":["..."],"correct_answer":"..."}]}
- For multiple_choice: options must contain exactly 4 strings.
- For true_false: options must be ["True", "False"].
- For short_answer: options should be empty.`,
          },
          {
            role: "user",
            content: `Create ${count} ${type.replace("_", " ")} questions from this document:\n\n${text}\n\n${typeInstructions[type]}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      // Don't leak raw provider error bodies to the client.
      throw new Error(
        "The AI service couldn't generate a quiz right now. Please try again in a moment.",
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response (tolerates markdown fences or surrounding text)
    let questions;
    try {
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      const json =
        start !== -1 && end > start ? content.slice(start, end + 1) : content;
      const parsed = JSON.parse(json);
      questions = parsed.questions;
    } catch {
      throw new Error("The AI returned an unreadable quiz format. Please try again.");
    }

    // Save quiz
    const { data: quiz, error: insertError } = await supabaseAdmin
      .from("quizzes")
      .insert({
        document_id,
        questions,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to save quiz");
    }

    return new Response(JSON.stringify({ quiz }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});