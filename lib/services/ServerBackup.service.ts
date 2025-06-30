import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  Guild,
  GuildChannel,
  PermissionsBitField,
  RoleData,
  Snowflake,
} from 'discord.js';
import { ServerBackup } from 'lib/models/server-backup.schema';
import { ServerBackupRepository } from 'lib/repository/server-backup.repository';

@Injectable()
export class ServerBackupService {
  private readonly logger = new Logger(ServerBackupService.name);
  private botMember;

  constructor(private serverBackupRepository: ServerBackupRepository) {}

  private async fetchGuildData(guild: Guild, client: Client) {
    this.botMember = await guild.members.fetch(client.user.id);
    if (
      !this.botMember.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      this.logger.error(
        `Insufficient permissions to fetch data in guild ${guild.id}`,
      );
      throw new Error('Insufficient permissions to fetch complete guild data');
    }

    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    const bans = await guild.bans.fetch();
    const templates = await guild.fetchTemplates();

    return {
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        categoryId: channel.parentId,
        categoryName: channel.parent ? channel.parent.name : null,
        permissionOverwrites: channel.permissionOverwrites.cache.map(
          (perm) => ({
            id: perm.id,
            type: perm.type,
            allow: perm.allow.bitfield,
            deny: perm.deny.bitfield,
          }),
        ),
      })),
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield,
        mentionable: role.mentionable,
      })),
      bans: bans.map((ban) => ({
        user: {
          id: ban.user.id,
          username: ban.user.username,
          discriminator: ban.user.discriminator,
        },
        reason: ban.reason,
      })),
      templates: templates.map((template) => ({
        code: template.code,
        name: template.name,
        description: template.description,
        usageCount: template.usageCount,
      })),
    };
  }

  async backupServer(guildId: string, client: Client): Promise<ServerBackup> {
    const guild = await client.guilds.fetch(guildId).catch((error) => {
      this.logger.error(`Failed to fetch guild ${guildId}: ${error}`);
      throw new Error(`Failed to fetch guild ${guildId}`);
    });

    const { channels, roles, bans, templates } = await this.fetchGuildData(
      guild,
      client,
    ).catch((error) => {
      this.logger.error(`Failed to fetch data for guild ${guildId}: ${error}`);
      throw new Error(`Failed to fetch data for guild ${guildId}`);
    });

    const backupData = {
      serverId: guild.id,
      serverName: guild.name,
      serverSettings: {}, // Ensure this is set appropriately based on your needs
      channels,
      roles,
      bans,
      templates,
      timestamp: new Date(),
    };

    this.logger.log(`Backup completed for guild ${guildId}.`);
    return await this.serverBackupRepository.updateBackup(guildId, backupData);
  }

  async restoreServer(
    guildId: string,
    backupId: string,
    client: Client,
  ): Promise<void> {
    const guild = await client.guilds.fetch(guildId);
    const backup = await this.serverBackupRepository.findBackupById(backupId);
    this.botMember = await guild.members.fetch(client.user.id);
    if (!backup) {
      this.logger.error('Backup not found');
      throw new Error('Backup not found');
    }

    if (
      !this.botMember.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      this.logger.error(
        'Bot does not have administrator permissions in the guild',
      );
      throw new Error(
        'Bot requires administrator permissions to restore backup',
      );
    }

    try {
      // Restore bans
      await this.restoreBans(guild, backup.bans);

      // Restore roles
      await this.restoreRoles(guild, backup.roles);

      // Restore channels, including categories
      await this.restoreChannels(guild, backup.channels);

      // Restore server templates if applicable
      // Note: This is limited by Discord's permissions and might not be fully feasible
      await this.restoreTemplates(guild, backup.templates);

      this.logger.log(
        `Restoration completed for guild ${guildId} from backup ${backupId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to restore server ${guildId} from backup ${backupId}: ${error}`,
      );
      throw error; // Re-throw to allow caller to handle
    }
  }

  private async restoreBans(guild: Guild, bans: any[]): Promise<void> {
    for (const ban of bans) {
      if (
        !this.botMember.permissions.has(PermissionsBitField.Flags.BanMembers)
      ) {
        this.logger.warn('Bot does not have ban permissions');
        break; // Exit if the bot lacks permissions to ban users
      }

      try {
        await guild.members.ban(ban.user.id, { reason: ban.reason });
      } catch (error) {
        this.logger.error(
          `Failed to restore ban for user ${ban.user.id}: ${error}`,
        );
      }
    }
  }

  private async restoreRoles(guild: Guild, roles: any[]): Promise<void> {
    for (const role of roles) {
      if (
        !this.botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
      ) {
        this.logger.warn('Bot does not have role management permissions');
        break; // Exit if the bot lacks permissions to manage roles
      }

      try {
        // Ensure the permissions number is within a safe integer range
        const permissionsValue = Number.isSafeInteger(role.permissions)
          ? role.permissions
          : 0;

        // Convert the numeric permissions to an array of permission strings
        const permissions = new PermissionsBitField(permissionsValue).toArray();

        const roleData: RoleData = {
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions,
          mentionable: role.mentionable,
        };

        await guild.roles.create(roleData);
      } catch (error) {
        this.logger.error(`Failed to restore role ${role.name}: ${error}`);
      }
    }
  }

  private async restoreChannels(guild: Guild, channels: any[]): Promise<void> {
    const categoryMappings: Map<Snowflake, Snowflake> = new Map();

    for (const channel of channels.filter((c) => c.type === 'GUILD_CATEGORY')) {
      if (
        !this.botMember.permissions.has(
          PermissionsBitField.Flags.ManageChannels,
        )
      ) {
        this.logger.warn('Bot does not have channel management permissions');
        break; // Exit if the bot lacks permissions to manage channels
      }

      try {
        const createdCategory = await guild.channels.create({
          name: channel.name,
          type: channel.type,
        });
        categoryMappings.set(channel.id, createdCategory.id);
      } catch (error) {
        this.logger.error(
          `Failed to create category ${channel.name}: ${error}`,
        );
      }
    }

    for (const channel of channels.filter((c) => c.type !== 'GUILD_CATEGORY')) {
      if (
        !this.botMember.permissions.has(
          PermissionsBitField.Flags.ManageChannels,
        )
      ) {
        this.logger.warn('Bot does not have channel management permissions');
        break; // Exit if the bot lacks permissions to manage channels
      }

      try {
        // Prepare channel options for creation
        const channelOptions = {
          name: channel.name,
          type: channel.type,
          parent: categoryMappings.get(channel.parentId),
          position: channel.position,
          permissionOverwrites: channel.permissionOverwrites, // Assuming this is correctly structured
          topic: channel.topic, // Assuming 'topic' exists and is valid for text channels
          nsfw: channel.nsfw, // Assuming 'nsfw' exists and is valid for text channels
          bitrate: channel.bitrate, // Assuming 'bitrate' exists and is valid for voice channels
          userLimit: channel.userLimit, // Assuming 'userLimit' exists and is valid for voice channels
        };

        // Create the channel with the specified options
        await guild.channels.create(channelOptions);
      } catch (error) {
        this.logger.error(`Failed to create channel ${channel.name}: ${error}`);
      }
    }
  }

  private async restoreTemplates(
    guild: Guild,
    templates: any[],
  ): Promise<void> {
    // Restoring templates might not be possible through the bot as it requires server admin privileges
    this.logger.warn(
      'Restoring server templates is not supported by Discord Bot API',
    );
  }
}
