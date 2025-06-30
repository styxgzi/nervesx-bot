// account.service.ts
import { Injectable } from '@nestjs/common';
import { GuildMember } from 'discord.js';

@Injectable()
export class AccountService {
  private accountAgeThresholds = {
    highRisk: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    mediumRisk: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };

  constructor() {}

  assessAccountRisk(member: GuildMember): number {
    const accountAge = Date.now() - member.user.createdTimestamp;
    if (accountAge < this.accountAgeThresholds.highRisk) return 10;
    if (accountAge < this.accountAgeThresholds.mediumRisk) return 5;
    return 1; // Older accounts are less risky
  }
}
