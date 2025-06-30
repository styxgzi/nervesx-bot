import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_TEXTS } from 'src/constants/strings';

@Injectable()
export class HackBanCommandService {
  private readonly logger = new Logger(HackBanCommandService.name);
  private isOfficialAdmin;
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly securityService: SecurityService,
    private readonly helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]): Promise<any> {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await message.reply(
        BOT_TEXTS.YOU_DON_NOT_HAVE_PERMISSIONS_TO_BAN_A_MEMBER,
      );
      return;
    }

    // Argument validation
    if (args.length === 0) {
      return this.helperService.sendAutoDeleteMessage(
        message,
        BOT_TEXTS.PLEASE_MENTION_A_USER_TO_BAN,
        5000,
      );
      return;
    }

    // Process each mentioned user or ID for banning
    const users = await this.helperService.extractUsers(message);
    const results = await Promise.all(
      message.mentions.users.size > 0
        ? users.map((user) => this.banUser(message, user.id))
        : args.map((arg) => this.banUser(message, arg.replace(/[^0-9]/g, ''))), // Cleanup to ensure only IDs are processed
    );

    // Compile and send feedback
    const feedback = results.join('\n');

    // Log the action in a specific server log channel
    this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `Hexed and banished by ${message.author.tag}: \n${feedback}`,
    );
  }

  private async banUser(message: Message, userId: string): Promise<any> {
    try {
      // Check if the user to be banned is the server owner
      if (userId === message.guild.ownerId) {
        return this.helperService.sendAutoDeleteMessage(
          message,
          BOT_TEXTS.SERVER_OWNER_CANNOT_BE_BANNED,
          5000,
        );
      }

      const result = await this.securityService.canPerformAction(
        message.member.id,
        userId,
        message.guildId,
        'Ban',
      );

      if (!result.canPerform) {
        return this.helperService.sendAutoDeleteMessage(
          message,
          result.message,
          5000,
        );
      }
      // Attempt to ban the user
      await message.guild.members.ban(userId, {
        reason: `Banned by ${message.author.tag}`,
      });
      return `User <@${userId}> has been sent to the shadow realm! Successfully banned.`;
    } catch (error) {
      this.logger.error(`Failed to ban ${userId}:`, error);
      return `User <@${userId}> resisted the ban spell - ${error.message}`;
    }
  }
}
