import { expect, test, it, describe } from "vitest";
import { isOnCooldown } from "../include/cooldown.js";

describe("Cooldown", () => {
    const commandName = "test";
    const userId = "123456789";

    test("Not on cooldown at first call", () => {
        let timeLeft = isOnCooldown(commandName, userId, 1000);
        expect(timeLeft).toBe(0);
    });

    test("On cooldown after first call", () => {
        let timeLeft = isOnCooldown(commandName, userId, 1000);
        expect(timeLeft).toBeGreaterThan(0);
    });

    test("Not on cooldown after cooldown period", () => {
        setTimeout(() => {
            let timeLeft = isOnCooldown(commandName, userId, 1000);
            expect(timeLeft).toBe(0);
        }, 1100);
    });
});