export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: March 2026</p>

      <h2>What we collect</h2>
      <p>
        When you use CogniDrive, we collect your email address, uploaded documents, and usage data
        (such as chat and studio tool usage) to provide the service and enforce plan limits.
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>Store and process your documents for AI chat and studio features</li>
        <li>Send document text to third-party AI providers (OpenRouter, OpenAI, etc.) to generate responses</li>
        <li>Process payments through Stripe</li>
        <li>Improve reliability and prevent abuse</li>
      </ul>

      <h2>Third-party services</h2>
      <p>
        We use Supabase (hosting & database), Vercel (application hosting), OpenRouter (AI models),
        and Stripe (payments). Each provider has its own privacy policy.
      </p>

      <h2>Data retention</h2>
      <p>
        You can delete your uploaded files at any time. Account data is retained until you delete
        your account or request removal.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, contact the CogniDrive team through your project support email.
      </p>

      <p><a href="/">Back to home</a></p>
    </main>
  );
}
