export type AutomationKind = "offer" | "message";
export type AutomationSettings = {
    enabled: boolean;
    discountPercent: number;
    maxPriceMinor: number;
    messageTemplate: string;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
    enabled: false,
    discountPercent: 10,
    maxPriceMinor: 10000,
    messageTemplate: "Hi! Is {title} still available?",
};

export const MESSAGE_PLACEHOLDERS = [
    "title",
    "price",
    "currency",
    "seller",
    "url",
    "monitor",
] as const;

export function automationValidationError(
    kind: AutomationKind,
    value: AutomationSettings,
): string | null {
    if (!value || typeof value.enabled !== "boolean")
        return "Invalid module setting.";
    if (kind === "offer") {
        if (
            !Number.isInteger(value.discountPercent) ||
            value.discountPercent < 1 ||
            value.discountPercent > 50
        )
            return "Choose a discount between 1% and 50%.";
        if (
            !Number.isInteger(value.maxPriceMinor) ||
            value.maxPriceMinor < 1 ||
            value.maxPriceMinor > 1000000
        )
            return "Set a listing price limit between 0.01 and 10,000.";
    } else {
        if (
            typeof value.messageTemplate !== "string" ||
            !value.messageTemplate.trim() ||
            new TextEncoder().encode(value.messageTemplate).length > 1000
        )
            return "Enter a message template and keep it short.";
        const unsupported = [
            ...value.messageTemplate.matchAll(/\{([^{}]*)\}/g),
        ].some(
            (match) => !MESSAGE_PLACEHOLDERS.some((name) => name === match[1]),
        );
        if (
            unsupported ||
            /[{}]/.test(value.messageTemplate.replace(/\{([^{}]*)\}/g, ""))
        )
            return "Use only the supported message placeholders.";
    }
    return null;
}

export function renderAutomationMessage(
    template: string,
    values: Record<string, string>,
) {
    return template.replace(
        /\{([^{}]*)\}/g,
        (_, key: string) => values[key] ?? "",
    );
}

export function parsePriceLimit(value: string): number | null {
    const normalized = value.trim().replace(",", ".");
    if (!/^\d{1,5}(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, fraction = ""] = normalized.split(".");
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return minor > 0 && minor <= 1000000 ? minor : null;
}
