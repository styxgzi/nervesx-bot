// detection.service.ts
import { Injectable } from '@nestjs/common';
import { Client, Guild } from 'discord.js';
import { RedisService } from 'lib/services/Redis.service';
import { AccountService } from './AccountService';

@Injectable()
export class DetectionService {
  private joinRateLimit = 10; // Number of joins to consider for mass join detection

  constructor(
    private readonly redisService: RedisService,
    private readonly accountService: AccountService,
  ) {}

  async analyzeMassJoin(guild: Guild): Promise<void> {
    const members = await guild.members.fetch();
    const recentJoins = members.filter((member) => {
      const joinTime = new Date(member.joinedTimestamp).getTime();
      const now = Date.now();
      return now - joinTime < 60000; // 1 minute window
    });

    if (recentJoins.size >= this.joinRateLimit) {
      // Consider as a potential raid
      recentJoins.forEach((member) => {
        const risk = this.accountService.assessAccountRisk(member);
        if (risk > 5) {
          // Arbitrary risk threshold
          // Store to Redis for further analysis or immediate action
          this.redisService.set(
            `suspectedRaidMember:${member.id}`,
            risk,
            60 * 60,
          ); // 1 hour expiry
        }
      });
    }
  }
}
