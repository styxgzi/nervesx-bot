import { Injectable, Logger } from '@nestjs/common';
import { Message, TextChannel, PermissionsBitField } from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class MediaOnlyService {
  private readonly logger = new Logger(MediaOnlyService.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
  ) {}

  async handleMessage(message: Message): Promise<void> {
    const server = await this.serverRepository.findGuildById(message.guild.id);
    if (!server) return;
    // Ignore messages not in media-only channels or from bots
    const mediaOnlyChannelInDB: any = server.mediaOnlyChannels || [];
    const isUserWhitelisted: any = server.whitelistedUserIds || [];

    if (
      !mediaOnlyChannelInDB.includes(message.channelId) ||
      isUserWhitelisted.includes(message.author.id) ||
      message.author.bot
    ) {
      return;
    }

    // Allow all messages in threads without deletion
    if (message.channel instanceof TextChannel && message.channel.isThread()) {
      return;
    }

    // Check if the message contains media (attachments or embeds)
    const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;

    if (!hasMedia) {
      // Warn the user via DM to avoid public shaming and reduce channel noise
      try {
        await message.author.send(
          `Your message in ${message.channel.toString()} was deleted because it did not contain media. ` +
            `Please use threads if you wish to discuss using text.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send DM to ${message.author.tag}: ${error}`,
        );
      }

      // Delete the non-media message
      try {
        await message.delete();
      } catch (error) {
        this.logger.error(`Failed to delete non-media message: ${error}`);
      }
    }
  }

  async setMediaOnlyChannel(message: Message, args: string[]) {
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
      const mediaOnlyChannel =
        message.mentions.channels.first() || message.channel;

      const mediaOnlyChannelInDB =
        await this.serverRepository.addServerMediaOnlyChannel(
          mediaOnlyChannel.id,
          message.guild.id,
        );

      if (!mediaOnlyChannelInDB) {
        await message.reply(`Unable to set ${mediaOnlyChannel} as Media Only!`);
        return;
      }
      await message.reply(
        `${mediaOnlyChannel} has been updated to Media Only!`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${mediaOnlyChannel} has been updated to Media Only!`,
      );
    } catch (error) {
      this.logger.error(error);
      await message.reply(
        `Error occurred during updating channel to Media Only.`,
      );
    }
  }

  async unSetMediaOnlyChannel(message: Message, args: string[]) {
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
      const mediaOnlyChannel =
        message.mentions.channels.first() || message.channel;

      const mediaOnlyChannelInDB =
        await this.serverRepository.removeServerMediaOnlyChannel(
          mediaOnlyChannel.id,
          message.guild.id,
        );

      if (!mediaOnlyChannelInDB) {
        await message.reply(
          `Unable to remove ${mediaOnlyChannel} as Media Only!`,
        );
        return;
      }
      await message.reply(
        `${mediaOnlyChannel} has been removed from Media Only!`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${mediaOnlyChannel} has been removed from Media Only!`,
      );
    } catch (error) {
      this.logger.error(error);
      await message.reply(
        `Error occurred during removed from channel to Media Only.`,
      );
    }
  }
}
