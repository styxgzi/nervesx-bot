import { Injectable, Logger } from '@nestjs/common';
import { CommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class PingTextCommandService {
  constructor(private serverRepository: ServerRepository) {}

  async execute(interaction: CommandInteraction): Promise<void> {
    // Acknowledge the interaction first
    await interaction.deferReply();

    // Record the time when the command is executed to calculate latency
    const startTime = Date.now();

    // Measure API latency
    const apiLatency = Math.round(interaction.client.ws.ping);

    // Measure database latency
    const dbStartTime = Date.now();
    // This is a placeholder database call. Replace it with an actual call relevant to your application.
    await this.serverRepository.getServerPrefix(interaction.guildId);
    const dbEndTime = Date.now();
    const dbLatency = dbEndTime - dbStartTime;

    // Calculate round-trip latency
    const endTime = Date.now();
    const botLatency = endTime - startTime;

    // Prepare an embed with latency information
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        { name: 'Database Latency', value: `${dbLatency}ms`, inline: true },
      )
      .setTimestamp();

    // Send the embed as a reply to the interaction
    await interaction.editReply({ embeds: [embed], });
  }

  // Method to execute ping command
  async executeText(message: Message) {
    // Record the time when the command is executed to calculate latency later
    const startTime = Date.now();

    // Send an initial response to calculate ping. We'll edit this message later.
    const sent = await message.channel.send({ content: '🏓 Pinging...' });

    // Calculate round-trip latency
    const endTime = Date.now();
    const timeDiff = endTime - startTime;

    // Measure database latency
    const dbStartTime = Date.now();
    // This is a placeholder database call. Replace it with an actual call relevant to your application.
    await this.serverRepository.getServerPrefix(message.guildId);
    const dbEndTime = Date.now();
    const dbLatency = dbEndTime - dbStartTime;

    // Prepare an embed with latency information
    const embed = new EmbedBuilder()
      .setColor('#0099FF') // Set the color of the embed
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${timeDiff}ms`, inline: true },
        {
          name: 'API Latency',
          value: `${Math.round(message.client.ws.ping)}ms`,
          inline: true,
        },
        { name: 'Database Latency', value: `${dbLatency}ms`, inline: true },
      )
      .setTimestamp();

    // Edit the initial message to display the embed with latency information
    await sent.edit({ content: ' ', embeds: [embed] });
  }
}
