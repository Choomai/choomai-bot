import { SlashCommandBuilder, CommandInteraction } from "discord.js";

/**
 * @param {CommandInteraction} interaction 
 * @returns {Promise<void>}
 */
export async function execute(interaction) {
    await interaction.reply("Pong!");
}

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("A test command, will return \"Pong!\"")