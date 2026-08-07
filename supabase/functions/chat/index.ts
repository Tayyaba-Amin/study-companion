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

    const { document_id, message } = await req.json();

    if (!document_id || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "document_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify document ownership
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("id, extracted_text, title")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    const { error: msgError } = await supabaseAdmin.from("chat_messages").insert({
      document_id,
      user_id: user.id,
      role: "user",
      content: message.trim(),
    });

    if (msgError) {
      throw new Error("Failed to save message");
    }

    // Get recent history
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("document_id", document_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const text =
      doc.extracted_text && doc.extracted_text.length > 40000
        ? doc.extracted_text.slice(0, 40000) +
          "\n\n[Note: document was truncated for length]"
        : doc.extracted_text || "";

    const apiKey = Deno.env.get("AI_ML_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    const baseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.aimlapi.com/v1";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context messages
    const messages = [
      {
        role: "system",
        content: `You are an AI study assistant helping a student understand their document titled "${doc.title}". Answer questions based strictly on the provided document content. If the answer isn't in the document, say so clearly. Be helpful, clear, and educational. Here is the document content:\n\n${text}`,
      },
      ...(history || [])
        .filter((m: any) => m.content)
        .slice(-10)
        .map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const replyContent = data.choices?.[0]?.message?.content;

    if (!replyContent) {
      throw new Error("No response from AI");
    }

    // Save assistant message
    const { data: assistantMsg, error: replyError } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        document_id,
        user_id: user.id,
        role: "assistant",
        content: replyContent,
      })
      .select()
      .single();

    if (replyError) {
      throw new Error("Failed to save response");
    }

    // Return both the assistant message and updated history
    const { data: updatedHistory } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("document_id", document_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return new Response(
      JSON.stringify({
        message: assistantMsg,
        history: updatedHistory || [],
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