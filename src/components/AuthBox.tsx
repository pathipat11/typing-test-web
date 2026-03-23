import type { ThemeClasses } from "@/lib/types";

export function AuthBox({ themeClasses, authEmail, authPassword, authLoading, authError,
    onEmailChange, onPasswordChange, onAuth, onClose,
}: {
    themeClasses: ThemeClasses; authEmail: string; authPassword: string;
    authLoading: boolean; authError: string | null;
    onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void;
    onAuth: (mode: "signin" | "signup") => void; onClose: () => void;
}) {
    return (
        <div className={`mb-4 rounded-2xl border ${themeClasses.border} ${themeClasses.card} p-4 text-xs space-y-3 animate-fade-in`}>
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Sign in / Sign up</div>
                <button type="button" onClick={onClose} className={`px-2 py-1 rounded-full ${themeClasses.buttonGhost}`}>✕</button>
            </div>
            <div className="grid gap-2">
                <label className="flex flex-col gap-1">
                    <span className={themeClasses.textMuted}>Email</span>
                    <input type="email" value={authEmail} onChange={(e) => onEmailChange(e.target.value)}
                        className={`px-2 py-1.5 rounded-md border ${themeClasses.border} bg-transparent text-xs outline-none focus:ring-1 focus:ring-emerald-500`}
                        placeholder="you@example.com" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className={themeClasses.textMuted}>Password</span>
                    <input type="password" value={authPassword} onChange={(e) => onPasswordChange(e.target.value)}
                        className={`px-2 py-1.5 rounded-md border ${themeClasses.border} bg-transparent text-xs outline-none focus:ring-1 focus:ring-emerald-500`}
                        placeholder="••••••••" />
                </label>
                {authError && <p className="text-red-400 text-[11px]">{authError}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                    <button type="button" disabled={authLoading} onClick={() => onAuth("signin")}
                        className={`px-3 py-1 rounded-full ${themeClasses.buttonPrimary} disabled:opacity-60`}>
                        {authLoading ? "..." : "Sign in"}
                    </button>
                    <button type="button" disabled={authLoading} onClick={() => onAuth("signup")}
                        className={`px-3 py-1 rounded-full ${themeClasses.buttonSecondary} disabled:opacity-60`}>
                        {authLoading ? "..." : "Sign up"}
                    </button>
                </div>
                <p className={`text-[11px] ${themeClasses.textMuted}`}>
                    Play as guest without an account. Sign in to sync scores to the cloud.
                </p>
            </div>
        </div>
    );
}
