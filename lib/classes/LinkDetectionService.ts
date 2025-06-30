import { Injectable } from '@nestjs/common';

@Injectable()
export class LinkDetectionService {
  detectGifs(content: string): boolean {
    const gifRegex = /https?:\/\/[^ ]*\.(gif)(?![^ ])/gi;
    return gifRegex.test(content) || content.includes("gif");
  }

  detectImages(content: string): boolean {
    const imageRegex =
      /https?:\/\/[^ ]*\.(png|jpg|jpeg|tiff|bmp|svg|webp)(?![^ ])/gi;
    return imageRegex.test(content);
  }

  detectDiscordInvites(content: string): boolean {
    const discordInviteRegex =
      /(?:https?:\/\/)?(?:discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[^\s]+/gi;
    return discordInviteRegex.test(content);
  }

  detectWebsites(content: string): boolean {
    const websiteRegex =
      /https?:\/\/(?!.*\b(png|jpg|jpeg|gif|tiff|bmp|svg|webp|mp4|mp3)\b)[^ ]+\.[^ ]+/gi;
    return websiteRegex.test(content);
  }

  detectYouTubeLinks(content: string): boolean {
    const youtubeRegex =
      /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/channel\/|youtube\.com\/user\/)[^\s]+/gi;
    return youtubeRegex.test(content);
  }

  detectSocialMediaLinks(content: string): boolean {
    const socialMediaRegex =
      /https?:\/\/(www\.)?(twitter\.com\/|facebook\.com\/|instagram\.com\/|linkedin\.com\/|tiktok\.com\/)[^\s]+/gi;
    return socialMediaRegex.test(content);
  }

  detectStreamingMediaLinks(content: string): boolean {
    const streamingMediaRegex =
      /https?:\/\/(www\.)?(twitch\.tv\/|spotify\.com\/|soundcloud\.com\/)[^\s]+/gi;
    return streamingMediaRegex.test(content);
  }

  detectDocumentLinks(content: string): boolean {
    const documentRegex =
      /https?:\/\/(docs\.google\.com\/|drive\.google\.com\/|dropbox\.com\/|onedrive\.live\.com\/)[^\s]+/gi;
    return documentRegex.test(content);
  }

  public detectAllLinks(content: string): boolean {
    const combinedRegex = new RegExp(
      '(?:https?:\\/\\/)?' + // Protocol (optional)
        '(?:' +
        '(www\\.)?' + // Optional www
        '(?:' +
        'discord\\.gg\\/|' + // Discord invite (shortened)
        'discordapp\\.com\\/invite\\/|' + // Discord invite
        'discord\\.com\\/invite\\/|' + // Discord invite
        'youtube\\.com\\/watch\\?v=|' + // YouTube
        'youtu\\.be\\/|' + // YouTube short
        'youtube\\.com\\/channel\\/|' + // YouTube channel
        'youtube\\.com\\/user\\/|' + // YouTube user
        'twitter\\.com\\/|' + // Twitter
        'facebook\\.com\\/|' + // Facebook
        'instagram\\.com\\/|' + // Instagram
        'linkedin\\.com\\/|' + // LinkedIn
        'tiktok\\.com\\/|' + // TikTok
        'twitch\\.tv\\/|' + // Twitch
        'spotify\\.com\\/|' + // Spotify
        'soundcloud\\.com\\/|' + // SoundCloud
        'docs\\.google\\.com\\/|' + // Google Docs
        'drive\\.google\\.com\\/|' + // Google Drive
        'dropbox\\.com\\/|' + // Dropbox
        'onedrive\\.live\\.com\\/|' + // OneDrive
        '[a-zA-Z0-9-]+\\.[a-zA-Z]{2,}(?:\\/[^\\s]*)?' + // Other websites with better TLD matching
        ')' +
        ')|' +
        '(?:[^\\s]*\\.(gif|png|jpg|jpeg|tiff|bmp|svg|webp))', // Image files
      'gi',
    );

    return combinedRegex.test(content);
  }
}
