const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const wol = require("wol");

async function execute(interaction) {
    const { options } = interaction;

    await interaction.deferReply();
    let ip = options.getString('ip');
    let port = options.getInteger('port');
    let mac = options.getString('mac');

    function wakeDevice(mac, ip, port = 9) {
        wol.wake(mac, {address: ip, port: port}, err => {
            if (err) return interaction.editReply({ content: "Failed to send the packet", flags: MessageFlags.Ephemeral });
            interaction.editReply(`Successfully wake the device!\nAPI: https://api.choomai.net/wol?ip=${ip}&mac=${mac}&port=${port}`);
        });
    };
    
    if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac))
        return await interaction.editReply({ content: "Invalid MAC", flags: MessageFlags.Ephemeral });

    if (!/^(?:[0-255]{1,3}\.){3}[0-255]{1,3}$/.test(ip)) {
        dns.lookup(ip, 4, (err, address) => {
            if (err) return interaction.editReply({ content: "Failed to lookup the domain", flags: MessageFlags.Ephemeral });
            wakeDevice(mac, address, port);
        });
    } else wakeDevice(mac, ip, port);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wol")
        .setDescription("Wake device from sleep using WOL")
        .addStringOption(option => option
            .setName("ip")
            .setDescription("The IP/Hostname to send the packet to")
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("port")
            .setDescription("The port to send the packet to")
            .setMinValue(1)
            .setMaxValue(65535)
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("mac")
            .setDescription("Device MAC address to send the packet")
            .setRequired(true)
        ),
    execute
}