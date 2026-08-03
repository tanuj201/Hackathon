export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: March 2026</p>

      <h2>Service</h2>
      <p>
        CogniDrive provides document storage, multi-model AI chat, and studio tools for students
        and researchers. Features and limits depend on your subscription plan.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for your account credentials and all activity under your account.
        You must not upload illegal content or content you do not have rights to use.
      </p>

      <h2>Subscriptions</h2>
      <p>
        Student Pro is billed at $1.99/month or $19.99/year through Stripe. Subscriptions renew
        automatically until cancelled. Refunds are handled according to Stripe and applicable law.
      </p>

      <h2>AI outputs</h2>
      <p>
        AI-generated content may be inaccurate. Do not rely on CogniDrive for medical, legal, or
        academic submissions without independent verification.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        CogniDrive is provided &quot;as is&quot; without warranties. We are not liable for damages
        arising from use of the service or third-party AI providers.
      </p>

      <p><a href="/">Back to home</a></p>
    </main>
  );
}
