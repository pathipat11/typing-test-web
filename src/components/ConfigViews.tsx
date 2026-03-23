"use client";

import { useState } from "react";
import type { ThemeClasses } from "@/lib/types";
import { SENTENCE_DURATIONS, WORD_COUNTS } from "@/lib/types";

export function SentenceConfigView({ themeClasses, onBack, onStart }: {
    themeClasses: ThemeClasses; onBack: () => void; onStart: (duration: number) => void;
}) {
    const [selected, setSelected] = useState<number>(30);
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">⏱ Words mode (timed)</h2>
                <button onClick={onBack} className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}>← Back</button>
            </div>
            <p className={`text-sm ${themeClasses.textMuted}`}>
                Type random words until the timer runs out.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
                {SENTENCE_DURATIONS.map((sec) => (
                    <button key={sec} type="button" onClick={() => setSelected(sec)}
                        className={`px-4 py-2 rounded-full text-sm border ${themeClasses.border} transition-all ${selected === sec ? "bg-emerald-500 text-white border-transparent scale-105" : "hover:bg-neutral-700/40"
                            }`}>
                        {sec}s
                    </button>
                ))}
            </div>
            <button onClick={() => onStart(selected)}
                className={`mt-4 px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}>
                Start test →
            </button>
        </div>
    );
}

export function WordsConfigView({ themeClasses, onBack, onStart }: {
    themeClasses: ThemeClasses; onBack: () => void; onStart: (wordCount: number) => void;
}) {
    const [selected, setSelected] = useState<number>(25);
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">🔢 Words mode</h2>
                <button onClick={onBack} className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}>← Back</button>
            </div>
            <p className={`text-sm ${themeClasses.textMuted}`}>
                Type a fixed number of random words. Test ends when you finish all characters.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
                {WORD_COUNTS.map((cnt) => (
                    <button key={cnt} type="button" onClick={() => setSelected(cnt)}
                        className={`px-4 py-2 rounded-full text-sm border ${themeClasses.border} transition-all ${selected === cnt ? "bg-amber-400 text-neutral-900 border-transparent scale-105" : "hover:bg-neutral-700/40"
                            }`}>
                        {cnt} words
                    </button>
                ))}
            </div>
            <button onClick={() => onStart(selected)}
                className={`mt-4 px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}>
                Start test →
            </button>
        </div>
    );
}
