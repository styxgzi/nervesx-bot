import { Injectable } from '@nestjs/common';
import { CommandInteraction, Message, PermissionsBitField } from 'discord.js';

@Injectable()
export class VanityCommandService {
  async activate(interaction: CommandInteraction) {}
  async handleAntiLink(message: Message) {
    // Check if the message is from a guild and not from the bot
      if (!message.guild || message.author.bot) return;
      await this.sendVanityURL(message.channel);
  }

  async sendVanityURL(channel) {
    const vanityCode = channel.guild.vanityURLCode;
    const response = vanityCode
      ? `Here's our vanity URL: https://discord.gg/${vanityCode}`
      : "Sorry, this server doesn't have a vanity URL set.";
    channel.send(response);
  }

  sendVanityURLAutomatically(client) {
    const targetChannel = client.channels.cache.get("TARGET_CHANNEL_ID");
    if (targetChannel) {
      this.sendVanityURL(targetChannel);
    } else {
      console.log(`Channel with ID ${"TARGET_CHANNEL_ID"} not found.`);
    }
  }
}
