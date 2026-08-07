import { Link } from "react-router-dom";
import { BookOpen, FileText, Brain, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const features = [
  {
    icon: FileText,
    title: "Upload Notes",
    description: "Upload your lecture PDFs and let AI extract and organize the content.",
  },
  {
    icon: Brain,
    title: "Smart Summaries",
    description: "Get concise, AI-powered summaries of your study materials in seconds.",
  },
  {
    icon: BookOpen,
    title: "Quizzes & Flashcards",
    description: "Test your knowledge with auto-generated quizzes and flashcards.",
  },
  {
    icon: MessageSquare,
    title: "Ask Questions",
    description: "Chat with your documents — ask questions and get answers from your notes.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 lg:px-6 h-16 border-b border-border bg-background">
        <span className="font-heading text-xl font-semibold text-primary">
          Study Companion
        </span>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 lg:py-24 text-center">
        <h1 className="font-heading text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Turn Your Lecture Notes Into
          <br />
          <span className="text-primary">Interactive Study Materials</span>
        </h1>
        <p className="mt-6 text-lg text-foreground/70 max-w-2xl mx-auto">
          Upload your PDFs, get AI-powered summaries, quizzes, and flashcards.
          Chat with your documents and master any subject faster.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg">
              Start Studying Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-center text-foreground">
          Everything you need to study smarter
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.title} hover padding="lg">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/70 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-12 lg:py-16 text-center">
        <Card padding="lg">
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            Ready to transform your study sessions?
          </h2>
          <p className="mt-2 text-foreground/70">
            Join students who are learning faster with AI-powered study tools.
          </p>
          <div className="mt-6">
            <Link to="/register">
              <Button size="lg">
                Create Your Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 text-center text-sm text-foreground/50">
        &copy; {new Date().getFullYear()} Study Companion. All rights reserved.
      </footer>
    </div>
  );
}
