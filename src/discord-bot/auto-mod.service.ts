import { Injectable } from '@nestjs/common';
import { AuditLogEvent, GuildMember } from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { BOT_ROLES } from 'src/constants/strings';

@Injectable()
export class AutoModService {
  private botAddQueue = [];
  private processing = false;
  constructor(private readonly securityService: SecurityService) {}

  // TODO: Revisit this logic
  async processQueue() {
    while (this.botAddQueue.length > 0) {
      const member = this.botAddQueue.shift();
      await this.handleBot(member);
      await this.delay(1000); // Delay to prevent hitting rate limits
      this.processing = false;
    }
  }

  async handleBot(member: GuildMember) {
    const jailRoleName = BOT_ROLES.JAIL_ROLE_NAME;
    if (member.user.bot) {
      const isBotWhitelisted = await this.securityService.isUserWhitelisted(
        member.id,
        member.guild.id,
      );
      // Check if the bot is whitelisted
      if (!isBotWhitelisted) {
        // Ban the non-whitelisted bot
        await member.ban({ reason: 'Non-whitelisted bot' });

        // Find who added the bot
        const auditLogs = await member.guild.fetchAuditLogs({
          type: AuditLogEvent.BotAdd,
        });
        const botAddLog = auditLogs.entries.first();
        if (botAddLog) {
          const responsibleUserId = botAddLog.executor.id;
          //   TODO: Fix this logic to handle 1000s of request.
          if (member.guild.ownerId == responsibleUserId) return;
          const userMember = await member.guild.members
            .fetch(responsibleUserId)
            .catch(console.error);
          const isUserWhiteListed =
            await this.securityService.isUserWhitelisted(
              responsibleUserId,
              member.guild.id,
            );
          if (userMember && isUserWhiteListed) {
            const jailRole = member.guild.roles.cache.find(
              (role) => role.name === jailRoleName,
            );
            if (jailRole) {
              await userMember.roles.set([jailRole.id]); // Removes all roles and assigns jail role
            } else {
              console.log(`Jail role '${jailRoleName}' not found`);
            }
          }
        }
      }
    }
  }

  async handleBotAdditionToServer(member: GuildMember) {
    try {
      // Add to queue
      this.botAddQueue.push(member);

      // Start processing if not already doing so
      if (!this.processing) {
        this.processing = true;
        this.processQueue();
      }
    } catch (error) {
      console.error(`Error occurred`, error);
    }
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
