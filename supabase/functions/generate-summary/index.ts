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

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify document belongs to user
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

    if (doc.status !== "ready") {
      return new Response(
        JSON.stringify({ error: "Document is not ready for processing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if summary already exists (idempotent)
    const { data: existingSummary } = await supabaseAdmin
      .from("summaries")
      .select("*")
      .eq("document_id", document_id)
      .maybeSingle();

    if (existingSummary) {
      return new Response(JSON.stringify({ summary: existingSummary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!doc.extracted_text) {
      return new Response(JSON.stringify({ error: "Document has no extracted text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate text if too long (~60k chars to stay within context)
    const text =
      doc.extracted_text.length > 60000
        ? doc.extracted_text.slice(0, 60000) +
          "\n\n[Note: text was truncated due to length]"
        : doc.extracted_text;

    // Call AI/ML API
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
              "You are an expert study assistant. Create a concise, well-structured summary of the following lecture notes or document. Use headings, bullet points, and clear language. Focus on key concepts, definitions, and important takeaways.",
          },
          { role: "user", content: `Please summarize this document:\n\n${text}` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const summaryContent = data.choices?.[0]?.message?.content;

    if (!summaryContent) {
      throw new Error("No summary content in AI response");
    }

    // Save to database
    const { data: summary, error: insertError } = await supabaseAdmin
      .from("summaries")
      .insert({
        document_id,
        content: summaryContent,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to save summary");
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});