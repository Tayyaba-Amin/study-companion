import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Clock,
  MoreVertical,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  recoverStuckDocuments,
  MAX_UPLOAD_BYTES,
} from "../lib/documents";
import type { Document } from "../types";

export function MyDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setUploadError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      // Recover any stuck documents in the background
      const recovered = await recoverStuckDocuments(docs);
      if (recovered) {
        const refreshed = await listDocuments();
        setDocuments(refreshed);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await uploadDocument(file);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: "bg-accent/10 text-accent",
      processing: "bg-secondary/10 text-secondary",
      uploading: "bg-muted text-foreground/50",
      error: "bg-destructive/10 text-destructive",
    };
    return (
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${styles[status] || "bg-muted text-foreground/50"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
            My Documents
          </h1>
          <p className="mt-1 text-foreground/70">
            Upload and manage your study materials.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleUpload}
            aria-label="Upload PDF file"
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Upload PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {uploadError && (
        <div
          className="bg-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
          role="alert"
        >
          {uploadError}
        </div>
      )}

      {loading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12 text-foreground/50">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading your documents…
          </div>
        </Card>
      ) : documents.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-foreground/30" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              No documents yet
            </h2>
            <p className="mt-2 text-foreground/70 max-w-sm mx-auto">
              Upload your lecture notes, textbook chapters, or any PDF study
              material. We&apos;ll extract the text so AI can help you learn.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Your First PDF
                  </>
                )}
              </Button>
            </div>
            <p className="mt-4 text-xs text-foreground/50">
              Supported: PDF files up to {MAX_UPLOAD_BYTES / (1024 * 1024)}MB
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} hover padding="md" className="relative">
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/workspace/${doc.id}`)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground/50">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {statusBadge(doc.status)}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-foreground/30 shrink-0" />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(menuOpen === doc.id ? null : doc.id);
                }}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted cursor-pointer text-foreground/50"
                aria-label={`Actions for ${doc.title}`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen === doc.id && (
                <div className="absolute top-12 right-3 bg-background rounded-xl shadow-xl border border-border z-20 w-44 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                      setMenuOpen(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors duration-150 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete document
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete document?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove the document and all generated study materials.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={() => void handleDelete()}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}