// timeout.command.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  LogChannelType,
  ServerLoggerService,
} from '../../../lib/classes/ServerLogger';
import {
  ChannelType,
  CommandInteraction,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { BOT_COMMANDS } from 'src/constants/strings';
import { HelperService } from 'lib/classes/Helper';

@Injectable()
export class TimeoutCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
  ) {}
  private readonly logger = new Logger(TimeoutCommandService.name);

  async executeText(message: Message, args: string[], action: string) {
    try {
      if (
        !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        const botMessage = await message.reply(
          'You do not have the permission to manage timeouts.',
        );
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }

      if (message.channel.type !== ChannelType.GuildText) {
        return message.reply(
          'This command can only be used in guild text channels.',
        );
      }
      const memberToManage = message.mentions.members.first();

      if (!memberToManage) {
        const botMessage = await message.reply(
          'You need to mention a member to manage timeouts.',
        );
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }
      // Check if the member is an admin
      if (memberToManage.permissions.has(PermissionFlagsBits.Administrator)) {
        const botMessage = await message.channel.send(
          `Cannot apply timeout to ${memberToManage.user.tag} as they have administrative privileges.`,
        );
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }

      if (action === BOT_COMMANDS.TIMEOUT) {
        const durationArg = args[1] || '60';
        await this.applyTimeout(memberToManage, durationArg, message.channel);
      } else if (action === BOT_COMMANDS.REMOVE_TIMEOUT) {
        await this.removeTimeout(memberToManage, message.channel);
      } else {
        const botMessage = await message.reply(
          'Invalid command usage. Please use `timeout` or `remove` as the action.',
        );
        await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
      }
    } catch (error) {
      this.logger.error(
        `Error occurred during the timeout management process: ${error}`,
      );
      const botMessage = await message.reply(
        'An error occurred while managing the timeout.',
      );
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    }
  }

  private async applyTimeout(
    memberToManage: GuildMember,
    durationArg: string,
    channel: TextChannel,
  ) {
    let duration = parseInt(durationArg, 10);
    if (!duration || isNaN(duration)) {
      const botMessage = await channel.send(
        `${memberToManage.user.tag}, invalid duration. Please specify a valid number of seconds.`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }

    // Apply timeout
    await memberToManage.timeout(duration * 1000);
    const botMessage = await channel.send(
      `${memberToManage.user.tag} has been timed out for ${duration} seconds.`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      memberToManage.guild,
      LogChannelType.MODERATOR,
      `${memberToManage.user.tag} has been timed out for ${duration} seconds.`,
    );
  }

  private async removeTimeout(
    memberToManage: GuildMember,
    channel: TextChannel,
  ) {
    // Remove timeout
    await memberToManage.timeout(null);
    const botMessage = await channel.send(
      `${memberToManage.user.tag}'s timeout has been removed.`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      memberToManage.guild,
      LogChannelType.MODERATOR,
      `${memberToManage.user.tag}'s timeout has been removed.`,
    );
  }
}
