import type { ThemeClasses } from "@/lib/types";

export function MenuView({ themeClasses, onSelectSentence, onSelectTimedWords, onSelectWords }: {
    themeClasses: ThemeClasses; onSelectSentence: () => void;
    onSelectTimedWords: () => void; onSelectWords: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-1">Welcome</h2>
            <p className={`text-sm mb-4 max-w-md ${themeClasses.textMuted}`}>
                Test your typing speed. Results are saved locally — sign in to sync to the cloud.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={onSelectSentence}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${themeClasses.buttonPrimary}`}>
                    📝 Sentence mode
                </button>
                <button onClick={onSelectTimedWords}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${themeClasses.buttonSecondary}`}>
                    ⏱ Words mode (timed)
                </button>
                <button onClick={onSelectWords}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${themeClasses.buttonSecondary}`}>
                    🔢 Words mode (count)
                </button>
            </div>
        </div>
    );
}
