import { useCallback, useEffect, useState } from "react";

type SoundConfig = {
    id: string;
    name: string;
    default: boolean;
    key_define_type: "multi" | string;
    includes_numpad: boolean;
    sound: string;
    defines: Record<string, string | null>;
    tags: string[];
};

export function useTypingSound() {
    const [config, setConfig] = useState<SoundConfig | null>(null);

    useEffect(() => {
        let ignore = false;

        async function loadConfig() {
            try {
                const res = await fetch("/sound/config.json");
                if (!res.ok) throw new Error("Failed to load sound config");
                const json = (await res.json()) as SoundConfig;
                if (!ignore) setConfig(json);
            } catch (err) {
                console.error("Failed to load typing sound config:", err);
            }
        }

        loadConfig();

        return () => {
            ignore = true;
        };
    }, []);

    /**
     * เล่นเสียงตาม keyCode (แบบ Monkeytype)
     */
    const playByKeyCode = useCallback(
        (keyCode: number | undefined | null) => {
            if (!config || keyCode == null) return;

            const file = config.defines[String(keyCode)];
            if (!file) return; // ไม่มีแมพเสียงสำหรับปุ่มนี้

            const audio = new Audio(`/sound/${file}`);
            audio.volume = 0.5; // ปรับความดังได้
            audio.play().catch((err) => {
                // บางที browser block ถ้ายังไม่ได้ interaction
                // แต่ในกรณีนี้เรากดแป้นพิมพ์แล้วก็ควรโอเค
                console.error("play audio error", err);
            });
        },
        [config]
    );

    return { playByKeyCode };
}
