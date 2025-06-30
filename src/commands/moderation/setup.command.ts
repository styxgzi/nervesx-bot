import {
  ChannelType,
  CommandInteraction,
  Guild,
  Message,
  PermissionFlagsBits,
} from 'discord.js';
import { Injectable, Logger } from '@nestjs/common';
import {
  BOT_ROLES,
  BOT_TEXTS,
  LOG_CHANNELS,
  LOG_CHANNELS_SCHEMA_MAPPING,
} from 'src/constants/strings';
import * as Discord from 'discord.js';
import { ServerLogChannelRepository } from '../../../lib/repository/server-log-channel.repository';
import { AntiConfig, CreateServerType } from 'lib/models/server.schema';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class SetupCommandService {
  private readonly logger = new Logger(SetupCommandService.name);
  constructor(
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private serverRepository: ServerRepository,
  ) {}

  getSetupEmbed(fieldsHash: any[]) {
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Server Setup')
      .setDescription(
        'I am currently setting up and securing your server. Please stand by!',
      )
      .addFields(
        {
          name: '🛡️ Securing Server',
          value: 'Implementing security measures.',
        },
        {
          name: '📚 Organizing Channels',
          value: 'Structuring channels and roles.',
        },
        {
          name: '🤖 Configuring Bot',
          value: 'Fine-tuning bot functionalities.',
        },
        {
          name: '🎨 Customizing Settings',
          value: 'Applying custom settings.',
        },
      )
      .setAuthor({
        name: 'Your friendly neighborhood bot, NervesX',
      })
      .setTimestamp();
    for (const field of fieldsHash) {
      embed.addFields(field);
    }

    return embed;
  }

  async execute(interaction: CommandInteraction, client: Discord.Client) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply('This command can only be used in a guild.');
        return;
      }
      const embed = this.getSetupEmbed([]);

      await interaction.reply({ embeds: [embed] }); // Corrected this line
      embed.addFields({
        name: 'Setup Status',
        value: 'Completed ✅',
      });
      this.createRequireConfig(guild, client);

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.log('Error in setup command', error);
      await interaction.reply({
        content: 'An error occurred while setting up!',
        ephemeral: true,
      });
    }
  }
  async executeText(message: Message, args: string[], client: Discord.Client) {
    const embed = this.getSetupEmbed([]);
    try {
      const guild = message.guild;
      if (!guild) {
        await message.reply('This command can only be used in a guild.');
        return;
      }
      const botHasTopRole = await this.isBotTopRole(guild);
      if (!botHasTopRole) {
        await message.reply(
          'Bot does not have the top role in the server, which is required for setup.',
        );
      }
      message.reply({
        embeds: [embed],
      });


      // Check if the user has access to run setup
      const guildSecurityDetails =
        await this.serverRepository.getServerSecurityDetails(message.guildId);
      if (
        !guildSecurityDetails.whitelistedUserIds.includes(message.member.id) &&
        !guildSecurityDetails.secondOwners.includes(message.member.id) &&
        guildSecurityDetails.owner !== message.author.id
      ) {
        return message.reply('You are not whitelisted to jail the user.');
      }

      await this.createRequireConfig(guild, client);

      embed.addFields({
        name: 'Setup Status',
        value: 'Completed ✅',
      });
      await message.reply({
        embeds: [embed],
      });
    } catch (error) {
      embed.addFields({
        name: 'Setup Status',
        value: 'Failed ❌',
      });
      console.error('Error in setup command', error);
      await message.reply({
        embeds: [embed],
      });
    }
  }

  async createCategoryAndMoveChannels(
    guild: Guild,
    categoryName: string,
    channelNames: string[],
    allowedRoleIds: string[],
  ): Promise<void> {
    try {
      // Create or find the category
      let category = guild.channels.cache.find(
        (c) => c.name === categoryName && c.type === ChannelType.GuildCategory,
      ) as Discord.CategoryChannel;
      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.id, // Guild's default role (everyone)
              deny: [PermissionFlagsBits.ViewChannel],
            },
            ...allowedRoleIds.map((roleId) => ({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel],
            })),
          ],
        });
        this.logger.log(`Created new category: ${categoryName}`);
      }

      // Move channels to the category
      for (const channelName of channelNames) {
        const channel = guild.channels.cache.find(
          (c) => c.name === channelName,
        );
        if (!channel) {
          this.logger.warn(`Channel not found: ${channelName}`);
          continue;
        }

        if (
          channel instanceof Discord.TextChannel ||
          channel instanceof Discord.VoiceChannel
        ) {
          try {
            await channel.setParent(category);
            this.logger.log(
              `Moved channel ${channelName} to category ${categoryName}`,
            );
          } catch (error) {
            this.logger.error(
              `Error moving channel ${channelName} to category: ${error.message}`,
            );
          }
        } else {
          this.logger.warn(
            `Channel ${channelName} is not a text or voice channel and cannot be moved to a category.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in createCategoryAndMoveChannels: ${error.message}`,
      );
    }
  }

  async createPrivateChannels(guild: Guild, channelNames, allowedRoleIds) {
    const finalLogChannelIds = {};
    for (const channelName of channelNames) {
      if (
        !guild.channels.cache.find(
          (c) => c.name === channelName && c.type === ChannelType.GuildText,
        )
      ) {
        const logChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id, // Guild's default role (everyone)
              deny: [PermissionFlagsBits.ViewChannel],
            },
            ...allowedRoleIds.map((roleId) => ({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel],
            })),
          ],
        });
        finalLogChannelIds[channelName] = logChannel.id;
      }
    }
    const logChannels = guild.channels.cache.filter(
      (c) =>
        Object.keys(LOG_CHANNELS_SCHEMA_MAPPING).includes(c.name) &&
        c.type === ChannelType.GuildText,
    );
    logChannels.values.name;
    logChannels.map((ch) => {
      finalLogChannelIds[ch.name] = ch.id;
    });
    return finalLogChannelIds;
  }

  async updateRolePermissions(role: Discord.Role, permissions: bigint[] = []) {
    console.log(`Updated permissions for role ${role.name}`);
    return role.setPermissions(permissions);
  }

  async createRoleAtTop(
    guild: Guild,
    roleName: string,
    reason: string,
    addToTop: boolean = false,
    permissions: bigint[] = [],
  ) {
    let role = guild.roles.cache.find((r) => r.name === roleName);

    // If the role exists, update its permissions
    if (role && permissions.length) {
      try {
        role = await role.setPermissions(permissions);
        console.log(`Updated permissions for role ${roleName}`);
      } catch (error) {
        console.error(
          `Error updating permissions for role ${roleName}:`,
          error,
        );
      }
    } else {
      role = await guild.roles.create({
        name: roleName,
        reason: reason,
        permissions,
      });

      if (addToTop) {
        try {
          // Find the highest role the bot can manger
          const botMember = guild.members.cache.get(guild.client.user.id);
          const highestBotRolePosition = botMember.roles.highest.position;

          // Set the new role's position to just below the bot's highest role
          if (role.position < highestBotRolePosition) {
            await role.setPosition(highestBotRolePosition - 1);
          }
        } catch (error) {
          console.log('Error setting role position:', error);
        }
      }
    }
    return role;
  }

  async createRequireConfig(guild: Guild, client: Discord.Client) {
    // Create 'LogViewer' role
    let logViewerRole = guild.roles.cache.find((r) => r.name === 'LogViewer');
    if (!logViewerRole) {
      logViewerRole = await this.createRoleAtTop(
        guild,
        'LogViewer',
        BOT_TEXTS.LOG_VIEWER_ROLE_DESCRIPTION,
      );
    }
    // Create 'Muted' role
    await this.handleMuteRole(guild);

    // Create 'Jail' role
    let jailRole = guild.roles.cache.find(
      (r) => r.name === BOT_ROLES.JAIL_ROLE_NAME,
    );

    if (!jailRole) {
      jailRole = await this.createRoleAtTop(
        guild,
        'Jail',
        BOT_TEXTS.PRISON_ROLE_DESCRIPTION,
        true,
        [],
      );
    } else {
      this.updateRolePermissions(jailRole, []);
    }

    await this.handleJailRole(guild);

    // Create GodMode role
    let godModeRole = await this.assignGodModeRoleToBot(guild, client.user.id);
    if (!godModeRole) {
      this.logger.error('Could not create god mode role for guild');
      throw new Error('Could not create god mode role for guild');
    }

    await this.createPrivateChannels(guild, [BOT_TEXTS.PRISON], [jailRole.id]);

    // Create log channels
    const logChannels = LOG_CHANNELS;

    const createdLogChannels = await this.createPrivateChannels(
      guild,
      logChannels,
      [godModeRole.id, logViewerRole.id],
    );

    const serverLogChannelHash: any = {};
    for (const logChannelName of Object.keys(LOG_CHANNELS_SCHEMA_MAPPING)) {
      const keyName = LOG_CHANNELS_SCHEMA_MAPPING[logChannelName];
      serverLogChannelHash[keyName] = {};
      serverLogChannelHash[keyName].name = logChannelName;
      serverLogChannelHash[keyName].id = createdLogChannels[logChannelName];
    }
    
    const antiConfig: AntiConfig = {
      antiSpamMaxMessagesCount: 5,
      antiSpamTimeWindow: 5,
      antiSpamMaxWarnings: 3,
    }

    const newServerData: CreateServerType = {
      id: guild.id,
      name: guild.name,
      owner: guild.ownerId,
      antiConfig,
    };
    const server =
      await this.serverRepository.findOrCreateNewServer(newServerData);
    // console.log(`Create/Updated a new server: ${server.name}`);
    serverLogChannelHash.serverId = guild.id;

    await this.serverLogChannelRepository.findOrCreateByGuildId(
      guild.id,
      serverLogChannelHash,
    );

    this.createCategoryAndMoveChannels(guild, 'Nervesx Bot', logChannels, [
      godModeRole.id,
      logViewerRole.id,
    ]);
  }

  async assignGodModeRoleToBot(guild: Guild, botId: string) {
    try {
      // Fetch the bot's GuildMember object
      const botMember = await guild.members.fetch(botId);
      if (!botMember) {
        this.logger.warn(`Bot member not found in guild: ${guild.id}`);
        return;
      }

      // Fetch or create the GodMode role
      let godModeRole = await this.createRoleAtTop(
        guild,
        'GodMode',
        BOT_TEXTS.GOD_MODE_ROLE_DESCRIPTION,
        true,
        [PermissionFlagsBits.Administrator],
      );

      // Assign the role to the bot
      await botMember.roles.add(godModeRole);
      this.logger.log(`Assigned 'GodMode' role to bot in guild: ${guild.id}`);
      return godModeRole;
    } catch (error) {
      this.logger.error(
        `Error assigning 'GodMode' role to bot: ${error.message}`,
      );
    }
  }

  private async handleMuteRole(guild: Discord.Guild): Promise<void> {
    let mutedRole = guild.roles.cache.find((role) => role.name === 'Muted');
    if (!mutedRole) {
      try {
        // Attempt to create the Muted role with basic permissions
        mutedRole = await guild.roles.create({
          name: 'Muted',
          color: Discord.Colors.Grey,
          permissions: [Discord.PermissionsBitField.Flags.ViewChannel],
        });
        // Optionally set up channel-specific overrides to ensure the role is properly muted
        this.logger.log('Muted role created successfully.');
      } catch (error) {
        this.logger.error('Failed to create the Muted role:', error);
        throw new Error('Failed to create the Muted role');
      }
    } else {
      try {
        // Assuming `mutedRole` is already defined/found

        guild.channels.cache.forEach(async (channel) => {
          // Filter channels to those that support permission overwrites
          if (
            channel instanceof Discord.TextChannel ||
            channel instanceof Discord.VoiceChannel ||
            channel instanceof Discord.CategoryChannel ||
            channel instanceof Discord.NewsChannel
          ) {
            try {
              await channel.permissionOverwrites.edit(mutedRole, {
                SendMessages: false,
                Speak: false,
                AddReactions: false,
              });
              this.logger.log(`Updated permissions for ${channel.name}`);
            } catch (error) {
              this.logger.error(
                `Failed to update permissions for ${channel.name}: ${error}`,
              );
            }
          }
        });

        this.logger.log('Muted role created successfully.');
      } catch (error) {
        this.logger.error('Failed to create the Muted role:', error);
        throw new Error('Failed to create the Muted role');
      }
    }
  }
  private async handleJailRole(guild: Discord.Guild): Promise<void> {
    let jailRole = guild.roles.cache.find(
      (role) => role.name === BOT_ROLES.JAIL_ROLE_NAME,
    );
    if (jailRole) {
      {
        try {
          // Assuming `jailRole` is already defined/found

          guild.channels.cache.forEach(async (channel) => {
            // Filter channels to those that support permission overwrites
            if (
              channel instanceof Discord.TextChannel ||
              channel instanceof Discord.VoiceChannel ||
              channel instanceof Discord.CategoryChannel ||
              channel instanceof Discord.NewsChannel
            ) {
              try {
                const deniedPermissions = {
                  CreateInstantInvite: false,
                  ManageChannels: false,
                  ManageRoles: false,
                  ManageWebhooks: false,
                  ViewChannel: false,
                  SendMessages: false,
                  SendTTSMessages: false,
                  ManageMessages: false,
                  EmbedLinks: false,
                  AttachFiles: false,
                  ReadMessageHistory: false,
                  MentionEveryone: false,
                  UseExternalEmojis: false,
                  AddReactions: false,
                  Connect: false,
                  Speak: false,
                  Stream: false,
                  MuteMembers: false,
                  DeafenMembers: false,
                  MoveMembers: false,
                  UseVAD: false,
                  ChangeNickname: false,
                  ManageNicknames: false,
                  ManageEmojisAndStickers: false,
                  UseApplicationCommands: false,
                  RequestToSpeak: false,
                  ManageEvents: false,
                  ManageThreads: false,
                  CreatePublicThreads: false,
                  CreatePrivateThreads: false,
                  UseExternalStickers: false,
                  SendMessagesInThreads: false,
                  ModerateMembers: false,
                  Administrator: false,
                };

                if (channel.name !== BOT_TEXTS.PRISON) {
                  await channel.permissionOverwrites.edit(
                    jailRole,
                    deniedPermissions,
                  );
                  this.logger.log(
                    `Updated permissions for ${channel.name} for role Jail`,
                  );
                } else {
                  await channel.permissionOverwrites.edit(jailRole, {
                    ViewChannel: true,
                    SendMessages: true,
                  });
                  this.logger.log(
                    `Updated permissions for ${channel.name} for role Jail`,
                  );
                }
              } catch (error) {
                this.logger.error(
                  `Failed to update permissions for ${channel.name}: ${error}`,
                );
              }
            }
          });
        } catch (error) {
          this.logger.error('Failed to update the Jail role:', error);
          throw new Error('Failed to update the Jail role');
        }
      }
    }
  }

  private async isBotTopRole(guild: Guild): Promise<boolean> {
    const botMember = await guild.members.fetch(guild.client.user.id);
    // Find the highest role position in the guild
    const highestRolePosition = guild.roles.cache.reduce(
      (max, role) => Math.max(max, role.position),
      0,
    );
    // Compare the bot's highest role position to the guild's highest role position
    return botMember.roles.highest.position === highestRolePosition;
  }
}
