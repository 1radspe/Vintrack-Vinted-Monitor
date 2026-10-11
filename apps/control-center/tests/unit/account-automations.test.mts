import test from "node:test";
import assert from "node:assert/strict";
import {
    automationValidationError,
    DEFAULT_AUTOMATION_SETTINGS,
    parsePriceLimit,
    renderAutomationMessage,
} from "../../src/lib/account-automations.ts";

test("listing limits use exact cents and reject ambiguous formats", () => {
    assert.equal(parsePriceLimit("19,99"), 1999);
    assert.equal(parsePriceLimit("0.01"), 1);
    assert.equal(parsePriceLimit("10000"), 1000000);
    for (const price of [
        "0",
        "-1",
        "1e2",
        "1.234",
        "1,234.00",
        "10000.01",
        "NaN",
    ])
        assert.equal(parsePriceLimit(price), null);
});
test("message templates reject unknown variables and bound UTF-8 size", () => {
    assert.equal(
        automationValidationError("message", DEFAULT_AUTOMATION_SETTINGS),
        null,
    );
    for (const template of ["", "{secret}", "{title", "hi}", "ü".repeat(501)])
        assert.notEqual(
            automationValidationError("message", {
                ...DEFAULT_AUTOMATION_SETTINGS,
                messageTemplate: template,
            }),
            null,
        );
    assert.equal(
        renderAutomationMessage("Hi {seller}: {title}", {
            seller: "user",
            title: "Item {seller}",
        }),
        "Hi user: Item {seller}",
    );
});
test("offer validation refuses invalid discounts and price bounds", () => {
    for (const discountPercent of [0, 51, 1.5, Number.NaN])
        assert.notEqual(
            automationValidationError("offer", {
                ...DEFAULT_AUTOMATION_SETTINGS,
                discountPercent,
            }),
            null,
        );
    for (const maxPriceMinor of [0, 1000001, 1.5])
        assert.notEqual(
            automationValidationError("offer", {
                ...DEFAULT_AUTOMATION_SETTINGS,
                maxPriceMinor,
            }),
            null,
        );
});
