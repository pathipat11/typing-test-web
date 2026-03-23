import type { Mode } from "@/hooks/useScores";

export type SentenceModeConfig = { mode: "sentence" };
export type WordsModeConfig = { mode: "words"; wordCount?: number; duration?: number };
export type Config = SentenceModeConfig | WordsModeConfig;

export type View = "menu" | "config-sentence" | "config-words" | "test" | "result" | "stats";

export type WpmSnapshot = { time: number; wpm: number };

export type FinishedStats = {
    mode: Mode;
    duration?: number;
    wordCount?: number;
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
    wpmHistory: WpmSnapshot[];
};

export const SENTENCE_DURATIONS = [15, 30, 60] as const;
export const WORD_COUNTS = [25, 50, 100] as const;

/* ─── theme ─── */

export type ThemeClasses = ReturnType<typeof buildTheme>;

export function buildTheme(isDark: boolean) {
    return {
        bg: isDark ? "bg-neutral-900" : "bg-neutral-100",
        card: isDark ? "bg-neutral-800" : "bg-white",
        text: isDark ? "text-neutral-100" : "text-neutral-900",
        textMuted: isDark ? "text-neutral-400" : "text-neutral-500",
        accent: isDark ? "text-cyan-400" : "text-cyan-600",
        border: isDark ? "border-neutral-700" : "border-neutral-200",
        buttonPrimary: isDark
            ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-900"
            : "bg-emerald-500 hover:bg-emerald-400 text-white",
        buttonSecondary: isDark
            ? "bg-amber-400 hover:bg-amber-300 text-neutral-900"
            : "bg-amber-400 hover:bg-amber-300 text-neutral-900",
        buttonDanger: "bg-red-500 hover:bg-red-600 text-white",
        buttonGhost: isDark
            ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
            : "bg-neutral-200 hover:bg-neutral-300 text-neutral-900",
        correct: isDark ? "text-emerald-400" : "text-emerald-700",
        incorrect: "text-red-500",
        remaining: isDark ? "text-neutral-500" : "text-neutral-400",
    };
}

/* ─── helpers ─── */

export function countCorrectChars(typed: string, target: string): number {
    let c = 0;
    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) c++;
    }
    return c;
}
