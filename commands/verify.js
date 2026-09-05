import { Client, SlashCommandBuilder, CommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import crypto from "node:crypto";
import { formatTime } from "../include/time.js";
import { Redis } from "ioredis";

/**
 * @typedef {Client & { redis: Redis }} ExtendedClient
 * @param {CommandInteraction & { client: ExtendedClient }} interaction
 * @returns {Promise<void>}
 */
export async function execute(interaction) {
    if (interaction.member.roles.cache.has(process.env.SERVER_MEMBER_ID) || interaction.memberPermissions.has(PermissionFlagsBits.Administrator))
        return void interaction.reply({ content: "You are already verified.", flags: MessageFlags.Ephemeral });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const attempts = await interaction.client.redis.get(`choomai_bot:verify:${interaction.user.id}:attempts`);
    if (attempts && parseInt(attempts) >= 3) {
        const ttlLeft = await interaction.client.redis.ttl(`choomai_bot:verify:${interaction.user.id}:attempts`);
        return void interaction.editReply({
            content: `You have reached the maximum verification attempts. Please try again in ${formatTime(ttlLeft * 1000)}.`,
            flags: MessageFlags.Ephemeral
        });
    };

    await interaction.client.redis.incr(`choomai_bot:verify:${interaction.user.id}:attempts`);
    await interaction.client.redis.expire(`choomai_bot:verify:${interaction.user.id}:attempts`, 6 * 60 * 60);

    const uuid = crypto.randomUUID();
    await interaction.client.redis.setex(
        `choomai_bot:verify:${uuid}`,
        10 * 60,
        JSON.stringify({ userId: interaction.user.id, guildId: interaction.guildId })
    );
    try {
        await interaction.user.send(`Your verification URL is: https://${process.env.DOMAIN}/verify/${uuid}`);
        void interaction.editReply({ content: "Check your DM for verification URL.", flags: MessageFlags.Ephemeral });
    } catch {
        await interaction.editReply("I couldn't send you a DM. Please enable DMs and try again.");
    }
}

export const data = new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Who are you ?")