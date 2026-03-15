const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { exec } = require("node:child_process");
const SysInfo = require("systeminformation")
const net = require("node:net");
const { formatBytes } = require("../include/bytes.js");

/**
 * @returns {Promise<{ name: string, value: string, inline?: boolean }[]>}
 */
async function getSystemStatus() {
    try {
        const sysInfoData = await Promise.all([
            SysInfo.currentLoad(),  
            SysInfo.cpuTemperature(),
            SysInfo.mem(),
            SysInfo.networkStats(),
            SysInfo.dockerInfo()
        ])

        return [
            { name: "CPU Load", value: `Avg: \`${sysInfoData[0].avgLoad}\` / Current: \`${sysInfoData[0].currentLoad.toFixed(2)}\`` },
            { name: "CPU Temp", value: sysInfoData[1].main.toString(), inline: true },
            { name: "RAM (Used/Total)", value: `\`${formatBytes(sysInfoData[2].used)}\` / \`${formatBytes(sysInfoData[2].total)}\`` },
            { name: "Network (RX/TX)", value: `\`${formatBytes(sysInfoData[3][0].rx_bytes)}\` / \`${formatBytes(sysInfoData[3][0].tx_bytes)}\`` },
            { name: "Docker", value: `Running: ${sysInfoData[4].containersRunning} / Total: ${sysInfoData[4].containers}` }
        ]
    } catch (err) {
        console.error(err);
        return [ { name: "System Status", value: "Error!" } ]
    }
}

/**
 * @param {CommandInteraction} interaction 
 * @returns {void}
 */
async function execute(interaction) {
    await interaction.deferReply();
    const embedReply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: "Server Status", iconURL: "https://assets.choomai.net/icons/network_256.png", url: "https://status.choomai.net" })
        .setTimestamp()
        .addFields(
            { name: "Website", value: "🕒Checking", inline: true },
            { name: "VPN", value: "🕒Checking", inline: true },
            { name: "Minecraft", value: "🕒Checking", inline: true },
            ...(await getSystemStatus())
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
