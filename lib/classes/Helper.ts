import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ColorResolvable,
  Embed,
  EmbedBuilder,
  Message,
  Role,
  User,
} from 'discord.js';
import { ENVIRONMENTS } from 'src/constants/strings';

export interface EmbedOptions {
  title?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  url?: string;
  color?: ColorResolvable;
  footer?: { text: string; iconURL?: string };
  author?: { name: string; iconURL?: string; url?: string };
  thumbnailURL?: string;
  imageURL?: string;
  timestamp?: Date | null;
}

@Injectable()
export class HelperService {
  constructor(private configService: ConfigService) {}
  private readonly logger = new Logger(HelperService.name);

  isProduction = () =>
    this.configService.get<string>('ENVIRONMENT') === ENVIRONMENTS.PRODUCTION;

  async extractUser(message: Message): Promise<User> {
    // Check if there are mentions in the message
    if (message.mentions.users.size > 0) {
      return message.mentions.users.first();
    }

    // Try to extract a user ID from the message content
    const potentialId = message.content
      .split(/\s+/)
      .find((segment) => /^\d{17,19}$/.test(segment));

    if (potentialId) {
      try {
        // Attempt to fetch the user by ID
        const user = await message.client.users.fetch(potentialId);
        return user;
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Return null if the user cannot be fetched (e.g., invalid ID)
        return null;
      }
    }

    // Return null if no user is mentioned or a valid ID is not found
    return null;
  }

  async extractUsers(message: Message): Promise<User[]> {
    let users: User[] = [];

    // Collect all mentioned users
    if (message.mentions.users.size > 0) {
      users = message.mentions.users.map((user) => user);
    }

    // Additionally, try to extract any user IDs from the message content
    const userIDs = message.content.match(/\b\d{17,19}\b/g) || [];

    for (const id of userIDs) {
      try {
        if (!users.map((user) => user.id).includes(id)) {
          const user = await message.client.users.fetch(id);
          if (user) users.push(user);
        }
      } catch (error) {
        console.error(`Failed to fetch user with ID ${id}:`, error);
      }
    }

    return users;
  }

  async extractRole(message: Message): Promise<Role | null> {
    // Check if there are role mentions in the message
    if (message.mentions.roles.size > 0) {
      return message.mentions.roles.first();
    }

    const potentialId = message.content
      .split(/\s+/)
      .find((segment) => /^\d{17,19}$/.test(segment));

    if (potentialId && message.guild) {
      try {
        const role = await message.guild.roles.fetch(potentialId);
        if (role) {
          return role;
        }
      } catch (error) {
        this.logger.error('Failed to fetch role:', error);
      }
    }

    this.logger.warn('No valid found in message:', message.content);
  }

  ordinalSuffixOf(i) {
    const j = i % 10,
      k = i % 100;
    if (j == 1 && k !== 11) {
      return i + 'st';
    }
    if (j == 2 && k != 12) {
      return i + 'nd';
    }
    if (j == 3 && k != 13) {
      return i + 'rd';
    }

    return i + 'th';
  }
  formatDate(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes} GMT`;
  }

  async deleteLastBotMessageAfterInterval(
    botMessage: Message,
    interval: number = 5000,
  ) {
    setTimeout(() => {
      botMessage
        .delete()
        .catch((err) =>
          this.logger.error('Failed to delete bot message:', err),
        );
    }, interval);
  }

  async sendAutoDeleteMessage(
    message: Message,
    botMessage: string,
    interval: number = 5000,
    embeds: EmbedBuilder[] = [],
  ) {
    const botReply = await message.reply({
      content: botMessage,
      embeds: embeds,
    });
    return await this.deleteLastBotMessageAfterInterval(botReply, interval);
  }

  createEmbed(options: EmbedOptions): EmbedBuilder {
    const embed = new EmbedBuilder();

    if (options.title) {
      if (options.title.length > 256)
        throw new Error('Title cannot exceed 256 characters.');
      embed.setTitle(options.title);
    }

    if (options.description) {
      if (options.description.length > 4096)
        throw new Error('Description cannot exceed 4096 characters.');
      embed.setDescription(options.description);
    }

    if (options.fields) {
      if (options.fields.length > 25)
        throw new Error('Cannot have more than 25 fields.');
      options.fields.forEach((field) => {
        if (field.name.length > 256)
          throw new Error('Field name cannot exceed 256 characters.');
        if (field.value.length > 1024)
          throw new Error('Field value cannot exceed 1024 characters.');
        embed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline ?? false,
        });
      });
    }

    if (options.url) {
      embed.setURL(options.url);
    }

    if (options.color) {
      embed.setColor(options.color);
    }

    if (options.footer) {
      if (options.footer.text.length > 2048)
        throw new Error('Footer text cannot exceed 2048 characters.');
      embed.setFooter({
        text: options.footer.text,
        iconURL: options.footer.iconURL,
      });
    }

    if (options.author) {
      if (options.author.name.length > 256)
        throw new Error('Author name cannot exceed 256 characters.');
      embed.setAuthor({
        name: options.author.name,
        iconURL: options.author.iconURL,
        url: options.author.url,
      });
    }

    if (options.thumbnailURL) {
      embed.setThumbnail(options.thumbnailURL);
    }

    if (options.imageURL) {
      embed.setImage(options.imageURL);
    }

    if (options.timestamp !== undefined) {
      embed.setTimestamp(options.timestamp);
    }

    return embed;
  }

  getEmptyField(): { name: string; value: string; inline?: boolean } {
    return {
      name: '\u200b',
      value: '\u200b',
      inline: false,
    };
  }
}
