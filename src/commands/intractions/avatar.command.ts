import { Injectable } from '@nestjs/common';
import { EmbedBuilder, Message, User } from 'discord.js';
import { HelperService } from 'lib/classes/Helper';

@Injectable()
export class AvatarCommandService {
  constructor(private readonly helperService: HelperService) {}
  async executeText(message: Message, args: string[]): Promise<void> {
    try {
      // Get the first mentioned user or the message author if no user is mentioned
      const user: User =
        (await this.helperService.extractUser(message)) || message.author;

      // Create the embed with the user's avatar
      const embed = new EmbedBuilder()
        .setTitle(`${user.tag}'s avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }))
        .setColor('#0099ff');

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
      await message.reply('There was an error while fetching the avatar.');
    }
  }

  async getProfileBanner(message: Message) {
    const user = message.mentions.users.first() || message.author;

    // Fetch the full user object to access the banner
    const fullUser =
      (await message.client.users.fetch(user.id, { force: true })) ||
      message.author;

    const bannerURL = fullUser.bannerURL({ size: 4096 });
    if (!bannerURL) {
      return message.reply(`${user.username} does not have a profile banner.`);
    }

    const embed = {
      title: `${user.username}'s Profile Banner`,
      image: { url: bannerURL },
    };

    message.reply({ embeds: [embed] });
  }

  async getServerBanner(message: Message) {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    const guild = await message.client.guilds.fetch(message.guild.id);
    const bannerURL = guild.bannerURL({ size: 4096 });

    if (!bannerURL) {
      return message.reply('This server does not have a banner.');
    }

    const embed = {
      title: `${guild.name}'s Server Banner`,
      image: { url: bannerURL },
    };

    message.reply({ embeds: [embed] });
  }

  async fetchServerSpecificAvatar(message: Message) {
    if (!message.guild)
      return message.reply('This command can only be used within a server.');

    const member = message.mentions.members.first() || message.member; // Get mentioned member or the author
    const avatarUrl = member.displayAvatarURL({ size: 1024 }); // Server-specific avatar

    const embed = new EmbedBuilder()
      .setTitle(`${member.displayName}'s Server Avatar`)
      .setImage(avatarUrl)
      .setColor(0x0099ff);

    await message.reply({ embeds: [embed] });
  }

  async fetchUserProfileBanner(message: Message) {
    if (!message.guild)
      return message.reply('This command can only be used within a server.');

    const user = message.mentions.users.first() || message.author; // Get mentioned user or the author
    const fullUser = await message.client.users.fetch(user.id, { force: true }); // Fetch full user object to access the banner
    const bannerUrl = fullUser.bannerURL({ size: 4096 }); // Global profile banner

    if (!bannerUrl) {
      return message.reply(`${user.username} does not have a profile banner.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Profile Banner`)
      .setImage(bannerUrl)
      .setColor(0x0099ff);

    await message.reply({ embeds: [embed] });
  }
}
