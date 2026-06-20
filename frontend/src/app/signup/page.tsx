'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ErrorBanner } from '@/components/ErrorBanner';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, username, password, age: Number(age) });
      router.push('/communities');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-sm text-slate-500 mb-6">
        13+ only. We only ask for an email, username, password, and your age — nothing else.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Username"
          id="username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          help="Letters, numbers, and underscores only."
        />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          help="At least 8 characters."
        />
        <Field
          label="Age"
          id="age"
          type="number"
          value={age}
          onChange={setAge}
          min={13}
          max={120}
          help="You must be 13 or older to use SafeSpace."
        />

        <ErrorBanner message={error} />

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  autoComplete,
  help,
  min,
  max,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  help?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        min={min}
        max={max}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-2 focus:outline-slate-900"
      />
      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
    </div>
  );
}
