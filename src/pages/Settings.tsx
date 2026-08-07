import { Bell, Shield } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function Settings() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-foreground/70">
          Customize your study experience.
        </p>
      </div>

      {/* Notifications */}
      <Card padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Notifications
          </h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Quiz completion reminders", enabled: true },
            { label: "Daily study streak", enabled: true },
            { label: "New feature announcements", enabled: false },
          ].map((setting) => (
            <div
              key={setting.label}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm text-foreground">{setting.label}</span>
              <button
                className={`w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  setting.enabled ? "bg-accent" : "bg-border"
                }`}
                role="switch"
                aria-checked={setting.enabled}
                aria-label={setting.label}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-background shadow transition-transform duration-200 ${
                    setting.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Privacy */}
      <Card padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Privacy
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">
              Share anonymized usage data
            </span>
            <button
              className="w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer bg-border"
              role="switch"
              aria-checked={false}
              aria-label="Share anonymized usage data"
            >
              <div className="w-4 h-4 rounded-full bg-background shadow transition-transform duration-200 translate-x-1" />
            </button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card padding="lg">
        <h2 className="font-heading text-lg font-semibold text-destructive mb-4">
          Danger Zone
        </h2>
        <p className="text-sm text-foreground/70 mb-4">
          These actions are permanent and cannot be undone.
        </p>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/5" disabled>
          Delete All My Data
        </Button>
      </Card>
    </div>
  );
}
