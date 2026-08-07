import { supabase } from "./supabase";
import { invokeEdgeFunction } from "./api";
import type { Document } from "../types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 6MB — matches the edge function limit

function friendlyStorageError(message: string): string {
  if (/duplicate/i.test(message)) return "A file with that name already exists.";
  if (/size/i.test(message)) return "That file is too large. Please upload a PDF under 6MB.";
  if (/permission|not authorized|security/i.test(message))
    return "We couldn't upload the file. Please sign out and back in, then retry.";
  return "We couldn't upload the file — please try again.";
}

export async function listDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Couldn't load your documents — please try again.");
  return (data ?? []) as Document[];
}

export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Couldn't load that document — please try again.");
  return (data as Document) ?? null;
}

/**
 * Upload a PDF to Supabase Storage, register it in the documents table,
 * then trigger text extraction via the process-document edge function.
 * Returns the document with its final status.
 */
export async function uploadDocument(file: File): Promise<Document> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired — please sign in again.");

  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    throw new Error("Only PDF files are supported right now.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is over 20MB. Please upload a smaller PDF.");
  }

  const title = file.name.replace(/\.pdf$/i, "").trim() || "Untitled document";
  const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(friendlyStorageError(uploadError.message));
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({ user_id: user.id, title, storage_path: storagePath, status: "uploading" })
    .select()
    .single();

  if (insertError || !doc) {
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error("We couldn't save the document — please try again.");
  }

  // Trigger text extraction. The function updates status to "processing" then
  // "ready" (or "error"). Any failure is reflected in the refetched row.
  try {
    await invokeEdgeFunction("process-document", { document_id: doc.id });
  } catch {
    // status was flipped to "error" server-side; fall through to refetch
  }

  const fresh = await getDocument(doc.id);
  return fresh ?? doc;
}

export async function deleteDocument(doc: Document): Promise<void> {
  // Remove the file from storage first (best effort), then the row.
  if (doc.storage_path) {
    await supabase.storage.from("documents").remove([doc.storage_path]);
  }
  const { error } = await supabase.from("documents").delete().eq("id", doc.id);
  if (error) throw new Error("We couldn't delete the document — please try again.");
}

/**
 * Re-run text extraction for documents stuck in "uploading"/"processing"
 * (e.g. a tab was closed mid-upload). Safe to re-run — extraction is
 * idempotent and makes no AI calls. Returns true if any were recovered.
 */
export async function recoverStuckDocuments(docs: Document[]): Promise<boolean> {
  const stuck = docs.filter(
    (d) => d.status === "uploading" || d.status === "processing",
  );
  if (stuck.length === 0) return false;
  await Promise.all(
    stuck.map((d) =>
      invokeEdgeFunction("process-document", { document_id: d.id }).catch(() => undefined),
    ),
  );
  return true;
}
