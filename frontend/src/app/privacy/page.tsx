export const metadata = { title: 'Privacy Policy — SafeSpace' };

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto py-10 prose-sm">
      <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-6">
        SafeSpace is a student portfolio prototype. This policy describes how the prototype actually
        behaves today — it is not a substitute for legal advice, and no real minors are onboarded to this
        system.
      </p>

      <Section title="Who this is for">
        <p>
          SafeSpace is built for students aged 13 and up. Signup enforces a hard 13+ age gate based on a
          self-declared age — we don&apos;t collect a date of birth or any government ID.
        </p>
      </Section>

      <Section title="What we collect">
        <p>Account creation requires only:</p>
        <ul>
          <li>An email address (used only for login, never shown to other users)</li>
          <li>A username</li>
          <li>A password (stored as an argon2 hash — we never see or store your plaintext password)</li>
          <li>Your self-declared age</li>
        </ul>
        <p className="mt-2">
          We do not collect your real name, phone number, precise location, or device/behavioral tracking
          data. Posts and messages you write are stored along with a toxicity score from our moderation
          system, so reviewers can see why something was flagged.
        </p>
      </Section>

      <Section title="What we don't do">
        <ul>
          <li>No advertising and no ad-tracking, ever.</li>
          <li>We never sell or share your data with third parties.</li>
          <li>No open direct messages between strangers — messaging requires a mutually-accepted connection.</li>
        </ul>
      </Section>

      <Section title="Who can see your content">
        <p>
          Posts and chat messages are visible only to members of the community they&apos;re posted in — not
          the public internet. Direct messages are visible only to the two people in that connection.
          Moderators and admins can review flagged or reported content as part of the safety system.
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          You can permanently delete your account at any time from your{' '}
          <a href="/account" className="underline">
            account page
          </a>
          . Deleting your account immediately scrubs your email, username, and password from our database
          and signs you out everywhere. Content you posted stays attached to an anonymized &quot;deleted
          account&quot; placeholder so we don&apos;t break conversations for other members, but nothing
          about your account remains identifiable.
        </p>
      </Section>

      <Section title="Prototype disclaimer">
        <p>
          This is a portfolio project demonstrating safety-by-design engineering practices. All accounts on
          this deployment are synthetic test data created by the developer — real minors are never
          onboarded.
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
