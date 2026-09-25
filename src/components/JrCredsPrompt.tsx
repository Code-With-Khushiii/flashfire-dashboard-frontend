import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ExternalLink, Copy, Check, X, Info } from 'lucide-react';

/**
 * "JobRight login not set" prompt. OPERATORS ONLY.
 *
 * A client the operator has just opened has no JobRight credentials saved, so
 * the autopilot cannot work them unattended. Rather than leaving that to be
 * noticed days later in a run report, say it the moment the client is opened
 * and hand over the two things needed to fix it.
 *
 * WHY THIS CANNOT LEAK TO A CLIENT
 * The operator session lives in a zustand store persisted to localStorage, so
 * `role === "operations"` is a value the person at the keyboard can set in
 * their own devtools. This component therefore renders NOTHING from local
 * state. Every field it shows - including the password - arrives in the
 * response from /operations/jr-creds-status, which re-verifies the operator
 * against the Operations collection and checks they actually manage this
 * client. A client who forges the role gets a 403, `data` stays null, and the
 * component returns null. The role check below is only an optimisation that
 * saves a pointless request; it is not the control.
 */

type Status = {
  needsSetup: boolean;
  clientEmail: string;
  hasEmail: boolean;
  hasPassword: boolean;
  jobrightUrl?: string;
  suggestedEmail?: string;
  suggestedPassword?: string;
};

interface Props {
  /** The operator's own address, from the operations store. */
  operatorEmail: string;
  /** The client currently open in the dashboard. */
  clientEmail: string;
  /** Role from the operations store — a pre-filter, never the security gate. */
  role: string;
}

// No dismissal is remembered on purpose. Operators asked for this to reappear
// every time a client's profile is opened: a prompt that is dismissed once and
// then stays quiet is a prompt that gets clicked away on a busy morning and
// never thought about again, while the client silently goes unscraped. Closing
// it hides it for THIS viewing only - navigate away and back, or reload, and
// it returns until the account actually exists.

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard is blocked outside a secure context or without permission.
      // The value is on screen either way, so this must not look like a crash.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function JrCredsPrompt({ operatorEmail, clientEmail, role }: Props) {
  const [data, setData] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isOperator = role === 'operations' || role === 'operator' || role === 'admin';
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const check = useCallback(async () => {
    if (!isOperator || !operatorEmail || !clientEmail) return;
    try {
      const res = await fetch(`${API_BASE}/operations/jr-creds-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorEmail, clientEmail }),
      });
      // 403 is the expected answer for anyone who is not this client's
      // operator. Stay silent: there is nothing to show and nothing is wrong.
      if (!res.ok) return;
      const body = await res.json();
      if (body?.success && body.needsSetup === true) setData(body as Status);
    } catch {
      // Never let a failed check interrupt the operator's work.
    }
  }, [API_BASE, isOperator, operatorEmail, clientEmail]);

  useEffect(() => {
    setData(null);
    setDismissed(false);
    check();
  }, [check, clientEmail]);

  if (!data || dismissed) return null;

  const close = () => setDismissed(true);

  const missing = !data.hasEmail && !data.hasPassword
    ? "Client JobRight profile is not created. Please create it."
    : !data.hasEmail
      ? 'This client has a JobRight password saved, but no account email.'
      : 'This client has a JobRight account email saved, but no password.';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jr-creds-title"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Accent bar — the dashboard's orange/red gradient. */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-orange-100 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 id="jr-creds-title" className="text-lg font-semibold text-gray-900 leading-tight">
                JobRight account not created
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{data.clientEmail}</p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Dismiss"
            className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">{missing}</p>

          <div className="space-y-3.5">
            <CopyField label="Account email" value={data.suggestedEmail || data.clientEmail} />
            <CopyField label="Password" value={data.suggestedPassword || ''} />
          </div>

          {/* Deliberately neutral. The accent bar and the primary button are
              already orange; a third warm block made the card read as an
              alert rather than an instruction, and buried the CTA. */}
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Create the account on JobRight with exactly these details, then set
              this client's JobRight toggle to <span className="font-semibold text-slate-900">Yes</span> in
              Client Tracking. That saves the credentials automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={close}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            I'll do it later
          </button>
          <a
            href={data.jobrightUrl || 'https://jobright.ai/login'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-sm hover:shadow transition-all"
          >
            Open JobRight
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
