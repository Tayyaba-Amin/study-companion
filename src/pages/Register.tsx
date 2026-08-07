import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

export function Register() {
  const { register, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card padding="lg" className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            You're signed in
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Head to your dashboard to get started.
          </p>
          <Link to="/dashboard" className="inline-block mt-6">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const result = await register(email, password);
    setSubmitting(false);

    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("needsConfirmation" in result && result.needsConfirmation) {
      setConfirmationSent(true);
    } else {
      // User was auto-confirmed and logged in — AuthProvider will pick up the session
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card padding="lg" className="w-full max-w-md">
        {confirmationSent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click the link in your inbox to activate your account and sign in.
            </p>
            <div className="mt-6 p-3 rounded-lg bg-foreground/5">
              <p className="text-xs text-foreground/60">
                Didn't get the email? Check your spam folder or{" "}
                <button
                  onClick={() => setConfirmationSent(false)}
                  className="text-primary underline cursor-pointer"
                >
                  try again
                </button>
                .
              </p>
            </div>
            <Link to="/login" className="inline-block mt-4">
              <Button variant="secondary">Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-foreground/70">
                Start your AI-powered study journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />

              {error && (
                <p
                  className="text-sm text-destructive bg-destructive/5 px-3 py-2 rounded-lg"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-foreground/70">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
