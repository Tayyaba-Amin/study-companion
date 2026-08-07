import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// JSON schema for flashcard output
const flashcardSchema = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
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

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
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

    // Check if flashcards already exist (idempotent)
    const { data: existingSet } = await supabaseAdmin
      .from("flashcard_sets")
      .select("*")
      .eq("document_id", document_id)
      .maybeSingle();

    if (existingSet) {
      return new Response(JSON.stringify({ flashcard_set: existingSet }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            content:
              "You are an expert at creating study flashcards. Generate concise, focused flashcards where each card covers one key concept. Front should be a clear prompt or question, back should be a precise answer or definition.",
          },
          {
            role: "user",
            content: `Create 10-15 flashcards from this document. Front should be the term/concept/question, back should be the definition/explanation/answer:\n\n${text}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "flashcards",
            schema: flashcardSchema,
            strict: true,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let cards;
    try {
      const parsed = JSON.parse(content);
      cards = parsed.cards;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("AI returned no flashcards");
    }

    // Save flashcard set
    const { data: flashcardSet, error: insertError } = await supabaseAdmin
      .from("flashcard_sets")
      .insert({
        document_id,
        cards,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to save flashcard set");
    }

    return new Response(JSON.stringify({ flashcard_set: flashcardSet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});