const fs = require("node:fs");
const path = require("node:path");
if (process.env.NODE_ENV != "production") require("@dotenvx/dotenvx").config();
const { Queue, Worker } = require("bullmq");
const express = require("express");
const Redis = require("ioredis");
const mysql = require("mysql2/promise");
const { Client, Collection, Events, GatewayIntentBits, ActivityType, Partials, MessageFlags, PermissionFlagsBits } = require("discord.js");

const { version } = require("./package.json");
const { formatTime } = require("./include/time.js");
const { simpleLog, commandLog, autoMuteLog } = require("./include/log.js");
const { isOnCooldown } = require("./include/cooldown.js");

const redisConf = {
    host: process.env.REDIS_HOST,
    path: process.env.REDIS_SOCKET
};
const afkQueue = new Queue("afk", { connection: redisConf });
const afkNotify = new Queue("notify", { connection: redisConf });
new Worker("afk", async job => {
    const user = await client.users.fetch(job.id);
    console.log(`AFK status expired for user ${user.username}.`);
    user.send("Your AFK status has expired.")
        .catch(() => console.warn(`Failed to send DM, ${user.username} might disabled it.`));
    if (job.data.notifyId) await afkNotify.removeJobScheduler(job.data.notifyId);
}, { connection: redisConf });
new Worker("notify", async job => {
    const user = await client.users.fetch(job.data.userId);
    console.log(`Sending AFK notification to user ${user.username}.`);
    user.send(`You have ${formatTime(job.data.endTime - Date.now())} left.`)
        .catch(() => console.warn(`Failed to send DM, ${user.username} might disabled it.`));
}, { connection: redisConf });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});
client.cooldowns = new Collection();
client.db = mysql.createPool({
    host: process.env.DB_HOST,
    socketPath: process.env.DB_SOCKET,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
client.redis = new Redis(redisConf);
const server = express();
server.use(express.json());
server.enable("trust proxy");
server.set("view engine", "ejs");

const memberVCStates = new Map();
const passingObj = { afkQueue, afkNotify };

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands/");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    let filePath = path.join(commandsPath, file);
    let command = require(filePath);
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
};



client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}.`);
    client.user.presence.set({ activities: [{ name: `v${version}`, type: ActivityType.Watching }] })
});

client.on(Events.GuildMemberAdd, async member => {
    simpleLog(client, member.guild.id, `${member} has joined the server. Please verify.`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (newState.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    if ((oldState.channelId !== null) === (newState.channelId !== null)) return; // Sanity check I guess, XOR btw

    if (!oldState.channelId && newState.channelId) // Store timestamp when join
        return memberVCStates.set(newState.member.id, { 
            channelId: newState.channelId,
            joined: true,
            timestamp: Date.now()
        });

    if (!memberVCStates.get(newState.member.id)?.joined) return;
    
    const storedState = memberVCStates.get(newState.member.id);
    const timePassed = Date.now() - storedState.timestamp;
    if (timePassed > 5000) return memberVCStates.delete(newState.member.id);

    await newState.member.timeout(10 * 60 * 1000, "Join & leave VC too fast");
    autoMuteLog(client, newState.guild.id, newState.member.user, 10 * 60 * 1000, "Join & leave VC too fast");
    newState.member.send("You have been muted for 10 minutes due to joining and leaving voice chat too quickly.")
        .catch(() => console.warn(`Failed to send DM, ${newState.member.user.username} might disabled it.`));
    memberVCStates.delete(newState.member.id);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild()) return interaction.reply("Hey! Don't use these commands here; use them on your server.");

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return console.warn(`No command matching ${interaction.commandName} was found.`);

    if (timeLeft = isOnCooldown(interaction.commandName, interaction.user.id, command.cooldown))
        return await interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)}s before execute this command again.`, flags: MessageFlags.Ephemeral })

    console.log(`${interaction.user.username} in #${interaction.channel.name} called /${interaction.commandName}.`);
    try {await command.execute(interaction, passingObj)}
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        };
    };
    
    commandLog(interaction.client, interaction.guildId, interaction.user, interaction.commandName);
});

client.on(Events.MessageCreate, async message => {
    // TODO: Add args to command execution
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.mentions.has(client.user)) return;

    const commandName = message.content.split(/ +/)[1]?.toLowerCase();
    const command = message.client.commands.get(commandName);
    if (!command) return console.warn(`No command matching ${commandName} was found.`);
    if (!command.messageCommand) return message.reply("This command is not available as a message command.");

    if (timeLeft = isOnCooldown(commandName, message.author.id, command.cooldown))
        return await message.reply(`Please wait ${timeLeft.toFixed(1)}s before execute this command again.`);

    console.log(`${message.author.username} in #${message.channel.name} called /${commandName}.`);
    try {await command.execute(message, passingObj)}
    catch (error) {
        console.error(error);
        message.reply("There was an error while executing this command!");
    };

    commandLog(message.client, message.guildId, message.author, commandName);
});


server.get("/verify/:uuid", async (req, res) => {
    const uuid = req.params.uuid;
    if (!/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid)) {
        res.setHeader("Content-Type", "text/plain");
        return res.status(400).send("Invalid UUID format.");
    }
    if (!await client.redis.get(`choomai_bot:verify:${uuid}`)) return res.status(404).send("UUID not found or expired.");

    res.render("verify", { siteKey: process.env.TURNSTILE_SITE_KEY });
});

server.post("/verify/:uuid/check", async (req, res) => {
    const { token } = req.body;
    const uuid = req.params.uuid;
    if (!uuid || !token) return res.status(400).json({ success: false, message: "Missing uuid or token." });
    if (!/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid))
        return res.status(400).json({ success: false, message: "Invalid UUID format." });

    const userData = JSON.parse(await client.redis.get(`choomai_bot:verify:${uuid}`));
    if (!userData) return res.status(404).json({ success: false, message: "UUID not found or expired." });

    try {
        const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: token,
                remoteip: req.ip
            })
        });
        const turnstileResult = await turnstileResponse.json();
        if (!turnstileResult.success) return res.status(403).json({ success: false, message: "Token verification failed." });

        const guild = await client.guilds.fetch(userData.guildId);
        const role = await guild.roles.fetch(process.env.SERVER_MEMBER_ID);
        if (!role) return res.status(500).json({ success: false, message: "Member role not found. Please contact an administrator." });

        const member = await guild.members.fetch(userData.userId);
        await member.roles.add(role, "User passed Turnstile verification");
        await client.redis.del(`choomai_bot:verify:${uuid}`, `choomai_bot:verify:${userData.userId}:attempts`);

        console.log(`User ${member.user.tag} has been verified and given the member role.`);
        simpleLog(client, userData.guildId, `${member} has been verified and given the ${role} role.`);
        return res.json({ success: true, message: "Verification successful. You can now access the server." });
    } catch (error) {
        console.error("Error verifying Turnstile token:", error);
        return res.status(500).json({ success: false, message: "Error verifying token." });
    };
});


client.login(process.env.TOKEN);
if (process.env.SOCKET_PATH) {
    try {
        fs.accessSync(process.env.SOCKET_PATH, fs.constants.R_OK | fs.constants.W_OK);
        fs.unlinkSync(process.env.SOCKET_PATH);
    } catch { /* No existing socket, or failed to access/unlink, just continue */ }
    server.listen(process.env.SOCKET_PATH, () => {
        console.log(`Web server is running on socket ${process.env.SOCKET_PATH}.`);
        fs.chmodSync(process.env.SOCKET_PATH, "0775");
    });
} else {
    server.listen(process.env.PORT, () => console.log(`Web server is running on port ${process.env.PORT}.`));
}
