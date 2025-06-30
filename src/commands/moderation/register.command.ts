// warn.command.ts
import { Injectable } from '@nestjs/common';
import { CommandInteraction, Message, PermissionFlagsBits } from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { AllowedUsersRepository } from 'lib/repository/registered-user.repository';

@Injectable()
export class RegisterCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly allowedUsersRepository: AllowedUsersRepository,
  ) {}

  async executeText(message: Message, args: string[]) {
    // Check if the message member has the permission to warn members
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply('You do not have permission to warn members');
      return;
    }

    const subCommand = args[0];
    const username = args[1];

    if (subCommand === 'add') {
      await this.allowedUsersRepository.addAllowedUser(
        username,
        message.guild.id,
      );
      await message.reply(
        `${username} has been added to allowed users for this server.`,
      );
    } else if (subCommand === 'remove') {
      await this.allowedUsersRepository.removeAllowedUser(
        username,
        message.guild.id,
      );
      await message.reply(
        `${username} has been removed from allowed users for this server.`,
      );
    } else {
      await message.reply('Invalid subcommand. Use "add" or "remove".');
    }
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `User ${username} has been registered for this server.`,
    );
  }
}
