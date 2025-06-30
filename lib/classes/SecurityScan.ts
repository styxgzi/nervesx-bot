import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
} from 'discord.js';
import { SecurityAnalyzer } from './SecurityAnalyzer';
import { Injectable } from '@nestjs/common';
import { ServerRepository } from 'lib/repository/server.repository';
import { HelperService } from './Helper';

@Injectable()
export class SecurityScan {
  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
  ) {}
  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';
  async performSecurityScan(message: Message, guildId: string) {
    const guild = await message.client.guilds.fetch(guildId);
    const analyzer = new SecurityAnalyzer(guild);
    const securityReport = await analyzer.generateReport();

    const MAX_FIELDS_PER_EMBED = 25;
    const embeds: EmbedBuilder[] = [];

    const helpEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Security Scan Report')
      .setDescription(
        `Please select the section of the security report you want to view:`,
      )
      .setTimestamp();

    const selectMenu = this.getSelectMenu();
    message.reply({
      embeds: [helpEmbed],
      components: [selectMenu],
    });
  }

  getSelectMenu() {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId( this.stagingPrefix + 'select-security-report')
        .setPlaceholder('Select a category')
        .addOptions([
          {
            label: 'Permissions Risks',
            description: 'View detailed risks related to permissions',
            value: this.stagingPrefix + 'report-permissions',
          },
          {
            label: 'Channel Risks',
            description: 'View detailed risks related to channels',
            value: this.stagingPrefix + 'report-channels',
          },
          {
            label: 'Combined Report',
            description: 'View the combined security risks report',
            value: this.stagingPrefix + 'report-combined',
          },
        ]),
    );
  }
}
