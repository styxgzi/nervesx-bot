import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionsBitField } from 'discord.js';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';

@Injectable()
export class SetAutoRoleCommandService {
  private readonly logger = new Logger(SetAutoRoleCommandService.name);

  constructor(private readonly serverLoggerService: ServerLoggerService) {}

  async executeText(message: Message, args: string[]): Promise<void> {
    // Permission check for the command issuer
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      await message.reply("You don't have permission to assign roles.");
      return;
    }

    if (args.length < 2) {
      await message.reply('Usage: !setrole @User RoleName');
      return;
    }

    const targetUser = message.mentions.users.first();
    const roleName = args.slice(1).join(' '); // Role name could be multiple words

    if (!targetUser) {
      await message.reply('Please mention a valid user.');
      return;
    }

    const guildMember = message.guild.members.cache.get(targetUser.id);
    const role = message.guild.roles.cache.find((r) => r.name === roleName);

    if (!role) {
      await message.reply(`Role "${roleName}" not found.`);
      return;
    }

    // Fetch the bot's GuildMember object
    const botMember = await message.guild.members.fetch(message.client.user.id);

    // Check if the bot has permissions to assign the role
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await message.reply("I don't have permission to assign roles.");
      return;
    }

    // Ensure bot's highest role is above the role it needs to assign
    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      await message.reply(
        'My highest role is not high enough to assign this role.',
      );
      return;
    }

    try {
      await guildMember.roles.add(role);
      await message.reply(
        `Role "${roleName}" has been assigned to ${targetUser.tag}.`,
      );
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Role "${roleName}" has been assigned to ${targetUser.tag}.`,
      );
    } catch (error) {
      this.logger.error(`Failed to assign role: ${error}`);
      await message.reply('Failed to assign the role. Please try again.');
    }
  }
}
