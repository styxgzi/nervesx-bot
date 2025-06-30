import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  Guild,
  GuildAuditLogsEntry,
  AuditLogEvent,
  PermissionsBitField,
  GuildAuditLogs,
  GuildMember,
} from 'discord.js';
import { PunishmentService } from 'lib/classes/Punishment';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { ServerRepository } from 'lib/repository/server.repository';
import { RedisService } from 'lib/services/Redis.service';
import { CHANNEL_ACTION_TYPE } from 'src/constants/strings';

@Injectable()
export class AntiNukeService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly punishmentService: PunishmentService,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private readonly serverRepository: ServerRepository,
    private readonly redisService: RedisService,
  ) {}

  private readonly logger = new Logger(AntiNukeService.name);
  private serverLogChannels;

  // TODO: This has to be fetched from the Database
  private readonly actionThresholds = {
    [AuditLogEvent.ChannelCreate]: 5,
    [AuditLogEvent.ChannelDelete]: 1,
    [AuditLogEvent.ChannelUpdate]: 5,

    [AuditLogEvent.MemberKick]: 2,
    [AuditLogEvent.MemberBanAdd]: 2,
    [AuditLogEvent.MemberBanRemove]: 2,
    [AuditLogEvent.MemberPrune]: 0,
    [AuditLogEvent.MemberUpdate]: 5,
    [AuditLogEvent.MemberRoleUpdate]: 5,

    [AuditLogEvent.RoleCreate]: 0,
    [AuditLogEvent.RoleUpdate]: 0,
    [AuditLogEvent.RoleDelete]: 0,

    [AuditLogEvent.GuildUpdate]: 0,

    [AuditLogEvent.WebhookCreate]: 0,
    [AuditLogEvent.WebhookUpdate]: 0,
    [AuditLogEvent.WebhookDelete]: 0,

    [AuditLogEvent.BotAdd]: 0,
    [AuditLogEvent.IntegrationCreate]: 0,
    [AuditLogEvent.IntegrationUpdate]: 0,
    [AuditLogEvent.IntegrationDelete]: 0,

    [AuditLogEvent.EmojiCreate]: 50,
    [AuditLogEvent.EmojiUpdate]: 50,
    [AuditLogEvent.EmojiDelete]: 50,

    [AuditLogEvent.InviteCreate]: 100,
    [AuditLogEvent.InviteUpdate]: 100,
    [AuditLogEvent.InviteDelete]: 100,
  };

  // Timeframe for counting actions in milliseconds
  private readonly actionTimeFrame = 60000;

  getAuditLogEvent(actionType: string): AuditLogEvent | undefined {
    switch (actionType) {
      // Channel events
      case CHANNEL_ACTION_TYPE.CHANNEL_CREATE:
        return AuditLogEvent.ChannelCreate;
      case CHANNEL_ACTION_TYPE.CHANNEL_DELETE:
        return AuditLogEvent.ChannelDelete;
      case CHANNEL_ACTION_TYPE.CHANNEL_UPDATE:
        return AuditLogEvent.ChannelUpdate;

      // Member events
      case CHANNEL_ACTION_TYPE.MEMBER_KICK:
        return AuditLogEvent.MemberKick;
      case CHANNEL_ACTION_TYPE.MEMBER_BAN_ADD:
        return AuditLogEvent.MemberBanAdd;
      case CHANNEL_ACTION_TYPE.MEMBER_BAN_REMOVE:
        return AuditLogEvent.MemberBanRemove;
      case CHANNEL_ACTION_TYPE.MEMBER_PRUNE:
        return AuditLogEvent.MemberPrune;
      case CHANNEL_ACTION_TYPE.MEMBER_UPDATE:
        return AuditLogEvent.MemberUpdate;
      case CHANNEL_ACTION_TYPE.MEMBER_ROLE_UPDATE:
        return AuditLogEvent.MemberRoleUpdate;

      // Role events
      case CHANNEL_ACTION_TYPE.ROLE_CREATE:
        return AuditLogEvent.RoleCreate;
      case CHANNEL_ACTION_TYPE.ROLE_UPDATE:
        return AuditLogEvent.RoleUpdate;
      case CHANNEL_ACTION_TYPE.ROLE_DELETE:
        return AuditLogEvent.RoleDelete;

      // Server events
      case CHANNEL_ACTION_TYPE.GUILD_UPDATE:
        return AuditLogEvent.GuildUpdate;

      // Webhook events
      case CHANNEL_ACTION_TYPE.WEBHOOK_CREATE:
        return AuditLogEvent.WebhookCreate;
      case CHANNEL_ACTION_TYPE.WEBHOOK_UPDATE:
        return AuditLogEvent.WebhookUpdate;
      case CHANNEL_ACTION_TYPE.WEBHOOK_DELETE:
        return AuditLogEvent.WebhookDelete;

      // Bot or integration events
      case CHANNEL_ACTION_TYPE.BOT_ADD:
        return AuditLogEvent.BotAdd;
      case CHANNEL_ACTION_TYPE.INTEGRATION_CREATE:
        return AuditLogEvent.IntegrationCreate;
      case CHANNEL_ACTION_TYPE.INTEGRATION_UPDATE:
        return AuditLogEvent.IntegrationUpdate;
      case CHANNEL_ACTION_TYPE.INTEGRATION_DELETE:
        return AuditLogEvent.IntegrationDelete;

      // Emoji events
      case CHANNEL_ACTION_TYPE.EMOJI_CREATE:
        return AuditLogEvent.EmojiCreate;
      case CHANNEL_ACTION_TYPE.EMOJI_UPDATE:
        return AuditLogEvent.EmojiUpdate;
      case CHANNEL_ACTION_TYPE.EMOJI_DELETE:
        return AuditLogEvent.EmojiDelete;

      // Other settings
      case CHANNEL_ACTION_TYPE.INVITE_CREATE:
        return AuditLogEvent.InviteCreate;
      case CHANNEL_ACTION_TYPE.INVITE_UPDATE:
        return AuditLogEvent.InviteUpdate;
      case CHANNEL_ACTION_TYPE.INVITE_DELETE:
        return AuditLogEvent.InviteDelete;

      default:
        return undefined;
    }
  }

  async monitorActions(guild: Guild, actionTypeString: string, client: Client) {
    this.logger.verbose(
      `Monitoring action ${actionTypeString} for guild ${guild.name}.`,
    );
    const actionType = this.getAuditLogEvent(actionTypeString);
    if (!actionType) return;

    const identifier = `${guild.id}:${actionType}`;
    const count = await this.incrementActionCount(identifier);

    const threshold = this.actionThresholds[actionType];

    if (count >= threshold) {
      this.logger.warn(
        `High volume of ${actionTypeString} detected in guild ${guild.name}`,
      );
      await this.handlePotentialNukes(
        guild,
        client,
        actionType,
        actionTypeString,
      );
    }
  }
  private async handlePotentialNukes(
    guild: Guild,
    client: Client,
    actionType: AuditLogEvent,
    actionTypeString: string,
  ) {
    try {
      const auditLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: actionType,
      });
      const now = Date.now();
      // Filter logs to get recent actions within a short timeframe
      const recentLogs = auditLogs.entries.filter(
        (entry) => now - entry.createdTimestamp < this.actionTimeFrame,
      );
      if (recentLogs.size === 0) {
        // this.logger.verbose(
        //   `No recent ${actionTypeString} :[${actionType}] actions found in guild ${guild.name}.`,
        // );
        return;
      }
      // Group actions by executor
      const actionsByUser = new Map<string, number>();
      recentLogs.forEach((log) => {
        const executorId = log.executor?.id;
        if (executorId) {
          const count = (actionsByUser.get(executorId) || 0) + 1;
          actionsByUser.set(executorId, count);
        }
      });

      for (const [userId, count] of actionsByUser) {
        const threshold = this.actionThresholds[actionType];
        if (count < threshold) continue;
        const user = await guild.members.fetch(userId);
        this.logger.warn(
          `Nuke attempt detected: ${user.user.tag} (${userId}) performed ${count} ${actionType} actions in ${guild.name}.`,
        );

        const guildSecurityDetails =
          await this.serverRepository.getServerSecurityDetails(guild.id);
        if (
          guildSecurityDetails.whitelistedUserIds.includes(userId) ||
          guildSecurityDetails.secondOwners.includes(userId) ||
          guildSecurityDetails.owner === userId ||
          userId === client.user.id
        ) {
          return;
        }
        this.logger.log(
          `Action taken against ${user.user.tag} (${userId}) for potential nuke attempt in ${guild.name}.`,
        );
        // !PUNISHMENT
        await this.applyPunishment(user, actionType, count, guild, client);
      }
    } catch (error) {
      this.logger.error(
        `Error handling potential nukes in guild ${guild.name}: ${error}`,
      );
    }
  }

  async applyPunishment(
    user: GuildMember,
    actionType: AuditLogEvent,
    count: number,
    guild: Guild,
    client: Client,
  ) {
    this.logger.log(
      `Applying punishment to ${user.user.tag} for ${actionType} actions in guild ${guild.name}.`,
    );
    // Notify server admins through the server's log channel
    const alertMessage =
      `🚨 **Nuke Attempt Detected** 🚨\n` +
      `User ${user.user.tag} (${user.id}) performed ${count} ${actionType} actions in a short time.\n` +
      `Immediate action required!`;
    const serverLogChannels =
      await this.serverLogChannelRepository.findOneByServerId(guild.id);
    await this.punishmentService.jailUser(
      guild.id,
      user.id,
      client,
      serverLogChannels.jailLogChannel.id,
      alertMessage,
    );
  }

  async handlePotentialNuke(guild, actionTypeString: string, client: Client) {
    try {
      const identifier = `${guild.id}:${actionTypeString}`;
      const now = Date.now();
      this.incrementActionCount(identifier);

      // Ensure the guild is available and the bot has necessary permissions
      if (!guild) {
        this.logger.error(`Guild ${guild.id} is not available.`);
        return;
      }

      const botMember = await guild.guild.members.fetch(client.user.id);
      if (!botMember.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
        this.logger.warn(
          `Bot does not have ViewAuditLog permission in guild ${guild.id}.`,
        );
        const embed = this.serverLoggerService.logEmbed(
          'Anti Nuke Triggered',
          `Bot does not have ViewAuditLog permission in guild ${guild.id}.`,
          [],
          new Date(),
        );
        await this.serverLoggerService.sendLogMessage(
          guild,
          LogChannelType.MODERATOR,
          '',
          embed,
        );
        return;
      }

      const actionType = this.getAuditLogEvent(actionTypeString);

      if (actionType) {
        // Fetch recent audit logs to determine the cause and perpetrator
        const auditLogs = await guild.guild.fetchAuditLogs({
          limit: 1,
          type: actionType,
        });
        const latestLog: GuildAuditLogsEntry = auditLogs.entries.first();

        if (latestLog && now - latestLog.createdTimestamp < 60000) {
          // Check actions within the last minute
          const executor = latestLog.executor;
          if (executor) {
            // Log potential nuke activity
            this.logger.warn(
              `Potential nuke activity detected in guild ${guild.name} by ${executor.tag}.`,
            );

            // Jail the executor for nuke attempt
            try {
              this.serverLogChannels =
                await this.serverLogChannelRepository.findOneByServerId(
                  guild.id,
                );
              await this.punishmentService.jailUser(
                guild.id,
                executor.id,
                client,
                this.serverLogChannels.id,
                'Suspected nuke attempt',
              );
              this.logger.log(
                `Jailed ${executor.tag} for suspected nuke attempt in guild ${guild.name}.`,
              );

              // TODO: Revert the changes made by the malicious user
            } catch (error) {
              this.logger.error(
                `Failed to jail ${executor.tag} in guild ${guild.name}: ${error}`,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error fetching audit logs in guild ${guild.id}: ${error}`,
      );
    }
  }

  async incrementActionCount(identifier: string) {
    try {
      const newCount = await this.redisService.incrementWithExpiry(
        identifier,
        Math.floor(this.actionTimeFrame / 1000),
      );
      return newCount;
    } catch (error) {
      this.logger.error(
        `Failed to increment action count for identifier ${identifier}`,
        error,
      );
    }
  }

  async monitorMassMemberKicks(guild: Guild, client: Client) {
    const auditLogs: GuildAuditLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberKick,
    });
    auditLogs.entries.first().executor;
    const recentKicks = auditLogs.entries.filter(
      (entry) => Date.now() - entry.createdTimestamp < 60000,
    ); // Last minute

    if (recentKicks.size > 5) {
      // Threshold, e.g., more than 5 kicks in a minute
      this.logger.warn(
        `High volume of member kicks detected in guild ${guild.name}.`,
      );

      const usersToJail = new Set();

      auditLogs.entries.forEach((entry) => {
        usersToJail.add(entry.executorId);
      });
      for (const userToJail of usersToJail) {
        await this.punishmentService.jailUser(
          guild.id,
          userToJail as string,
          client,
          this.serverLogChannels.id,
          'Suspected nuke attempt',
        );
      }
    }
  }
}
