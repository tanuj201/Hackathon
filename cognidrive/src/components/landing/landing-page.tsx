import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Brain,
  MessageSquare,
  Headphones,
  Network,
  Table2,
  Sparkles,
  Check,
  GraduationCap,
  Gift,
} from "lucide-react";
import {
  formatLaunchEndDate,
  isEarlyAccessActive,
} from "@/lib/launch-config";
import { PLANS } from "@/lib/plans";

const features = [
  {
    icon: MessageSquare,
    title: "Multi-AI Chat",
    description: "Chat with GPT-4o, DeepSeek, and Gemini about your lecture notes and papers.",
  },
  {
    icon: Headphones,
    title: "Audio Overview",
    description: "Turn any PDF into a two-host podcast summary — perfect for commutes.",
  },
  {
    icon: Network,
    title: "Mind Maps",
    description: "Visualize key concepts from textbooks and research articles instantly.",
  },
  {
    icon: Table2,
    title: "Data Tables",
    description: "Extract structured facts, dates, and figures into exportable tables.",
  },
];

export function LandingPage() {
  const earlyAccess = isEarlyAccessActive();
  const launchEndsLabel = formatLaunchEndDate();
  const proStartsLabel = launchEndsLabel ?? "after launch";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">CogniDrive</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Button asChild>
              <Link href="/login">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
            {earlyAccess ? (
              <>
                <Gift className="h-4 w-4 text-primary" />
                Launch month — Pro features free
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4 text-primary" />
                Built for students & researchers
              </>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Your documents,{" "}
            <span className="text-primary">supercharged with AI</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            {earlyAccess
              ? "Upload PDFs and notes. Chat with multiple AI models, generate podcast summaries, mind maps, and study tables — all Pro features free during launch. No card required."
              : "Upload PDFs and notes. Chat with multiple AI models, generate podcast summaries, mind maps, and study tables — like NotebookLM, for less than a coffee per month."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/login">Start free — no card required</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#pricing">See pricing</Link>
            </Button>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-center mb-10">Everything you need to study smarter</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border bg-background p-6">
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-center">Student-friendly pricing</h2>
            <p className="text-center text-muted-foreground mt-2 mb-10">
              {earlyAccess
                ? launchEndsLabel
                  ? `Pro features free until ${launchEndsLabel}. Student Pro pricing starts after that.`
                  : "Pro features free during launch. Student Pro pricing starts after launch."
                : "Less than a coffee. Cancel anytime."}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {earlyAccess && (
                <div className="rounded-xl border-2 border-primary p-6 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Now
                  </div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Launch access
                  </h3>
                  <p className="text-3xl font-bold mt-2">$0</p>
                  <p className="text-xs text-muted-foreground">
                    {launchEndsLabel ? `Free until ${launchEndsLabel}` : "Free during launch"}
                  </p>
                  <ul className="mt-6 space-y-2 text-sm">
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> 2 GB storage
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> 200 AI messages / month
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> 30 Studio runs / month
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" /> All AI models
                    </li>
                  </ul>
                  <Button className="w-full mt-6" asChild>
                    <Link href="/login">Get started free</Link>
                  </Button>
                </div>
              )}

              <div className="rounded-xl border p-6">
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {earlyAccess ? `After launch` : "Always free"}
                </p>
                <p className="text-3xl font-bold mt-2">$0</p>
                <ul className="mt-6 space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 250 MB storage
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 30 AI messages / month
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> Studio tools (limited)
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="/login">Get started</Link>
                </Button>
              </div>

              <div
                className={`rounded-xl border p-6 relative ${!earlyAccess ? "border-2 border-primary" : ""}`}
              >
                {!earlyAccess && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Student Pro
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {earlyAccess ? `Starting ${proStartsLabel}` : "Upgrade anytime"}
                </p>
                <p className="text-3xl font-bold mt-2">
                  ${PLANS.pro.priceMonthly}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">or ${PLANS.pro.priceYearly}/year</p>
                <ul className="mt-6 space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 2 GB storage
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 200 AI messages / month
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> 30 Studio runs / month
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" /> All AI models
                  </li>
                </ul>
                {earlyAccess ? (
                  <Button className="w-full mt-6" variant="outline" disabled>
                    Available {proStartsLabel}
                  </Button>
                ) : (
                  <Button className="w-full mt-6" asChild>
                    <Link href="/login">Upgrade in app</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CogniDrive</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
