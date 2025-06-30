import { Injectable, Logger } from '@nestjs/common';
import { Message, TextChannel, PermissionsBitField } from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class ByPassAntiLinkService {
  private readonly logger = new Logger(ByPassAntiLinkService.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
  ) {}

  async setAntiLinkAllowedChannels(message: Message, args: string[]) {
    try {
      // Check if the message member has the permission to timeout members
      const isOwner = message.guild && message.guild.ownerId;
      const isUserWhitelisted = await this.securityService.isUserWhitelisted(
        message.author.id,
        message.guild.id,
      );
      if (!isOwner && !isUserWhitelisted) {
        await message.reply('You do not have permission to whitelist members');
        return;
      }

      // Parsing arguments
      const antiLinkAllowedChannel =
        message.mentions.channels.first() || message.channel;

      const antiLinkAllowedChannelInDB =
        await this.serverRepository.addAntiLinkAllowedChannel(
          antiLinkAllowedChannel.id,
          message.guild.id,
        );

      if (!antiLinkAllowedChannelInDB) {
        await message.reply(
          `Unable to set ${antiLinkAllowedChannel} as AntiLinkChannel!`,
        );
        return;
      }
      await message.reply(
        `${antiLinkAllowedChannel} has been updated to AntiLinkChannel!`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${antiLinkAllowedChannel} has been updated to AntiLinkChannel!`,
      );
    } catch (error) {
      this.logger.error(error);
      await message.reply(
        `Error occurred during updating channel to AntiLinkChannel.`,
      );
    }
  }

  async unSetAntiLinkAllowedChannels(message: Message, args: string[]) {
    try {
      // Check if the message member has the permission to timeout members
      const isOwner = message.guild && message.guild.ownerId;
      const isUserWhitelisted = await this.securityService.isUserWhitelisted(
        message.author.id,
        message.guild.id,
      );
      if (!isOwner && !isUserWhitelisted) {
        await message.reply('You do not have permission to whitelist members');
        return;
      }

      // Parsing arguments
      const antiLinkAllowedChannel =
        message.mentions.channels.first() || message.channel;

      const antiLinkAllowedChannelInDB =
        await this.serverRepository.removeAntiLinkChannel(
          antiLinkAllowedChannel.id,
          message.guild.id,
        );

      if (!antiLinkAllowedChannelInDB) {
        await message.reply(
          `Unable to remove ${antiLinkAllowedChannel} as AntiLinkChannel!`,
        );
        return;
      }
      await message.reply(
        `${antiLinkAllowedChannel} has been removed from AntiLinkChannel!`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${antiLinkAllowedChannel} has been removed from AntiLinkChannel!`,
      );
    } catch (error) {
      this.logger.error(error);
      await message.reply(
        `Error occurred during removed from channel to AntiLinkChannel.`,
      );
    }
  }
}
