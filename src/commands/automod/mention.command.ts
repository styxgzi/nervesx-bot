import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server } from 'http';
import { ServerDocument } from 'lib/models/server.schema';
import { ServerRepository } from 'lib/repository/server.repository';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { SetServerConfigCommandService } from '../moderation/setConfig.command';

@Injectable()
export class MentionLimitService {
    private readonly logger = new Logger(MentionLimitService.name);

    constructor(
        private readonly serverRepository: ServerRepository,
        private readonly serverLoggerService: ServerLoggerService,
    ) { }

    async handleMessage(message: Message): Promise<void> {
        // Exit early if the message is not from a guild or doesn't mention any users
        if (!message.guild || message.mentions.users.size === 0) return;

        try {
            const mentionLimit = await this.serverRepository.getMentionLimit(message.guild.id);

            // Check if the mentions exceed the limit and act accordingly
            if (message.mentions.users.size > mentionLimit) {
                await message.delete();
                await message.author.send(`${message.author}, your message mentioned too many users and was removed.`).catch((error) =>
                    console.error(`Could not send DM to ${message.author.tag}.`, error),
                );
                this.serverLoggerService.sendLogMessage(
                    message.guild,
                    LogChannelType.MESSAGE,
                    `${message.author.tag}'s message mentioned too many users and was removed. Content: ${message.content}`,
                );
            }
        } catch (error) {
            this.logger.error('Error handling message mention limit', error);
        }
    }

}
