// import { Injectable, Logger } from '@nestjs/common';
// import { Message, PermissionsBitField } from 'discord.js';
// import axios from 'axios';
// import { createCanvas, loadImage } from 'canvas';

// @Injectable()
// export class AddEmojiService {
//   private readonly logger = new Logger(AddEmojiService.name);

//   constructor() {}

//   async handleCommand(message: Message, args: string[]): Promise<void> {
//     if (!message.guild) {
//       await message.reply('This command can only be used within a server.');
//       return;
//     }

//     // Ensure the bot has permission to manage emojis
//     const botMember = await message.guild.members.fetch(message.client.user.id);
//     if (
//       !botMember.permissions.has(
//         PermissionsBitField.Flags.ManageEmojisAndStickers,
//       )
//     ) {
//       await message.reply(
//         'I do not have permission to manage emojis in this server.',
//       );
//       return;
//     }

//     // Process each argument (either URL or direct emoji)
//     for (const arg of args) {
//       if (arg.startsWith('http://') || arg.startsWith('https://')) {
//         // Argument is a URL
//         await this.uploadEmojiFromUrl(message, arg);
//       } else {
//         // Argument is assumed to be a direct Unicode emoji
//         await this.uploadEmojiFromUnicode(message, arg);
//       }
//     }
//   }

//   private async uploadEmojiFromUrl(
//     message: Message,
//     url: string,
//   ): Promise<void> {
//     try {
//       const response = await axios.get(url, { responseType: 'arraybuffer' });
//       if (response.status !== 200) throw new Error('Failed to fetch image');
//       const name = url.split('/').pop().split('.')[0];
//       await message.guild.emojis.create({
//         attachment: Buffer.from(response.data),
//         name,
//       });
//       this.logger.log(`Uploaded emoji from URL: ${url}`);
//     } catch (error) {
//       this.logger.error(`Error uploading emoji from URL: ${error}`);
//       await message.reply(`Failed to upload emoji from URL: ${url}`);
//     }
//   }

//   private async uploadEmojiFromUnicode(
//     message: Message,
//     emoji: string,
//   ): Promise<void> {
//     try {
//       const canvas = createCanvas(128, 128);
//       const ctx = canvas.getContext('2d');
//       ctx.font = '100px Arial';
//       ctx.fillText(emoji, 0, 100);

//       const attachment = canvas.toBuffer();
//       const name = `emoji_${Date.now()}`;
//       await message.guild.emojis.create({ attachment, name });
//       this.logger.log(`Uploaded custom emoji for Unicode: ${emoji}`);
//     } catch (error) {
//       this.logger.error(`Error creating emoji from Unicode: ${error}`);
//       await message.reply(`Failed to create emoji from: ${emoji}`);
//     }
//   }
// }
