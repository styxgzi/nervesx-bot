import { Injectable, Logger } from '@nestjs/common';
import { Client, Message, PermissionsBitField } from 'discord.js';
import { ServerBackupService } from 'lib/services/ServerBackup.service';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_TEXTS } from 'src/constants/strings';

@Injectable()
export class ServerBackupCommandService {
  private readonly logger = new Logger(ServerBackupCommandService.name);
  private isIssuerOwner;
  private isIssuerCoOwner;

  constructor(
    private readonly serverBackupService: ServerBackupService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
  ) {}

  async executeText(
    message: Message,
    args: string[],
    client: Client,
  ): Promise<void> {
    if (!message.guild) {
      this.logger.warn('Server backup command used outside of guild context.');
      return;
    }

    const guildSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(message.guildId);

    // Check if the user is whitelisted or has proper permissions

    this.isIssuerOwner = message.author.id === message.guild.ownerId;
    this.isIssuerCoOwner = guildSecurityDetails.secondOwners.includes(
      message.guild.ownerId,
    );

    if (!this.isIssuerOwner && !this.isIssuerCoOwner) {
      await message.reply(
        BOT_TEXTS.YOU_ARE_NOT_AUTHORIZED_TO_PERFORM_THIS_ACTION,
      );
      return;
    }

    try {
      const backupData = await this.serverBackupService.backupServer(
        message.guild.id,
        client,
      );

      await message.channel.send(
        `Server backup completed successfully! 📦. | Backup id: ${backupData.id}`,
      );
      this.logger.log(`Server backup successful for ${message.guild.name}`);

      // Log the action
      this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Server backup initiated by ${message.author.tag} completed successfully.`,
      );

      console.log(backupData);
    } catch (error) {
      this.logger.error('Failed to create server backup:', error);
      await message.channel.send('Failed to create server backup. 🚨');

      // Log the failure
      this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Server backup initiated by ${message.author.tag} failed: ${error.message}`,
      );
    }
  }

  async executeTextRestoreBackup(
    message: Message,
    args: string[],
    client: Client,
  ): Promise<void> {
    if (!message.guild) {
      this.logger.warn(
        'Server restore backup command used outside of guild context.',
      );
      return;
    }

    const guildSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(message.guildId);

    // Check if the user is whitelisted or has proper permissions

    this.isIssuerOwner = message.author.id === message.guild.ownerId;
    this.isIssuerCoOwner = guildSecurityDetails.secondOwners.includes(
      message.guild.ownerId,
    );

    if (!this.isIssuerOwner && !this.isIssuerCoOwner) {
      await message.reply(
        BOT_TEXTS.YOU_ARE_NOT_AUTHORIZED_TO_PERFORM_THIS_ACTION,
      );
      return;
    }

    try {
      if (!args || !args.length) {
        await message.channel.send('Backup id is required! 📦');
        return;
      }

      const backupData = await this.serverBackupService.restoreServer(
        message.guild.id,
        args[0],
        client,
      );

      await message.channel.send(
        'Server backup restoration completed successfully! 📦',
      );
      this.logger.log(
        `Server backup restoration successful for ${message.guild.name}`,
      );

      // Log the action
      this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Server backup restoration initiated by ${message.author.tag} completed successfully.`,
      );

      console.log(backupData);
    } catch (error) {
      this.logger.error('Failed to create server backup:', error);
      await message.channel.send('Failed to restore server backup. 🚨');

      // Log the failure
      this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Server backup restoration initiated by ${message.author.tag} failed: ${error.message}`,
      );
    }
  }
}
