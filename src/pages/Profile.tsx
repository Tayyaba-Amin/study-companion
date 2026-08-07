import { User, Mail, Calendar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-foreground/70">
          Manage your account information.
        </p>
      </div>

      <Card padding="lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {user.email?.split("@")[0]}
            </h2>
            <p className="text-sm text-foreground/70">Student</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <Mail className="w-5 h-5 text-foreground/50 shrink-0" />
            <div>
              <p className="text-xs text-foreground/50">Email</p>
              <p className="text-sm font-medium text-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <Calendar className="w-5 h-5 text-foreground/50 shrink-0" />
            <div>
              <p className="text-xs text-foreground/50">Member since</p>
              <p className="text-sm font-medium text-foreground">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
          Account Actions
        </h2>
        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-start" disabled>
            Change Password
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/5" disabled>
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
