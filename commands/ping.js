const { SlashCommandBuilder } = require("discord.js");

async function execute(interaction) {
    await interaction.reply("Pong!");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("A test command, will return \"Pong!\""),
    execute
}