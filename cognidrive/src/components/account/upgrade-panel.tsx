"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CreditCard, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UpgradePanelProps {
  plan: string;
  planLabel?: string;
  earlyAccess?: boolean;
  launchEndsLabel?: string | null;
  chatCount: number;
  chatLimit: number;
  studioCount: number;
  studioLimit: number;
}

export function UpgradePanel({
  plan,
  planLabel,
  earlyAccess = false,
  launchEndsLabel,
  chatCount,
  chatLimit,
  studioCount,
  studioLimit,
}: UpgradePanelProps) {
  const [isLoading, setIsLoading] = useState(false);

  const displayLabel =
    planLabel ?? (plan === "pro" ? "Student Pro" : "Free plan");

  const startCheckout = async (interval: "month" | "year") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openPortal = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Could not open billing",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-4 mb-3 rounded-lg border bg-muted/40 p-3 space-y-2 shrink-0">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{displayLabel}</span>
        <span className="text-muted-foreground">
          Chat {chatCount}/{chatLimit} · Studio {studioCount}/{studioLimit}
        </span>
      </div>

      {earlyAccess ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Gift className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>
              All Student Pro features free
              {launchEndsLabel ? ` until ${launchEndsLabel}` : " during launch"}.
              No card required.
            </span>
          </p>
        </div>
      ) : plan === "free" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Upgrade for 2 GB storage, 200 chats, and 30 studio runs —{" "}
            <strong>$1.99/mo</strong>
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={isLoading}
              onClick={() => startCheckout("month")}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              $1.99/mo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={isLoading}
              onClick={() => startCheckout("year")}
            >
              $19.99/yr
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={isLoading}
          onClick={openPortal}
        >
          <CreditCard className="h-3 w-3 mr-2" />
          Manage subscription
        </Button>
      )}
    </div>
  );
}
