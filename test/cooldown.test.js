import { expect, test } from "vitest";
import { isOnCooldown } from "../include/cooldown.js";

test("Cooldown", () => {
    const commandName = "test";
    const userId = "123456789";

    // First call should not be on cooldown
    let timeLeft = isOnCooldown(commandName, userId, 1000);
    expect(timeLeft).toBe(0);

    // Immediately calling again should be on cooldown
    timeLeft = isOnCooldown(commandName, userId, 1000);
    expect(timeLeft).toBeGreaterThan(0);

    // Wait for cooldown to expire
    setTimeout(() => {
        timeLeft = isOnCooldown(commandName, userId, 1000);
        expect(timeLeft).toBe(0);
    }, 1100);
});