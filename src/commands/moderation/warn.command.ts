// warn.command.ts
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Message, PermissionFlagsBits } from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';

@Injectable()
export class WarnCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]) {
    // Check if the message member has the permission to warn members
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await message.reply('You do not have permission to warn members');
      return;
    }

    // Parsing arguments
    const userToWarn = await this.helperService.extractUser(message);
    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Validate user to warn
    if (!userToWarn) {
      await message.reply(
        'Invalid command usage. You must mention a user to warn.',
      );
      return;
    }

    // TODO: Logic to record the warning
    await userToWarn.send(`You have been warned for: ${reason}`);

    await message.reply(
      `User ${userToWarn.tag} has been warned for: ${reason}`,
    );
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `User ${userToWarn.tag} has been warned for: ${reason}`,
    );
  }
}
