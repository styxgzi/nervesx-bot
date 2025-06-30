// commands.service.ts
import { Injectable } from '@nestjs/common';
import {
  ButtonInteraction,
  Client,
  CommandInteraction,
  EmbedBuilder,
  ModalSubmitInteraction,
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
export class ModalInteractionService {
  constructor(
    private readonly helperService: HelperService,
    private readonly serverRepository: ServerRepository,
    private readonly autoVoiceChannelService: AutoVoiceChannelService,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';
  async executeCommand(interaction: ModalSubmitInteraction, client: Client) {
    try {
      if (!interaction.isModalSubmit()) return;
      const { customId, user } = interaction;

      switch (customId) {
        case this.stagingPrefix + BUTTON_INTERACTIONS.CREATE_AVC:
          await this.autoVoiceChannelService.handleInteraction(interaction);
          break;
      }
    } catch (error) {
      console.error(error);
      interaction.reply(`Error when executing ${interaction.customId}`);
    }
  }
}
