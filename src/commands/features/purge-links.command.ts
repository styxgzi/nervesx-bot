import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  CommandInteraction,
  GuildMember,
  Message,
  PermissionsBitField,
  TextChannel,
  User,
} from 'discord.js';
import { ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';

@Injectable()
export class PurgeLinksCommandService {
  private readonly logger = new Logger(PurgeLinksCommandService.name);

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
  ) {}

  async executeText(message: Message, args: string[]) {
    // Enhanced permission check including guild check
    if (
      !message.guild ||
      !message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      await message.reply(
        'You do not have permission to use this command or it cannot be used in DMs.',
      );
      return;
    }

    const amount = parseInt(args[0]) || 5;

    // Validate amount argument
    if (isNaN(amount) || amount < 1 || amount > 100) {
      await message.reply(
        'Please specify a number of messages to scan for links between 1 and 100.',
      );
      return;
    }

    try {
      // Purge links and get count of deleted messages
      const deletedCount = await this.purgeLinks(message, amount);

      // Log action in server log channel
      await this.logAction(message, deletedCount);
    } catch (error) {
      this.logger.error('Failed to purge links:', error);
      await message.reply('An error occurred while trying to purge links.');
    }
  }

  private async purgeLinks(message: Message, amount: number): Promise<number> {
    if (!(message.channel instanceof TextChannel)) return 0;

    const fetchedMessages = await message.channel.messages.fetch({
      limit: amount,
    });
    const messagesWithLinks = fetchedMessages.filter((msg) =>
      /https?:\/\/[^\s]+/gi.test(msg.content),
    );

    await message.channel.bulkDelete(messagesWithLinks, true); // true for filterOld
    return messagesWithLinks.size;
  }

  private async logAction(
    message: Message,
    deletedCount: number,
  ): Promise<void> {
    const logChannelId = (
      await this.serverLogChannelRepository.findOneByServerId(message.guild.id)
    )?.messageLogChannel.id;
    const logChannel = message.guild.channels.cache.get(
      logChannelId,
    ) as TextChannel;

    if (logChannel && logChannel.type === ChannelType.GuildText) {
      await logChannel.send(
        `Purged ${deletedCount} messages containing links in ${message.channel}.`,
      );
    } else {
      this.logger.warn(
        `Log channel for ${message.guild.name} not found or not a text channel.`,
      );
    }
  }
}
