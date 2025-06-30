import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, Message, PermissionsBitField } from 'discord.js';
import { PunishmentService } from 'lib/classes/Punishment';
import { ServerLoggerService } from 'lib/classes/ServerLogger';
import { BOT_ROLES } from 'src/constants/strings';

@Injectable()
export class MuteCommandService {
  private readonly logger = new Logger(MuteCommandService.name);
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly punishmentService: PunishmentService,
  ) {}

  async executeText(message: Message, args: string[]): Promise<void> {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      message.reply('You do not have permission to mute members.');
      return;
    }

    const member = message.mentions.members.first();
    if (!member) {
      message.reply('Please mention a user to mute.');
      return;
    }

    await this.punishmentService
      .muteMember(member)
      .then(() => {
        message.channel.send(`${member.displayName} has been muted.`);
      })
      .catch((error) => {
        this.logger.error(`Failed to mute ${member.displayName}: ${error}`);
        message.reply('There was an error trying to mute the user.');
      });
  }
}
