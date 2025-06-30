import { Injectable, Logger } from '@nestjs/common';
import { Message, GuildMember, EmbedBuilder } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioResource,
  AudioPlayerStatus,
  createAudioPlayer,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import SpotifyWebApi from 'spotify-web-api-node';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });
  private audioPlayer = createAudioPlayer();

  constructor() {
    this.refreshSpotifyToken();
  }

  private async refreshSpotifyToken(): Promise<void> {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body['access_token']);
      setTimeout(
        () => this.refreshSpotifyToken(),
        data.body['expires_in'] * 1000,
      );
    } catch (error) {
      this.logger.error('Failed to refresh Spotify token', error);
    }
  }

  async play(message: Message, args: string[]): Promise<any> {
    if (!args.length)
      return message.reply('Please provide a song name or URL.');

    const voiceChannel = (message.member as GuildMember).voice.channel;
    if (!voiceChannel)
      return message.reply('You need to be in a voice channel to play music!');

    const input = args.join(' ');
    let songUrl = '';

    if (input.match(/(http(s)?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
      songUrl = input;
      this.streamSong(voiceChannel.guild.id, voiceChannel.id, songUrl, message);
    } else if (input.match(/(http(s)?:\/\/)?(open\.spotify\.com)\/track\/.+/)) {
      return message.reply(
        'Direct playback of Spotify tracks is not supported. Please use a YouTube link or search query.',
      );
    } else {
      songUrl = await this.searchYouTube(input);
      if (!songUrl) return message.reply('Could not find the song.');
      this.streamSong(voiceChannel.guild.id, voiceChannel.id, songUrl, message);
    }
  }

  private async searchYouTube(query: string): Promise<string | null> {
    const searchResults: any = await ytsr(query, { limit: 1 });
    if (searchResults.items.length > 0) {
      return searchResults.items[0].url as string;
    } else {
      return null;
    }
  }


  // Inside your MusicService class

  private async streamSong(
    guildId: string,
    channelId: string,
    songUrl: string,
    message: Message,
  ): Promise<void> {
    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    try {
      const videoInfo = await ytdl.getInfo(songUrl);
      const stream = ytdl.downloadFromInfo(videoInfo, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      this.audioPlayer.play(resource);
      connection.subscribe(this.audioPlayer);

      // Wait until the player starts playing
      await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 50e3);

      // Extract thumbnail URL
      const thumbnailUrl = videoInfo.videoDetails.thumbnails.reduce((highest, current) => {
        if (current.width > highest.width) return current;
        return highest;
      }, videoInfo.videoDetails.thumbnails[0]).url;

      // Reply with the song information and thumbnail
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Now Playing: ${videoInfo.videoDetails.title}`)
        .setDescription(`${videoInfo.videoDetails.author.name}`)
        .setImage(thumbnailUrl) // Set the large thumbnail image
        .addFields({ name: 'Duration', value: this.formatDuration(videoInfo.videoDetails.lengthSeconds), inline: true })
        .setURL(songUrl);

      message.reply({ embeds: [embed] });

      // Wait until the connection is ready
      await entersState(connection, VoiceConnectionStatus.Ready, 50e3);
    } catch (error) {
      this.logger.error('Error playing song', error);
      message.reply('There was an error trying to play the song.');
    }

    this.audioPlayer
      .on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      })
      .on('error', (error) =>
        this.logger.error('Error from AudioPlayer:', error),
      );
  }

  // Helper function to format duration from seconds to HH:MM:SS
  private formatDuration(durationInSeconds: string): string {
    const seconds = parseInt(durationInSeconds, 10);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secondsLeft = seconds % 60;

    return [
      hours ? `${hours}:` : '',
      hours ? String(minutes).padStart(2, '0') : minutes,
      ':',
      String(secondsLeft).padStart(2, '0'),
    ].join('');
  }

}
