import type { ThemeClasses } from "@/lib/types";

export function StatCard({ themeClasses, label, value }: {
    themeClasses: ThemeClasses; label: string; value: string;
}) {
    return (
        <div className={`rounded-xl border ${themeClasses.border} px-3 py-3`}>
            <div className={`text-[11px] uppercase tracking-wide ${themeClasses.textMuted}`}>{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
}
