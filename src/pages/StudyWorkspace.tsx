import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Sparkles,
  Clock,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Tabs, TabPanel } from "../components/workspace/Tabs";
import { SummaryTab } from "../components/workspace/SummaryTab";
import { QuizTab } from "../components/workspace/QuizTab";
import { FlashcardsTab } from "../components/workspace/FlashcardsTab";
import { ChatTab } from "../components/workspace/ChatTab";
import { getDocument, listDocuments } from "../lib/documents";
import type { Document } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ready: "bg-accent/10 text-accent",
    processing: "bg-secondary/10 text-secondary",
    uploading: "bg-muted text-foreground/50",
    error: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || "bg-muted text-foreground/50"}`}
    >
      {status}
    </span>
  );
}

export function StudyWorkspace() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(documentId ? true : false);
  const [loadingDocs, setLoadingDocs] = useState(!documentId);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Load a single document when one is selected
  const loadDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDocument(id);
      setDoc(d);
      if (!d) setError("We couldn't find that document. It may have been deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the document.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the document list for the picker view
  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    setError(null);
    try {
      setDocs(await listDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your documents.");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (documentId && UUID_RE.test(documentId)) {
      void loadDocument(documentId);
    } else if (documentId) {
      setError("That document link doesn't look valid.");
      setLoading(false);
      setDoc(null);
    } else {
      void loadDocs();
    }
  }, [documentId, loadDocument, loadDocs]);

  // Poll while the document is processing so it flips to "ready" automatically
  useEffect(() => {
    if (!doc || (doc.status !== "uploading" && doc.status !== "processing")) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await getDocument(doc.id);
        setDoc(fresh);
      } catch {
        // ignore transient failures; next poll will retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [doc]);

  // ----- Picker view (no document selected) -----
  if (!documentId) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
            Study Workspace
          </h1>
          <p className="mt-1 text-foreground/70">
            Pick a document to generate summaries, quizzes, flashcards, and chat
            with your notes.
          </p>
        </div>

        {error && (
          <div
            className="bg-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {loadingDocs ? (
          <Card padding="lg">
            <div className="flex items-center justify-center py-12 text-foreground/50">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading documents…
            </div>
          </Card>
        ) : docs.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-foreground/30" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                No documents yet
              </h2>
              <p className="mt-2 text-foreground/70 max-w-md mx-auto">
                Upload a PDF first — then come back here to study it with
                AI-powered tools.
              </p>
              <div className="mt-6">
                <Link to="/documents">
                  <Button>
                    <FileText className="w-4 h-4" />
                    Go to My Documents
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground/50">
              Choose a document
            </h2>
            {docs.map((d) => (
              <Card key={d.id} hover padding="md">
                <button
                  onClick={() => navigate(`/workspace/${d.id}`)}
                  className="w-full flex items-center gap-4 text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{d.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-foreground/40" />
                      <span className="text-xs text-foreground/50">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                      {statusBadge(d.status)}
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-foreground/30 shrink-0" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ----- Loading / error for a selected document -----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="flex items-center justify-center py-16 text-foreground/50">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading document…
          </div>
        </Card>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Couldn&apos;t open that document
            </h2>
            <p className="mt-2 text-foreground/70 text-sm">{error}</p>
            <div className="mt-6">
              <Link to="/documents">
                <Button>
                  <ArrowLeft className="w-4 h-4" />
                  Back to My Documents
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ----- Document loaded: workspace with tabs -----
  const processing = doc.status === "uploading" || doc.status === "processing";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          My Documents
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl lg:text-2xl font-bold text-foreground truncate">
                {doc.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-foreground/50">
                  Uploaded {new Date(doc.created_at).toLocaleDateString()}
                </span>
                {statusBadge(doc.status)}
              </div>
            </div>
          </div>
        </div>

        {processing && (
          <div className="flex items-center gap-3 bg-secondary/10 border border-secondary/20 text-secondary px-4 py-3 rounded-xl text-sm">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              We&apos;re extracting the text from your document. This usually
              takes a few seconds — the study tools will unlock automatically
              when it&apos;s ready.
            </span>
          </div>
        )}
        {doc.status === "error" && (
          <div
            className="bg-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
            role="alert"
          >
            We couldn&apos;t read this document. Try deleting it and uploading
            it again.
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        items={[
          { id: "summary", label: "Summary", icon: Sparkles },
          { id: "quiz", label: "Quiz", icon: Brain },
          { id: "flashcards", label: "Flashcards", icon: Layers },
          { id: "chat", label: "Chat", icon: MessageSquare },
        ]}
      />

      <TabPanel id="summary" active={activeTab}>
        <SummaryTab doc={doc} />
      </TabPanel>
      <TabPanel id="quiz" active={activeTab}>
        <QuizTab doc={doc} />
      </TabPanel>
      <TabPanel id="flashcards" active={activeTab}>
        <FlashcardsTab doc={doc} />
      </TabPanel>
      <TabPanel id="chat" active={activeTab}>
        <ChatTab doc={doc} />
      </TabPanel>
    </div>
  );
}