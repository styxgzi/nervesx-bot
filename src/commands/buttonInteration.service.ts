// commands.service.ts
import { Injectable } from '@nestjs/common';
import {
  ButtonInteraction,
  Client,
  CommandInteraction,
  EmbedBuilder,
  SelectMenuInteraction,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { ServerRepository } from 'lib/repository/server.repository';
import { HelpCommandService } from './help.command';
import { AfkService } from './features/afk.command';
import { BUTTON_INTERACTIONS } from 'src/constants/strings';
import { AutoVoiceChannelService } from './features/auto-voice.command';
// Import other command services...

@Injectable()
export class ButtonInteractionService {
  constructor(
    private readonly helperService: HelperService,
    private readonly afkService: AfkService,
    private readonly serverRepository: ServerRepository,
    private readonly autoVoiceChannelService: AutoVoiceChannelService,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';
  async executeCommand(interaction: ButtonInteraction, client: Client) {
    try {
      if (!interaction.isButton()) return;
      const prefix =
        (await this.serverRepository.getServerPrefix(interaction.guildId)) ||
        '!';
      const { customId, user } = interaction;
      const customData = JSON.parse(customId);

      const action = customData.action;
      const reason = customData.data.reason;
      const discordId = customData.data.userId;
      const guildId = interaction.guild.id;

      switch (action) {
        case this.stagingPrefix + 'server_afk':
          // Logic to set server-specific AFK
          await this.afkService.setAfk(discordId, reason, guildId);
          await interaction.update({
            content: 'You are now AFK in this server.',
            components: [],
          });
          break;
        case this.stagingPrefix + 'global_afk':
          // Logic to set global AFK
          await this.afkService.setAfk(discordId, reason, guildId, true);
          await interaction.update({
            content: 'You are now globally AFK.',
            components: [],
          });
          break;
        case this.stagingPrefix + 'cancel_afk':
          // Cancel the AFK status setting
          await interaction.update({
            content: 'AFK status setting canceled.',
            components: [],
          });
          break;
        case this.stagingPrefix + BUTTON_INTERACTIONS.CREATE_AVC:
          await this.autoVoiceChannelService.handleInteraction(
            interaction,
            action,
          );
          break;
        default:
        // Handle unknown button
        // await interaction.reply({
        //   content: 'Unknown option selected.',
        //   ephemeral: true,
        // });
        // break;
      }
    } catch (error) {
      console.error(error);
      interaction.reply(`Error when executing ${interaction.customId}`);
    }
  }
}
