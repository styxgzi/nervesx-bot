// anti-raid.command.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  PermissionFlagsBits,
  GuildMemberRoleManager,
  Role,
  ChannelType,
  GuildVerificationLevel,
  Client,
  Guild,
  GuildMember,
} from 'discord.js';
import { AccountService } from 'lib/classes/AccountService';
import { ActionService } from 'lib/classes/ActionService';
import { DetectionService } from 'lib/classes/DetectionService';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { RedisService } from 'lib/services/Redis.service';
import { PunishmentService } from 'lib/classes/Punishment';

@Injectable()
export class AntiRaidCommand {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly detectionService: DetectionService,
    private readonly actionService: ActionService,
    private readonly redisService: RedisService,
    private readonly accountService: AccountService,
    private readonly punishmentService: PunishmentService,
  ) {}
  private readonly logger = new Logger(AntiRaidCommand.name);
  private joinThreshold = 2; // Number of joins in a short period to trigger detection
  private revertDelay = 300; // Time in seconds to revert the anti-raid measures

  async activate(interaction: CommandInteraction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'This command can only be used in a guild.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Set the guild verification level to the highest
      await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh);

      // Create or find a 'Muted' role for new members
      let mutedRole = guild.roles.cache.find((role) => role.name === 'Muted');

      // TODO: Revisit this logic
      // Mute new members
      guild.members
        .fetch()
        .then(async (member) => {
          member.forEach(async (member) => {
            if (member.id === interaction.client.user.id) return;
            if (member.permissions.has(PermissionFlagsBits.Administrator))
              return;
            if (
              member.joinedTimestamp &&
              Date.now() - member.joinedTimestamp < 86400000 // Joined in the last 24 hours
            ) {
              // Joined in the last 24 hours
              console.log(member.joinedTimestamp);
              await member.roles
                .add(mutedRole as Role)
                .catch((error) =>
                  console.error(`Failed to mute ${member.user.tag}`, error),
                );
            }
          });
        })
        .catch((error) => console.error(`Failed to fetch member`, error));

      // Lockdown the server - disabling @everyone from writing messages
      guild.channels.cache.forEach(async (channel) => {
        if (channel.type === ChannelType.GuildText) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false,
          });
        }
      });

      await interaction.reply({
        content: 'Anti-raid measures activated! Server is in lockdown mode.',
        ephemeral: true,
      });
      await this.serverLoggerService.sendLogMessage(
        interaction.guild,
        LogChannelType.MODERATOR,
        'Anti-raid measures activated! Server is in lockdown mode.',
      );
    } catch (error) {
      console.error('Error activating anti-raid measures:', error);
      await interaction.reply({
        content: 'Failed to activate anti-raid measures.',
        ephemeral: true,
      });
    }
  }

  async deactivate(interaction: CommandInteraction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'This command can only be used in a guild.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Reset the guild verification level
      await guild.setVerificationLevel(GuildVerificationLevel.Low);

      // Find the 'Muted' role
      const mutedRole = guild.roles.cache.find((role) => role.name === 'Muted');
      if (mutedRole) {
        // Remove the 'Muted' role from all members
        guild.members.cache.forEach(async (member) => {
          if (member.roles.cache.has(mutedRole.id)) {
            await member.roles.remove(mutedRole);
          }
        });
      }

      // Restore permissions for @everyone
      guild.channels.cache.forEach(async (channel) => {
        if (channel.type === ChannelType.GuildText) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: null,
          });
        }
      });

      await interaction.reply({
        content: 'Anti-raid measures have been rolled back.',
        ephemeral: true,
      });
      await this.serverLoggerService.sendLogMessage(
        interaction.guild,
        LogChannelType.MODERATOR,
        'Anti-raid measures have been rolled back.',
      );
    } catch (error) {
      console.error('Error rolling back anti-raid measures:', error);
      await interaction.reply({
        content: 'Failed to roll back anti-raid measures.',
        ephemeral: true,
      });
    }
  }

  async watch(member: GuildMember): Promise<void> {
    const guildId = member.guild.id;
    // Increment and get the number of joins in the last minute
    const joinsCount = await this.redisService.incrementWithExpiry(
      `joins:${guildId}`,
      60,
    );

    // Check for mass joins
    if (joinsCount > this.joinThreshold) {
      const risk = this.accountService.assessAccountRisk(member);
      if (risk > 5) {
        // Consider high risk for immediate action
        this.actionService.activateSlowMode(member.guild, 10); // TODO: Make this configurable from UI
        this.actionService.setGuildVerificationToVeryHigh(member.guild);
        this.punishmentService.muteMember(member);
        console.log(
          `Anti-raid measures activated in guild ${member.guild.name} due to mass joins.`,
        );

        // Schedule the reversion of anti-raid measures
        setTimeout(async () => {
          await this.actionService.deactivateSlowMode(member.guild);
          await this.actionService.resetGuildVerificationLevel(
            member.guild,
            GuildVerificationLevel.Low,
          );
          console.log(
            `Anti-raid measures reverted in guild ${member.guild.name}.`,
          );
        }, this.revertDelay * 1000); // Convert seconds to milliseconds
      }
    }
  }
}
