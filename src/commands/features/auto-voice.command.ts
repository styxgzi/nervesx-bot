import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  VoiceState,
  PermissionFlagsBits,
  ChannelType,
  VoiceChannel,
  CommandInteraction,
  Message,
  GuildMember,
  Guild,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SelectMenuInteraction,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';
import {
  VoiceChannelTemplate,
  VoiceChannelTemplateDocument,
} from 'lib/models/voice-channel.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VoiceChannelOwnersService } from 'lib/classes/VoiceChannelOwners';
import { SecurityService } from 'lib/classes/Security';
import { HelperService } from 'lib/classes/Helper';
import {
  BUTTON_INTERACTIONS,
  CHANNEL_TYPE_INPUT,
  MODAL_INTERACTIONS,
  SELECT_INTERACTIONS,
  TEXT_INPUT_INTERACTIONS,
} from 'src/constants/strings';
import { RedisService } from 'lib/services/Redis.service';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class AutoVoiceChannelService {
  private readonly logger = new Logger(AutoVoiceChannelService.name);
  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';

  constructor(
    @InjectModel(VoiceChannelTemplate.name)
    private voiceChannelTemplateModel: Model<VoiceChannelTemplateDocument>,
    private voiceChannelOwners: VoiceChannelOwnersService,
    private securityService: SecurityService,
    private helperService: HelperService,
    private redisService: RedisService,
    private serverRepository: ServerRepository,
  ) {}

  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member;
    const guildId = newState.guild.id;

    // Handle empty channel deletion and ownership transfer
    if (oldState.channel && oldState.channel.members.size === 0) {
      const oldStateChannelTemplate =
        await this.voiceChannelTemplateModel.findOne({
          guildId,
          generatedChannels: { $in: [oldState.channelId] },
        });

      if (oldStateChannelTemplate) {
        try {
          await oldState.channel.delete();

          // Update or insert a new template for the specified channel in the guild
          await this.voiceChannelTemplateModel.updateOne(
            { guildId, generatedChannels: { $in: [oldState.channelId] } },
            { $pull: { generatedChannels: oldState.channelId } },
            { upsert: true },
          );

          this.voiceChannelOwners.removeChannel(oldState.channelId);
        } catch (error) {
          console.error('Error deleting voice channel:', error);
        }
      }
    }

    // Find all templates for the guild
    const templates = await this.voiceChannelTemplateModel
      .find({ guildId })
      .exec();
    const template = templates.find(
      (t) => t.templateChannelId === newState.channelId,
    );

    if (!template || !member) return;

    if (
      newState.channelId === template.templateChannelId &&
      oldState.channelId !== template.templateChannelId
    ) {
      try {
        // Creating a new channel based on the template
        const templateChannel = (await newState.guild.channels.fetch(
          template.templateChannelId,
        )) as VoiceChannel;
        const count = 0;
        const channelName = this.processTemplate(
          template.channelNameTemplate,
          member,
          count,
        );
        const newChannel = await newState.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: templateChannel.parentId,
          permissionOverwrites: [
            ...templateChannel.permissionOverwrites.cache.values(),
          ],
          userLimit: templateChannel.userLimit,
        });

        // Update or insert a new template for the specified channel in the guild
        await this.voiceChannelTemplateModel.updateOne(
          { guildId, templateChannelId: templateChannel },
          { $push: { generatedChannels: newChannel.id } },
          { upsert: true },
        );

        this.voiceChannelOwners.setOwner(newChannel.id, member.id); // Set the member as the owner
        await newState.setChannel(newChannel);
      } catch (error) {
        console.error('Error creating voice channel:', error);
      }
    }

    if (oldState.channel) {
      const ownerId = await this.voiceChannelOwners.getOwner(
        oldState.channelId,
      );
      if (ownerId === member.id) {
        const newOwner = oldState.channel.members.first();
        if (newOwner) {
          this.voiceChannelOwners.setOwner(oldState.channelId, newOwner.id);
        }
      }
    }
  }

  async updateChannelOwner(message: Message): Promise<void> {
    const owner = message.member; // Use message.member to get the GuildMember object
    if (!owner || !owner.voice.channel) {
      // If the member is not in a voice channel, send a reply and exit the function
      return;
    }

    // Check if the voice channel is a regular VoiceChannel
    if (owner.voice.channel.type !== ChannelType.GuildVoice) {
      await message.reply(
        'This command only works in voice channels, not in stage channels.',
      );
      return;
    }

    // Now we can safely cast it to VoiceChannel since we checked its type
    const voiceChannel = owner.voice.channel as VoiceChannel;
    const ownerId = await this.voiceChannelOwners.getOwner(
      owner.voice.channel.id,
    );
    const embed = new EmbedBuilder()
      .setTitle('Voice Channel Ownership Update')
      .setDescription(`<@${ownerId}> is the owner of ${voiceChannel.name}.`)
      .setColor(0x00ae86)
      .setFooter({ text: 'Ownership automatically assigned by the bot.' });

    // Reply to the message with the embed
    await message.reply({ embeds: [embed] });
  }

  async isChannelLocked(channelId: string): Promise<boolean> {
    try {
      const lockStatus = await this.redisService.get<boolean>(
        `channel:${channelId}:locked`,
      );
      return lockStatus || false;
    } catch (error) {
      this.logger.error(
        `Error checking lock status for channel ${channelId}`,
        error,
      );
      return false;
    }
  }

  async isMemberAllowed(channelId: string, memberId: string): Promise<boolean> {
    try {
      const allowed = await this.redisService.get<boolean>(
        `channel:${channelId}:member:${memberId}`,
      );
      return allowed || false;
    } catch (error) {
      this.logger.error(
        `Error checking member permission for channel ${channelId}`,
        error,
      );
      return false;
    }
  }

  async toggleChannelLock(channel: VoiceChannel): Promise<void> {
    const channelId = channel.id;
    try {
      const isLocked = await this.isChannelLocked(channelId);
      await this.redisService.set(`channel:${channelId}:locked`, !isLocked);
      this.logger.log(`Channel ${channelId} lock status set to ${!isLocked}`);
    } catch (error) {
      this.logger.error(
        `Failed to toggle lock status for channel ${channelId}`,
        error,
      );
    }
  }

  async addMemberToAllowedList(
    channelId: string,
    memberId: string,
  ): Promise<void> {
    try {
      await this.redisService.set(
        `channel:${channelId}:member:${memberId}`,
        true,
      );
      this.logger.log(
        `Added member ${memberId} to allowed list of channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add member ${memberId} to allowed list of channel ${channelId}`,
        error,
      );
    }
  }

  async removeMemberFromAllowedList(
    channelId: string,
    memberId: string,
  ): Promise<void> {
    try {
      await this.redisService.del(`channel:${channelId}:member:${memberId}`);
      this.logger.log(
        `Removed member ${memberId} from allowed list of channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove member ${memberId} from allowed list of channel ${channelId}`,
        error,
      );
    }
  }
  // ============================

  async createChannelWithTemplate(
    guild: Guild,
    createdBy: string,
    channelNameInput: string,
    channelLimit: number,
    channelPrivacy: string,
  ): Promise<void> {
    try {
      const channelNameTemplate = "{username}'s-vc";
      const channelName = channelNameInput || 'NervesX VC Generator';

      // Create a new voice channel in the Discord guild
      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        userLimit: channelLimit,
        // Additional channel settings here if needed
        permissionOverwrites:
          channelPrivacy === CHANNEL_TYPE_INPUT.PRIVATE
            ? [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionsBitField.Flags.ViewChannel],
                },
              ]
            : [],
      });

      // After successfully creating the channel, save its template settings in the database
      const newTemplate = new this.voiceChannelTemplateModel({
        guildId: guild.id,
        templateName: channelNameTemplate, // Assuming this is the desired template name
        templateChannelId: newChannel.id, // Use the newly created channel's ID
        createdBy,
        channelNameTemplate, // Save the template for naming future channels
      });

      await newTemplate.save();
      this.logger.log(
        `Channel "${channelName}" and its template created successfully.`,
      );
    } catch (error) {
      this.logger.error('Error creating channel and template:', error);
    }
  }

  async setChannelNameTemplate(
    message: Message,
    args: string[],
  ): Promise<void> {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply(
        "You don't have the required permissions to set the channel name template.",
      );
      return;
    }

    const channelId = args.shift(); // The first argument is the channel ID
    const template = args.join(' '); // The rest of the arguments form the template

    const guildId = message.guild?.id;

    // Validate the channel ID
    const channel = message.guild?.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await message.reply(
        'The provided ID does not correspond to a valid voice channel in this guild.',
      );
      return;
    }

    // Define allowed placeholders in the template
    const allowedPlaceholders = [
      '{username}',
      '{nickname}',
      '{date}',
      '{time}',
      '{guildname}',
    ];

    // Check if the template only contains allowed placeholders
    const isTemplateValid = allowedPlaceholders.some((placeholder) =>
      template.includes(placeholder),
    );

    if (!channelId) {
      await message.reply('Please provide the channel ID.');
      return;
    }

    if (!template) {
      await message.reply('Please provide a template.');
      return;
    }

    // Notify the user if the template is invalid
    if (!isTemplateValid) {
      await message.reply(
        'The template is invalid. Please only use allowed placeholders: ' +
          allowedPlaceholders.join(', '),
      );
      return;
    }

    if (guildId) {
      try {
        // Update or insert a new template for the specified channel in the guild
        await this.voiceChannelTemplateModel.updateOne(
          { guildId, templateChannelId: channelId },
          { $set: { channelNameTemplate: template } },
          { upsert: true },
        );
        await message.reply(
          `Channel name template for channel"${channel}" updated to: "${template}"`,
        );
      } catch (error) {
        console.error('Failed to update channel name template:', error);
        await message.reply('Failed to update the channel name template.');
      }
    } else {
      await message.reply('Failed to identify the guild.');
    }
  }

  processTemplate(
    template: string,
    member: GuildMember,
    count: number,
  ): string {
    const replacements = {
      // "{count}": count.toString(),
      '{username}': member.user.username,
      '{nickname}': member.nickname || member.user.username,
      '{date}': new Date().toLocaleDateString(),
      '{time}': new Date().toLocaleTimeString(),
      '{guildname}': member.guild.name,
    };

    return Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), value),
      template,
    );
  }

  async execute(interaction: CommandInteraction) {}
  async executeText(message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used within a server.');
      return;
    }

    try {
      // Validate user permissions
      const hasPermission =
        await this.securityService.validateUserPermissions(message);
      if (!hasPermission) return;
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Create Your Custom Voice Channel')
        .setDescription('Customize your auto voice channel settings:');

      const createVcButton =
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(
              JSON.stringify({
                action: this.stagingPrefix + BUTTON_INTERACTIONS.CREATE_AVC,
                data: {
                  userId: message.author.id,
                },
              }),
            )
            .setLabel('Create Channel')
            .setStyle(ButtonStyle.Primary),
        );

      await message.reply({
        embeds: [embed],
        components: [createVcButton],
      });
    } catch (error) {
      this.logger.error(error);
      message.reply(`Error creating channel!`);
    }
  }

  async handleInteraction(
    interaction: ButtonInteraction | ModalSubmitInteraction,
    action: string = '',
  ): Promise<void> {
    if (interaction.isButton()) {
      if (action === this.stagingPrefix + BUTTON_INTERACTIONS.CREATE_AVC) {
        // Create a modal for channel name input
        const modal = new ModalBuilder()
          .setCustomId(this.stagingPrefix + BUTTON_INTERACTIONS.CREATE_AVC)
          .setTitle('Create Custom Voice Channel');

        const channelNameInput = new TextInputBuilder()
          .setCustomId(
            this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_NAME_INPUT,
          )
          .setLabel("What's the name of your channel?")
          .setStyle(TextInputStyle.Short);

        const channelLimitInput = new TextInputBuilder()
          .setCustomId(
            this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_LIMIT_INPUT,
          )
          .setLabel("What's the user limit for your channel?")
          .setStyle(TextInputStyle.Short);

        const channelPrivacyInput = new TextInputBuilder()
          .setCustomId(
            this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_PRIVACY_INPUT,
          )
          .setLabel("Is your channel 'public' or 'private'?")
          .setStyle(TextInputStyle.Short);

        const firstActionRow =
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            channelNameInput,
          );
        const secondActionRow =
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            channelLimitInput,
          );
        const thirdActionRow =
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            channelPrivacyInput,
          );

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        // Present the modal to the user
        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const roleIds = member.roles.cache.map((role) => role.id);

      const isOfficialAdmin = await this.securityService.isOfficialAdmin(
        interaction.user.id,
        interaction.guildId,
        roleIds,
      );
      if (!isOfficialAdmin) {
        await interaction.reply({
          content:
            'Hold up, sheriff! You need a bit more clout to create voice channel!',
          ephemeral: true,
        });
      }
      const channelName = interaction.fields.getTextInputValue(
        this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_NAME_INPUT,
      );
      let channelLimitValue = interaction.fields.getTextInputValue(
        this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_LIMIT_INPUT,
      );
      const channelPrivacy = interaction.fields
        .getTextInputValue(
          this.stagingPrefix + TEXT_INPUT_INTERACTIONS.CHANNEL_PRIVACY_INPUT,
        )
        .toLowerCase();

      let channelLimit = 0; // default value if input is not an integer
      if (channelLimitValue.trim() !== '') {
        channelLimit = parseInt(channelLimitValue, 10);
        if (isNaN(channelLimit) || channelLimit < 0 || channelLimit > 99) {
          // Reply with an error message if the input is not a valid number or out of range (Discord's limit)
          await interaction.reply({
            content: 'Please enter a valid user limit number between 0 and 99.',
            ephemeral: true,
          });
          return;
        }
      }

      if (
        channelPrivacy !== CHANNEL_TYPE_INPUT.PUBLIC &&
        channelPrivacy !== CHANNEL_TYPE_INPUT.PRIVATE
      ) {
        // Reply with an error message if privacy setting is not valid
        await interaction.reply({
          content: `Please specify if the channel is '${CHANNEL_TYPE_INPUT.PUBLIC}' or '${CHANNEL_TYPE_INPUT.PRIVATE}'.`,
          ephemeral: true,
        });
        return;
      }

      this.createChannelWithTemplate(
        interaction.guild,
        interaction.user.id,
        channelName,
        channelLimit,
        channelPrivacy,
      );

      await interaction.reply({
        content: `Voice channel "${channelName}" created with limit ${channelLimit} and privacy ${channelPrivacy}!`,
        ephemeral: true, // Set to true if you want the response visible only to the user
      });
    }
  }
}
