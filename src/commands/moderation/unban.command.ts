import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_TEXTS } from 'src/constants/strings';

@Injectable()
export class UnBanCommandService {
  private readonly logger = new Logger(UnBanCommandService.name);
  private isOfficialAdmin;

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly securityService: SecurityService,
  ) {}

  async executeText(message: Message, args: string[]): Promise<any> {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await message.reply(
        BOT_TEXTS.YOU_DO_NOT_HAVE_PERMISSIONS_TO_UN_BAN_A_MEMBER,
      );
      return;
    }

    // Argument validation
    if (args.length === 0) {
      await message.reply(BOT_TEXTS.PLEASE_MENTION_A_USER_TO_UN_BAN);
      return;
    }

    this.isOfficialAdmin = await this.securityService.isOfficialAdmin(
      message.member.id,
      message.guildId,
    );
    if (!this.isOfficialAdmin) {
      return message.reply('You are not whitelisted to unban users.');
    }

    if (!this.isOfficialAdmin) {
      await message.reply(
        BOT_TEXTS.YOU_DO_NOT_HAVE_PERMISSIONS_TO_UN_BAN_A_MEMBER,
      );
      return;
    }

    // Process each mentioned user or ID for banning
    const results = await Promise.all(
      message.mentions.users.size > 0
        ? message.mentions.users.map((user) => this.unBanUser(message, user.id))
        : args.map((arg) =>
            this.unBanUser(message, arg.replace(/[^0-9]/g, '')),
          ), // Cleanup to ensure only IDs are processed
    );
    // Compile and send feedback
    const feedback = results.join('\n');
    await message.channel.send(feedback);
    // Log the action in a specific server log channel
    this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `Unban executed by ${message.author.tag}: \n${feedback}`,
    );
  }

  private async unBanUser(message: Message, userId: string): Promise<string> {
    try {
      // Check if the user to be banned is the server owner
      if (userId === message.guild.ownerId) {
        await message.reply(BOT_TEXTS.SERVER_OWNER_CANNOT_BE_BANNED);
      }

      // Attempt to unban the user
      const ban = await message.guild.bans.fetch(userId).catch(() => null); // Fetch to see if the user is actually banned
      if (!ban) {
        return `User ${userId}: Not banned or unable to fetch ban details.`;
      }

      await message.guild.bans.remove(
        userId,
        `Unbanned by ${message.author.tag}`,
      );

      return `User ${userId}: Successfully unbanned.`;
    } catch (error) {
      this.logger.error(`Failed to unban ${userId}:`, error);
      return `User ${userId}: Failed to unban - ${error.message}`;
    }
  }
}
