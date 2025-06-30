import { Injectable, Logger } from '@nestjs/common';
import {
  Message,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  NewsChannel,
} from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';
import { BotChannelType } from 'src/constants/enums';

@Injectable()
export class SetChannelCommandService {
  private readonly logger = new Logger(SetChannelCommandService.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
  ) {}

  async executeText(message: Message, args: string[]) {
    try {
      // Check permissions
      const isOwner = message.guild?.ownerId === message.author.id;
      const isUserWhitelisted = await this.securityService.isUserWhitelisted(
        message.author.id,
        message.guild?.id,
      );
      if (!isOwner && !isUserWhitelisted) {
        await message.reply('You do not have permission to setChannel.');
        return;
      }

      // Assuming args[0] is the channel tag and args[1] is the channel type
      if (args.length < 2) {
        await message.reply(
          'Please specify both channel tag and channel type.',
        );
        return;
      }

      // Extract channel ID from the mention
      const channelMention = args[0];
      const channelIdMatch = channelMention.match(/^<#(\d+)>$/);
      if (!channelIdMatch) {
        await message.reply('Invalid channel mention format.');
        return;
      }
      const channelId = channelIdMatch[1];

      // Verify channel type
      const channelType = args[1].toUpperCase();
      if (
        !Object.values(BotChannelType).includes(channelType as BotChannelType)
      ) {
        await message.reply(
          `Invalid channel type. Valid types are: ${Object.values(
            BotChannelType,
          ).join(', ')}`,
        );
        return;
      }

      // Find the mentioned channel based on tag (name or ID)
      const channel = message.guild?.channels.cache.find(
        (ch) => ch.id === channelId,
      );

      if (!channel) {
        await message.reply(`Channel "${channelId}" not found.`);
        return;
      }

      switch (channelType) {
        case BotChannelType.WELCOME:
          if (channel instanceof TextChannel) {
            await this.serverRepository.setWelcomeChannel(
              channel.id,
              message.guildId,
            );
          }
          break;
        case BotChannelType.BOT_PREFIX:
          if (channel instanceof TextChannel) {
            await this.serverRepository.setPrefix(channel.id, message.guildId);
          }
          break;
        default:
          await message.reply('Unsupported channel type for this operation.');
          return;
      }

      await message.reply(
        `${channel} has been processed as a ${channelType} channel.`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${channel} has been processed as a ${channelType} channel.`,
      );
    } catch (error) {
      this.logger.error(error);
      await message.reply(`Error occurred during the operation.`);
    }
  }
}
