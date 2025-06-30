// commands.service.ts
import { Injectable } from '@nestjs/common';
import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  SelectMenuInteraction,
} from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { ServerRepository } from 'lib/repository/server.repository';
import { HelpCommandService } from './help.command';
import { SecurityAnalyzer } from 'lib/classes/SecurityAnalyzer';
// Import other command services...

@Injectable()
export class BotInteractionService {
  constructor(
    private readonly helperService: HelperService,
    private readonly serverRepository: ServerRepository,
    private readonly helpCommandService: HelpCommandService,
    private readonly securityAnalyzer: SecurityAnalyzer,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';
  async executeCommand(interaction: SelectMenuInteraction, client: Client) {
    try {
      const prefix =
        (await this.serverRepository.getServerPrefix(interaction.guildId)) ||
        '!';
      const selectedCategory = interaction.values[0];

      const embed: EmbedOptions = {
        title: `🆘 Help: List of Commands`,
        author: {
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
          url: interaction.guild.iconURL(),
        },
        description: `Here are the commands you can use, organized by category.\n Use \`${prefix}command [args]\` to execute a command. Arguments enclosed in \`[ ]\` are required, while those in \`()\` are optional.`,
        fields: [
          {
            name: 'Server Prefix',
            value: `\`${prefix}\``,
          },
        ],
        color: '#00BFFF',
        timestamp: new Date(),
        thumbnailURL: interaction.guild.iconURL(),
      };
      let description = '';
      const selectMenu = this.helpCommandService.getSelectMenu();
      switch (selectedCategory) {
        case this.stagingPrefix + 'moderation':
          description =
            this.helpCommandService.getModerationCommandsDescription(prefix);
          embed.title = '🔨 Moderation Commands';
          embed.description = description;
          await interaction.update({
            embeds: [this.helperService.createEmbed(embed)],
            components: [selectMenu],
          });
          break;
        case this.stagingPrefix + 'utility':
          description =
            this.helpCommandService.getUtilityCommandsDescription(prefix);
          embed.title = '🛠️ Utility Commands';
          embed.description = description;
          await interaction.update({
            embeds: [this.helperService.createEmbed(embed)],
            components: [selectMenu],
          });
          break;
        case this.stagingPrefix + 'security':
          description =
            this.helpCommandService.getSecurityAndAutoModDescription(prefix);
          embed.title = '🔒 Security and Automod Commands';
          embed.description = description;
          await interaction.update({
            embeds: [this.helperService.createEmbed(embed)],
            components: [selectMenu],
          });
          break;
        case this.stagingPrefix + 'fun':
          description =
            this.helpCommandService.getFunAndInteractionDescription(prefix);
          embed.title = '🎈 Fun and Interaction Commands';
          embed.description = description;
          await interaction.update({
            embeds: [this.helperService.createEmbed(embed)],
            components: [selectMenu],
          });
          break;
        case this.stagingPrefix + 'help':
          description =
            this.helpCommandService.getHelpAndInformationDescription(prefix);
          embed.title = '🆘 Help and Information';
          embed.description = description;
          await interaction.update({
            embeds: [this.helperService.createEmbed(embed)],
            components: [selectMenu],
          });
          break;
        
        // =================================================================
        case this.stagingPrefix + 'report-permissions':
          const permissionsReport =
            await this.securityAnalyzer.generatePermissionsReport(
              interaction.guild,
            );
          return await interaction.channel.send({
            embeds: [permissionsReport],
          });

        case this.stagingPrefix + 'report-channels':
          const channelReport =
            await this.securityAnalyzer.generateChannelReport(
              interaction.guild,
            );
          return await interaction.channel.send({ embeds: [channelReport] });
        case this.stagingPrefix + 'report-combined':
          const combinedReport =
            await this.securityAnalyzer.generateCombinedReport(
              interaction.guild,
            );
          return await interaction.channel.send({ embeds: [combinedReport] });
      }
    } catch (error) {
      console.error(error);
      interaction.reply(`Error when executing ${interaction.customId}`);
    }
  }
}
