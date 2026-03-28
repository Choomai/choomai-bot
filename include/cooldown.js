const { Collection } = require("discord.js");

const cooldowns = new Collection();

/**
 * Check if the user is in cooldown for the command, if not, set the cooldown.
 * @param {string} commandName,
 * @param {string} userId 
 * @param {number} cooldownAmount Cooldown time in milliseconds, default is 3000 (3 seconds).
 * @returns {number} Return the time left in seconds if the user is in cooldown, otherwise return 0.
 */
function isOnCooldown(commandName, userId, cooldownAmount = 3000) {
    let now = Date.now();
    if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Collection());
    let timestamps = cooldowns.get(commandName);
    if (timestamps.has(userId)) {
        let expireTime = timestamps.get(userId) + cooldownAmount;
        let timeLeft = (expireTime - now) / 1000;
        if (now < expireTime) return timeLeft;
        else timestamps.delete(userId);
    };
    timestamps.set(userId, now);
    return 0;
}

module.exports = {
    isOnCooldown
};
