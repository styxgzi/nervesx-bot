import { Injectable, Logger } from '@nestjs/common';
import {
  AttachmentBuilder,
  CommandInteraction,
  EmbedBuilder,
  Message,
  PermissionsBitField,
  TextChannel,
  NewsChannel,
  User,
} from 'discord.js';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { HelperService } from 'lib/classes/Helper';

@Injectable()
export class PurgeCommandService {
  private readonly logger = new Logger(PurgeCommandService.name);

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private readonly helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]): Promise<void> {
    await this.handleMessage(message);
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const args = message.content.split(' ').slice(1);
      const user = message.mentions.users.first();
      const amountArg = user ? args[1] : args[0];
      const amount = parseInt(amountArg) || 2;

      if (!this.hasManageMessagesPermission(message)) {
        await this.sendNoPermissionMessage(message);
        return;
      }

      if (isNaN(amount) || amount < 1 || amount > 100) {
        await this.sendInvalidAmountMessage(message);
        return;
      }

      if (!(message.channel instanceof TextChannel)) {
        await this.sendInvalidChannelMessage(message);
        return;
      }

      const deletedMessagesContent = await this.purgeMessages(
        message.channel,
        amount,
        user,
      );

      await this.logDeletedMessages(message, amount, deletedMessagesContent);
    } catch (error) {
      this.logger.error('Error handling message purge:', error);
      await this.sendErrorMessage(message);
    }
  }

  private async purgeMessages(
    channel: TextChannel,
    amount: number,
    user?: User,
  ): Promise<string[]> {
    try {
      let messagesToDelete;
      let deletedMessagesContent: string[] = [];

      if (user) {
        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const userMessages = fetchedMessages.filter(
          (m) => m.author.id === user.id,
        );
        messagesToDelete =
          userMessages.size > amount
            ? userMessages.first(amount)
            : userMessages;
      } else {
        messagesToDelete = await channel.messages.fetch({ limit: amount });
      }

      deletedMessagesContent = messagesToDelete.map(
        (m) => `${m.author.tag}: ${m.content}`,
      );

      await channel.bulkDelete(messagesToDelete, true);

      return deletedMessagesContent;
    } catch (error) {
      this.logger.error('Error purging messages:', error);
      throw new Error('Failed to purge messages.');
    }
  }

  private async logDeletedMessages(
    message: Message,
    amount: number,
    deletedMessagesContent: string[],
  ): Promise<void> {
    try {
      const serverLogChannels =
        await this.serverLogChannelRepository.findOneByServerId(
          message.guild.id,
        );

      if (serverLogChannels?.messageLogChannel?.id) {
        const logChannel = message.guild.channels.cache.get(
          serverLogChannels.messageLogChannel.id,
        );

        if (
          logChannel &&
          (logChannel instanceof TextChannel ||
            logChannel instanceof NewsChannel)
        ) {
          const content =
            deletedMessagesContent.join('\n') || 'No messages deleted';

          if (content.length > 1024) {
            const buffer = Buffer.from(content, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, {
              name: 'deleted-messages.txt',
            });
            await logChannel.send({
              content: `Purged ${amount} messages in channel ${message.channel}.`,
              files: [attachment],
            });
          } else {
            const embed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('Messages Purged')
              .setDescription(
                `Purged ${amount} messages in channel ${message.channel}.`,
              )
              .addFields({ name: 'Last Deleted Messages', value: content })
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error logging deleted messages:', error);
      throw new Error('Failed to log deleted messages.');
    }
  }

  private hasManageMessagesPermission(message: Message): boolean {
    return message.member.permissions.has(
      PermissionsBitField.Flags.ManageMessages,
    );
  }

  private async sendNoPermissionMessage(message: Message): Promise<void> {
    await this.helperService.sendAutoDeleteMessage(
      message,
      'You do not have permission to use this command.',
    );
  }

  private async sendInvalidAmountMessage(message: Message): Promise<void> {
    await this.helperService.sendAutoDeleteMessage(
      message,
      'Please specify a number between 1 and 100.',
    );
  }

  private async sendInvalidChannelMessage(message: Message): Promise<void> {
    await this.helperService.sendAutoDeleteMessage(
      message,
      'This command can only be used in text channels.',
    );
  }

  private async sendErrorMessage(message: Message): Promise<void> {
    await this.helperService.sendAutoDeleteMessage(
      message,
      'There was an error trying to purge messages in this channel.',
    );
  }
}
