import { Injectable } from '@nestjs/common';
import {
  ChannelType,
  EmbedBuilder,
  Guild,
  PermissionsBitField,
} from 'discord.js';

@Injectable()
class SecurityRisk {
  level: string;
  description: string;
  remediation: string;

  constructor(level: string, description: string, remediation: string) {
    this.level = level;
    this.description = description;
    this.remediation = remediation;
  }
}

export class SecurityAnalyzer {
  private guild: Guild;

  constructor(guild: Guild) {
    this.guild = guild;
  }

  async analyzePermissions(guild: Guild): Promise<SecurityRisk[]> {
    const risks: SecurityRisk[] = [];
    if (!this.guild) this.guild = guild;
    const roles = this.guild.roles.cache.filter((role) =>
      role.permissions.has(PermissionsBitField.Flags.Administrator),
    );

    for (const role of roles.values()) {
      risks.push(
        new SecurityRisk(
          'High',
          `Role "${role}" has Administrator permission.`,
          `Consider removing Administrator permission from "${role}" role.`,
        ),
      );
    }

    // Add more checks as needed
    return risks;
  }

  async analyzePublicChannels(guild: Guild): Promise<SecurityRisk[]> {
    const risks: SecurityRisk[] = [];
    if (!this.guild) this.guild = guild;
    const channels = this.guild.channels.cache.filter(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel
          .permissionsFor(this.guild.roles.everyone)
          .has(PermissionsBitField.Flags.ViewChannel),
    );

    for (const channel of channels.values()) {
      risks.push(
        new SecurityRisk(
          'Medium',
          `Channel "${channel}" is public.`,
          `Consider restricting read access to "${channel}" channel.`,
        ),
      );
    }

    return risks;
  }

  async generateReport(): Promise<SecurityRisk[]> {
    const permissionRisks = await this.analyzePermissions(this.guild);
    const channelRisks = await this.analyzePublicChannels(this.guild);
    // Combine risks from different analysis methods
    return [...permissionRisks, ...channelRisks].sort((a, b) =>
      a.level.localeCompare(b.level),
    );
  }

  async generatePermissionsReport(guild: Guild): Promise<EmbedBuilder> {
    const risks = await this.analyzePermissions(guild);
    const embed = new EmbedBuilder()
      .setColor('#FF5733')
      .setTitle('Permissions Risks Report')
      .setTimestamp();

    risks.forEach((risk) => {
      embed.addFields({
        name: `${risk.level} Risk`,
        value: `**Issue**: ${risk.description}\n**Remediation**: ${risk.remediation}`,
        inline: false,
      });
    });

    return embed;
  }

  async generateChannelReport(guild: Guild): Promise<EmbedBuilder> {
    const risks = await this.analyzePublicChannels(guild);
    if (!this.guild) this.guild = guild;
    const embed = new EmbedBuilder()
      .setColor('#FF5733')
      .setTitle('Channel Risks Report')
      .setTimestamp();

    risks.forEach((risk) => {
      embed.addFields({
        name: `${risk.level} Risk`,
        value: `**Issue**: ${risk.description}\n**Remediation**: ${risk.remediation}`,
        inline: false,
      });
    });

    return embed;
  }

  async generateCombinedReport(guild: Guild): Promise<EmbedBuilder> {
    const permissionRisks = await this.analyzePermissions(guild);
    const channelRisks = await this.analyzePublicChannels(guild);
    const embed = new EmbedBuilder()
      .setColor('#FF5733')
      .setTitle('Combined Security Risks Report')
      .setTimestamp();

    permissionRisks.concat(channelRisks).forEach((risk) => {
      embed.addFields({
        name: `${risk.level} Risk`,
        value: `**Issue**: ${risk.description}\n**Remediation**: ${risk.remediation}`,
        inline: false,
      });
    });

    return embed;
  }
}
