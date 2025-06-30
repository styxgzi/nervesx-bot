import { Injectable, Logger } from '@nestjs/common';
import { Message, EmbedBuilder } from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { SnipeMessage } from 'lib/models/snipe-message.schema';
import { SnipeMessageRepository } from 'lib/repository/snipe-message.repository';

@Injectable()
export class SnipeService {
  private readonly logger = new Logger(SnipeService.name);

  constructor(
    private snipeMessageRepository: SnipeMessageRepository,
    private helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]) {
    const embed = await this.getSnipedMessages(
      message.channel.id,
      message.guildId,
      args && args.length ? +args[0] : 2,
    );
    const botMessage = await message.channel.send({ embeds: [embed] });
    // Delete the message after a certain time (e.g., 5 seconds)
    setTimeout(() => {
      botMessage
        .delete()
        .catch((err) =>
          this.logger.error('Failed to delete bot message:', err),
        );
    }, 5000);
  }

  async addSnipeMessage(message: Message) {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Also ignore messages without content or not from guilds
    if (!message.content || !message.guild) return;
    const snipeMessage: SnipeMessage = {
      content: message.content,
      author: message.author.tag,
      channelId: message.channel.id,
      guildId: message.guild.id,
      time: new Date(),
    };

    try {
      await this.snipeMessageRepository.addSnipeMessage(snipeMessage);
    } catch (error) {
      this.logger.error(
        `Failed to add snipe message: ${error.message}`,
        error.stack,
      );
    }
  }

  async getSnipedMessages(
    channelId: string,
    guildId: string,
    limit = 1,
  ): Promise<EmbedBuilder> {
    try {
      const snipeMessages = await this.snipeMessageRepository.getSnipeMessages(
        channelId,
        guildId,
        limit,
      );

      const embed: EmbedOptions = {
        title: `🔍 Sniped Messages`,
        description: '',
        fields: [],
        color: '#00BFFF',
        timestamp: new Date(),
      };

      // Limit to last 20 messages or whatever your limit is
      const sniped = snipeMessages.slice(0 - limit);

      for (const [index, message] of sniped.entries()) {
        // Embed fields limit
        let content = message.content || 'No content'; // Handle empty messages
        if (content.length > 1024) {
          // Field value length limit
          content = content.substring(0, 1021) + '...';
        }

        embed.fields.push({
          name: `*Message ${index + 1} by ${message.author}*`,
          value: content,
        });
      }
      await this.snipeMessageRepository.delete(channelId, guildId);
      return this.helperService.createEmbed(embed);
    } catch (error) {
      this.logger.error(
        `Failed to get snipe messages: ${error.message}`,
        error.stack,
      );
      return;
    }
  }
}
