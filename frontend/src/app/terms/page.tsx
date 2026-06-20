export const metadata = { title: 'Terms of Use — SafeSpace' };

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto py-10 prose-sm">
      <h1 className="text-2xl font-bold mb-1">Terms of Use</h1>
      <p className="text-sm text-slate-500 mb-6">
        Plain-language terms for this prototype. By using SafeSpace you agree to the points below.
      </p>

      <Section title="Eligibility">
        <p>
          You must be at least 13 years old to create an account. We rely on a self-declared age at signup
          and reject signups under 13.
        </p>
      </Section>

      <Section title="Acceptable use">
        <ul>
          <li>Be respectful in communities, chat rooms, and direct messages.</li>
          <li>Don&apos;t post content that harasses, threatens, or targets another person.</li>
          <li>Don&apos;t attempt to circumvent the moderation system or impersonate another user.</li>
        </ul>
      </Section>

      <Section title="Moderation">
        <p>
          Every post and message is automatically screened for toxicity before it&apos;s visible to others.
          Content that&apos;s flagged — automatically or by a user report — is queued for review by a
          moderator, who can approve it, remove it, warn the author, or suspend the account. All moderator
          actions are logged in an audit trail.
        </p>
      </Section>

      <Section title="Account suspension">
        <p>
          Accounts that violate these terms may be suspended by a moderator or admin. A suspension takes
          effect immediately, including on any session that&apos;s already logged in.
        </p>
      </Section>

      <Section title="Prototype status">
        <p>
          SafeSpace is a portfolio prototype, not a production service. There is no uptime guarantee, and
          all data on this deployment is synthetic test data. See the{' '}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>{' '}
          for details on what we collect and how to delete your account.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="text-sm text-slate-700 space-y-2">{children}</div>
    </section>
  );
}
