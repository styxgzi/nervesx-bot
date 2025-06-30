import { Injectable, Logger } from '@nestjs/common';
import * as Discord from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { HelperService } from 'lib/classes/Helper';

@Injectable()
export class CommandRegistrationService {
  constructor(private helperService: HelperService) {}
  private readonly logger = new Logger(CommandRegistrationService.name);
  async unregisterCommands(client: Discord.Client, token: string) {
    const rest = new REST({ version: '9' }).setToken(token);

    try {
      console.log('Started removing application (/) commands.');

      const guilds = await client.guilds.fetch();

      for (const guild of guilds.values()) {
        try {
          console.log(
            `Removing application (/) commands for guild ${guild.id}`,
          );
          const commands = (await rest.get(
            Routes.applicationGuildCommands(client.user.id, guild.id),
          )) as Array<{ id: string }>;

          for (const command of commands) {
            await rest.delete(
              Routes.applicationGuildCommand(
                client.user.id,
                guild.id,
                command.id,
              ),
            );
          }

          console.log(
            `Successfully removed application (/) commands for guild ${guild.id}`,
          );
        } catch (error) {
          console.error(
            `Error removing commands for guild ${guild.id}:`,
            error,
          );
        }
      }

      console.log('Finished removing application (/) commands for all guilds.');
    } catch (error) {
      console.error('Error removing commands:', error);
    }
  }

  getKickEmbeds() {
    const command = new Discord.SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick users.');
    const maxUsers = 10; // Maximum number of users.

    for (let i = 1; i <= maxUsers; i++) {
      command.addUserOption(
        (option) =>
          option
            .setName(`user${i}`)
            .setDescription(
              `The ${this.helperService.ordinalSuffixOf(i)} user to kick.`,
            )
            .setRequired(i === 1), // Only the first user is required
      );
    }
    return command;
  }

  async registerCommands(
    client: Discord.Client,
    guildId: string | null,
    token: string,
  ) {
    const commands = [
      // BAN Command
      // new Discord.SlashCommandBuilder()
      //   .setName('ban')
      //   .setDescription('Ban a member')
      //   .addUserOption((option) =>
      //     option
      //       .setName('user')
      //       .setDescription('The user to ban')
      //       .setRequired(true),
      //   )
      //   .addStringOption((option) =>
      //     option.setName('reason').setDescription('Reason for the ban'),
      //   ),
      // // WARN Command
      // new Discord.SlashCommandBuilder()
      //   .setName('warn')
      //   .setDescription('Warn a member')
      //   .addUserOption((option) =>
      //     option
      //       .setName('user')
      //       .setDescription('The user to warn')
      //       .setRequired(true),
      //   )
      //   .addStringOption((option) =>
      //     option.setName('reason').setDescription('Reason for the warn'),
      //   ),
      // // TIMEOUT Command
      // new Discord.SlashCommandBuilder()
      //   .setName('timeout')
      //   .setDescription('Timeout a member')
      //   .addUserOption((option) =>
      //     option
      //       .setName('user')
      //       .setDescription('The user to timeout')
      //       .setRequired(true),
      //   )
      //   .addStringOption((option) =>
      //     option.setName('reason').setDescription('Reason  the timeout'),
      //   )
      //   .addIntegerOption((option) =>
      //     option.setName('duration').setDescription('Duration of the timeout'),
      //   ),
      // // JAIL Command
      // new Discord.SlashCommandBuilder()
      //   .setName('jail')
      //   .setDescription('Jail a member')
      //   .addUserOption((option) =>
      //     option
      //       .setName('user')
      //       .setDescription('The user to jail')
      //       .setRequired(true),
      //   )
      //   .addStringOption((option) =>
      //     option.setName('reason').setDescription('Reason for the jail'),
      //   ),
      // BOT SETUP Command
      new Discord.SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the bot'),
      new Discord.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ping of the bot'),
      new Discord.SlashCommandBuilder()
        .setName('help')
        .setDescription('We are here to help you.'),
      new Discord.SlashCommandBuilder()
        .setName('activate-antiraid')
        .setDescription('Activate AntiRaid for the server.'),
      new Discord.SlashCommandBuilder()
        .setName('deactivate-antiraid')
        .setDescription('Deactivate AntiRaid for the server.'),
      this.getKickEmbeds(),
    ].map((command) => command.toJSON());

    const rest = new REST({ version: '9' }).setToken(token);

    try {
      this.logger.log(
        `Started refreshing application (/) commands for guild ${guildId}.`,
      );

      if (this.helperService.isProduction()) {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, guildId),
          {
            body: commands,
          },
        );
      } else {
        await rest.put(Routes.applicationCommands(client.user.id), {
          body: commands,
        });
      }

      this.logger.log(
        `Successfully reloaded application (/) commands for guild ${guildId}.`,
      );
    } catch (error) {
      this.logger.error(error);
    }
  }
}
