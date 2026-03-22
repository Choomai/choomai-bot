const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, MessageFlags, Message } = require("discord.js");

/**
 * @param {CommandInteraction|Message} interaction
 */
async function execute(interaction) {
    let channel;
    if (interaction instanceof Message) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers))
            return await interaction.reply("You do not have permission to use this command.");

        const user = await interaction.guild.members.fetch(process.env.CHOOMAI);
        channel = user.voice.channel;
        if (!channel) return await interaction.reply("The bot owner (or the specified user) is not in a voice channel.");
    } else if (interaction instanceof CommandInteraction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.MoveMembers))
            return await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });

        const user = interaction.options.getUser("user") || await interaction.guild.members.fetch(process.env.CHOOMAI);
        channel = user.voice.channel;
        if (!channel) return await interaction.reply({ content: "The bot owner (or the specified user) is not in a voice channel.", flags: MessageFlags.Ephemeral });
    }

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