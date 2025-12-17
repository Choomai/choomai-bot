const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { exec } = require("node:child_process");
const net = require("node:net");

async function execute(interaction) {
    await interaction.deferReply();
    const embedReply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: "Server Status", iconURL: "https://assets.choomai.net/icons/network_256.png", url: "https://l.choomai.net/status" })
        .setTimestamp()
        .addFields(
            {name: "Website", value: "🕒Checking", inline: true},
            {name: "VPN", value: "🕒Checking", inline: true},
            {name: "Minecraft", value: "🕒Checking", inline: true}
        );
    await interaction.editReply({embeds: [embedReply]});

    async function updateStat(online, id) {
        embedReply.data.fields[id].value = online ? "✅Online" : "❌Offline";
        await interaction.editReply({embeds: [embedReply]});
    };

    exec("systemctl is-active nginx --quiet", err => updateStat(!err, 0));

    async function checkPort(host, port) {
        const client = new net.Socket();
        const status = await new Promise(resolve => {
            client.setTimeout(5000).connect(port, host)
            .on("connect", () => resolve(true))
            .on("error", () => resolve(false))
            .on("timeout", () => resolve(false))
            .on("close", hadErr => resolve(hadErr));
        });
        if (!client.destroyed) client.destroy();
        return status;
    }
    updateStat((await checkPort("vpn.choomai.net", 5555)), 1);
    updateStat((await checkPort("mc.choomai.net", 25565)), 2);
}

module.exports = {
    cooldown: 10000,
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Return all server status of Choomai"),
    execute
}
