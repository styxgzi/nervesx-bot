import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, Message, PermissionsBitField } from 'discord.js';
import { ServerLoggerService } from 'lib/classes/ServerLogger';
import { BOT_ROLES } from 'src/constants/strings';

@Injectable()
export class UnmuteCommandService {
  private readonly logger = new Logger(UnmuteCommandService.name);

  constructor(private readonly serverLoggerService: ServerLoggerService) { }

  async executeText(message: Message, args: string[]): Promise<void> {
    // Check if the user has permissions to unmute members
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await message.reply('You do not have permission to unmute members.');
      return;
    }

    // Get the mentioned member
    const member = message.mentions.members.first();
    if (!member) {
      await message.reply('Please mention a user to unmute.');
      return;
    }

    // Call unmuteMember function to unmute the member
    await this.unmuteMember(member)
      .then(() => {
        message.channel.send(`${member.displayName} has been unmuted.`);
      })
      .catch((error) => {
        this.logger.error(`Failed to unmute ${member.displayName}: ${error}`);
        message.reply('There was an error trying to unmute the user.');
      });
  }

  private async unmuteMember(member: GuildMember): Promise<void> {
    const mutedRole = member.guild.roles.cache.find(
      (role) => role.name === BOT_ROLES.MUTED_NAME,
    );
    if (!mutedRole) {
      throw new Error('Muted role not found');
    }

    // Server unmute the member if they are currently server muted
    if (member.voice.serverMute) {
      await member.voice.setMute(false, 'Member unmuted via command').catch((error) => {
        throw new Error(`Failed to server unmute: ${error}`);
      });
    }

    // Remove the muted role from the member
    await member.roles.remove(mutedRole).catch((error) => {
      throw new Error(`Failed to remove muted role: ${error}`);
    });
  }
}
