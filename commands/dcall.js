const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, MessageFlags } = require("discord.js");

/**
 * @param {CommandInteraction} interaction
 */
async function execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.MoveMembers))
        return await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });

    const user = await interaction.guild.members.fetch(process.env.CHOOMAI);
    const channel = user.voice.channel;
    if (!channel) return await interaction.reply({ content: "The bot owner (or the specified user) is not in a voice channel.", flags: MessageFlags.Ephemeral});

    interaction.reply(`Starting to disconnect everyone from ${channel}.`);
    for (let member of channel.members) {
        member[1].voice.disconnect(`Disconnect everyone command issued by ${interaction.user}`);
    }
}

module.exports = {
    cooldown: 30000,
    messageCommand: true,
    data: new SlashCommandBuilder()
        .setName("dcall")
        .setDescription("Disconnect everyone from the voice channel that the bot owner is in")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user that are in the target VC. Default to the bot owner")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    execute
}