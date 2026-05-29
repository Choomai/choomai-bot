import { SlashCommandBuilder, MessageFlags, CommandInteraction } from "discord.js";
import wol from "wol";
import dns from "node:dns/promises";
import net from "node:net";
import zod from "zod";

/**
 * @param {CommandInteraction} interaction 
 * @returns {Promise<void>}
 */
export async function execute(interaction) {
    const { options } = interaction;

    await interaction.deferReply();
    let ip = options.getString("ip");
    let port = options.getInteger("port") || 9;
    let mac = options.getString("mac");

    async function wakeDevice(mac, ip, port = 9) {
        try {
            await wol.wake(mac, {address: ip, port: port});
        } catch (err) {
            console.error(err);
            return void interaction.editReply({ content: "Failed to send the packet.", flags: MessageFlags.Ephemeral });
        }
    };

    if (!zod.mac().safeParse(mac).success)
        return void interaction.editReply({ content: "Invalid MAC", flags: MessageFlags.Ephemeral });


    if (net.isIP(ip) !== 0) return wakeDevice(mac, ip, port);
    try {
        const address = await dns.lookup(ip, { order: "ipv6first" });
        await wakeDevice(mac, address, port);
    } catch (err) {
        console.error(err);
        return void interaction.editReply({ content: "Failed to lookup the domain.", flags: MessageFlags.Ephemeral });
    }
};

export const data = new SlashCommandBuilder()
    .setName("wol")
    .setDescription("Wake device from sleep using WOL")
    .addStringOption(option => option
        .setName("ip")
        .setDescription("The IP/Hostname to send the packet to")
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName("mac")
        .setDescription("Device MAC address to send the packet")
        .setRequired(true)
    )
    .addIntegerOption(option => option
        .setName("port")
        .setDescription("The port to send the packet to. Default is 9")
        .setMinValue(1)
        .setMaxValue(65535)
        .setRequired(false)
    )