const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { clientId, token } = require('./config.json'); // Update with your config path

const commands = [];
const commandsPath = path.join(__dirname, '../', 'src', 'commands'); // Update with your commands path
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('command.ts'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data);
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
