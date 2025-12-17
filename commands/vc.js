// TODO: Add subcommand to change visibilty, remove user from VC

const { SlashCommandBuilder, MessageFlags, PermissionsBitField, ChannelType, SlashCommandSubcommandBuilder } = require("discord.js");

async function execute(interaction, options) {
    const { voiceChannels } = options;
    let visibility, targetUser, selectedChannel;

    switch (interaction.options.getSubcommand()) {
        case "new":
            visibility = interaction.options.getBoolean("visible") ?? true;
            await interaction.deferReply({ flags: visibility ? MessageFlags.Ephemeral : undefined });

            targetUser = interaction.options.getUser("user");
            if (!category) return interaction.editReply("Could not find Voice Channels category!");
            const channel = await interaction.guild.channels.create({
                name: `${interaction.user.username}'s VC`,
                type: ChannelType.GuildVoice,
                parent: undefined, // VC category ID missing
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [visibility ? PermissionsBitField.Flags.ViewChannel : PermissionsBitField.Flags.Connect],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels],
                    },
                    {
                        id: targetUser.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
                    }
                ]
            });
            await interaction.editReply(`Private voice channel created!${visibility ? " (Hidden from channel list)" : ""}`);
            const interval = setInterval(() => {
                if (channel?.members.size === 0) {
                    clearInterval(interval);
                    channel.delete();
                    voiceChannels = voiceChannels.filter(ch => ch.id !== channel.id);
                }
            }, 5 * 60 * 1000);
            voiceChannels.push({
                id: channel.id,
                users: [interaction.user, targetUser],
                visibility,
                interval
            });
            break;
    
        case "add":
            targetUser = interaction.options.getUser("user");
            selectedChannel = interaction.options.getChannel("vc");
            if (selectedChannel.type !== ChannelType.GuildVoice) return await interaction.reply({ content: "Wrong type of channel, please specify a VC", flags: MessageFlags.Ephemeral });

            selectedChannel.permissionOverwrites.create(targetUser, {
                Connect: true,
                ViewChannel: true
            });
            visibility = voiceChannels.find(channel => channel.id == selectedChannel.id).visibility;
            await interaction.reply({ content: `Allowed ${targetUser} to the VC`, flags: visibility ? MessageFlags.Ephemeral : undefined })
            break;

        case "remove":
            targetUser = interaction.options.getUser("user");    
            selectedChannel = interaction.options.getChannel("vc");
            if (selectedChannel.type !== ChannelType.GuildVoice) return await interaction.reply({ content: "Wrong type of channel, please specify a VC", flags: MessageFlags.Ephemeral });

            visibility = voiceChannels.find(channel => channel.id == selectedChannel.id).visibility;
            await interaction.reply({ content: `Disallowed ${targetUser} to the VC`, flags: visibility ? MessageFlags.Ephemeral : undefined })
            break;
    }
}

module.exports = {
    cooldown: 1000,
    data: new SlashCommandBuilder()
        .setName("vc")
        .setDescription("Create/edit private VC")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("new")
            .setDescription("Create a new private VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that are allow to join the private VC")
                .setRequired(true)
            )
            .addBooleanOption(option => option
                .setName("visible")
                .setDescription("Show the VC in channel list with locked icon")
                .setRequired(false)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("add")
            .setDescription("Allow another user to the VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that are allow to join the private VC")
                .setRequired(true)
            )
            .addChannelOption(option => option
                .setName("vc")
                .setDescription("Voice channel to modify")
                .setRequired(true)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("remove")
            .setDescription("Remove previously allowed user from VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that aren't allow to join the private VC")
                .setRequired(true)
            )
            .addChannelOption(option => option
                .setName("vc")
                .setDescription("Voice channel to modify")
                .setRequired(true)
            )
        ),
    execute
};