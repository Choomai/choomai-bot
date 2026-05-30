import { REST, Routes } from "discord.js";
import "./include/config.js";
import loadCommands from "./commands/commands.js";
import fs from "node:fs";
import path from "node:path";

const rest = new REST().setToken(process.env.TOKEN);
(async () => {
	const commands = [];
    const loadedCommands = await loadCommands();
	for (const cmd of loadedCommands) {
		commands.push(cmd.data.toJSON());
		console.log(`Loaded command: ${cmd.data.name}`);
	}
	console.log(`Started refreshing ${commands.length} application (/) commands.`);

	// The put method is used to fully refresh all commands in the guild with the current set
	const data = await rest.put(
		Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.SERVER_ID),
		{ body: commands },
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
})();