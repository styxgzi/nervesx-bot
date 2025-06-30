import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionsBitField, GuildMember } from 'discord.js';

@Injectable()
export class NicknameService {
  private readonly logger = new Logger(NicknameService.name);

  constructor() {}

  async changeNickname(message: Message): Promise<any> {
    // Ensure the command is issued in a guild
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    // Split the message content to get command arguments
    const args = message.content.split(' ').slice(1); // Assuming command format is "!setnick @user newNickname"
    const mentionedMember = message.mentions.members.first(); // The user to change the nickname for
    const newNickname = args.slice(1).join(' '); // The rest of the message is the new nickname

    // Fetch the bot's member object in the guild
    const botMember = await message.guild.members.fetch(message.client.user.id);

    // Permission check for the bot
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return message.reply(
        "I don't have permission to change nicknames in this server.",
      );
    }

    // Permission check for the user issuing the command
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)
    ) {
      return message.reply('You do not have permission to change nicknames.');
    }

    // Validate the mentioned member and new nickname
    if (!mentionedMember || !newNickname) {
      return message.reply(
        'Please mention a user and specify a new nickname. Format: `!setnick @user NewNickname`',
      );
    }

    // Check the bot's role position against the mentioned member's role position
    if (
      mentionedMember.roles.highest.position >= botMember.roles.highest.position
    ) {
      return message.reply(
        'I cannot change the nickname of this user due to role hierarchy.',
      );
    }

    // Attempt to change the nickname
    try {
      await mentionedMember.setNickname(newNickname);
      message.reply(
        `Nickname changed for ${mentionedMember.user} to "${newNickname}"`,
      );
    } catch (error) {
      this.logger.error('Failed to set nickname:', error);
      message.reply(
        'There was an error trying to change the nickname. Please ensure the nickname is valid and try again.',
      );
    }
  }
}
