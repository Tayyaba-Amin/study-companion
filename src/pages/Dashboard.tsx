import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  Layers,
  Upload,
  BookOpen,
  Sparkles,
  Loader2,
  Brain,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { invokeEdgeFunction } from "../lib/api";
import { listDocuments } from "../lib/documents";
import type { DashboardStats, Document, Activity } from "../types";

const activityConfig: Record<
  Activity["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  document_upload: {
    icon: FileText,
    color: "text-primary",
    label: "Uploaded document",
  },
  quiz_completed: {
    icon: Brain,
    color: "text-accent",
    label: "Completed quiz",
  },
  flashcards_reviewed: {
    icon: Layers,
    color: "text-secondary",
    label: "Reviewed flashcards",
  },
  summary_generated: {
    icon: Sparkles,
    color: "text-accent",
    label: "Generated summary",
  },
  chat: {
    icon: MessageSquare,
    color: "text-primary",
    label: "Chatted with AI",
  },
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingStats(true);
    setLoadingDocs(true);
    setError(null);
    try {
      const [statResult, docs] = await Promise.all([
        invokeEdgeFunction<DashboardStats>("dashboard-stats", {}),
        listDocuments(),
      ]);
      setStats(statResult);
      setRecentDocs(docs.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load dashboard data.");
    } finally {
      setLoadingStats(false);
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Combine stats values with live or fallback
  const totalDocuments = stats?.total_documents ?? recentDocs.length;
  const totalQuizzes = stats?.total_quizzes_completed ?? 0;
  const totalFlashcards = stats?.total_flashcards_reviewed ?? 0;
  const recentActivity = stats?.recent_activity ?? [];

  const statCards = [
    {
      label: "Documents",
      value: String(totalDocuments),
      icon: FileText,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Quizzes Completed",
      value: String(totalQuizzes),
      icon: CheckCircle2,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Flashcards Reviewed",
      value: String(totalFlashcards),
      icon: Layers,
      color: "bg-secondary/10 text-secondary",
    },
  ];

  const quickActions = [
    {
      label: "Upload Document",
      href: "/documents",
      icon: Upload,
      description: "Upload a PDF to get started",
    },
    {
      label: "Study Workspace",
      href: "/workspace",
      icon: BookOpen,
      description: "Review summaries and quizzes",
    },
    {
      label: "View Documents",
      href: "/documents",
      icon: FileText,
      description: "Browse all your study materials",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-foreground/70">
          Here&apos;s an overview of your study progress.
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label} padding="lg">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}
              >
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                {loadingStats ? (
                  <Loader2 className="w-5 h-5 animate-spin text-foreground/30" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                )}
                <p className="text-sm text-foreground/70">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.href}>
              <Card hover padding="lg" className="h-full cursor-pointer">
                <div className="flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {action.label}
                    </h3>
                    <p className="text-sm text-foreground/70 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Documents & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Recent Documents
            </h2>
            <Link to="/documents">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-8 text-foreground/50">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading documents…
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-foreground/30" />
              </div>
              <p className="text-foreground/70 font-medium">No documents yet</p>
              <p className="text-sm text-foreground/50 mt-1">
                Upload your first PDF to get started with AI-powered study
                tools.
              </p>
              <Link to="/documents" className="mt-4 inline-block">
                <Button size="sm">
                  <Upload className="w-4 h-4" />
                  Upload a Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/workspace/${d.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {d.title}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      d.status === "ready"
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-foreground/50"
                    }`}
                  >
                    {d.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card padding="lg">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            Recent Activity
          </h2>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8 text-foreground/50">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading activity…
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-foreground/30" />
              </div>
              <p className="text-foreground/70 font-medium">
                No recent activity
              </p>
              <p className="text-sm text-foreground/50 mt-1">
                Your study activity will appear here as you use the app.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((a, i) => {
                const cfg = activityConfig[a.type] ?? activityConfig.document_upload;
                return (
                  <div
                    key={a.id ?? i}
                    className="flex items-start gap-3 px-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{a.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-foreground/40" />
                        <span className="text-xs text-foreground/50">
                          {new Date(a.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}