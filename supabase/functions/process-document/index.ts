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
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"],
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify the session
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
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get document record
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update status to processing
    await supabaseAdmin
      .from("documents")
      .update({ status: "processing" })
      .eq("id", document_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      await supabaseAdmin
        .from("documents")
        .update({ status: "error" })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({ error: "Failed to download file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check file size (max 6MB)
    if (fileData.size > 6 * 1024 * 1024) {
      await supabaseAdmin
        .from("documents")
        .update({ status: "error" })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({ error: "File exceeds maximum size of 6MB" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Save to temp storage and extract text
    const arrayBuffer = await fileData.arrayBuffer();
    const tempPath = `/tmp/${crypto.randomUUID()}.pdf`;
    await Deno.writeFile(tempPath, new Uint8Array(arrayBuffer));

    // Extract text using pdf.js
    let extractedText: string;
    try {
      const { getDocument } = await import("npm:pdfjs-dist@4.0.379");
      const pdfData = new Uint8Array(arrayBuffer);
      const pdf = await getDocument({ data: pdfData }).promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        pages.push(pageText);
      }

      extractedText = pages.join("\n\n");

      if (!extractedText.trim()) {
        throw new Error("No text could be extracted from the PDF");
      }
    } catch (extractError) {
      await supabaseAdmin
        .from("documents")
        .update({ status: "error" })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({
          error: "Failed to extract text from PDF. Ensure it's a text-based PDF.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } finally {
      // Clean up temp file
      try {
        await Deno.remove(tempPath);
      } catch {
        // ignore cleanup errors
      }
    }

    // Update document with extracted text
    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({
        extracted_text: extractedText,
        status: "ready",
      })
      .eq("id", document_id);

    if (updateError) {
      await supabaseAdmin
        .from("documents")
        .update({ status: "error" })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({ error: "Failed to save extracted text" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        status: "ready",
        extracted_length: extractedText.length,
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