import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { Message } from "discord.js";
import { BOT_TEXTS } from "src/constants/strings";

export const Permissions = createParamDecorator(async (data: unknown, ctx: ExecutionContext) => {

    const context = ctx.switchToHttp().getRequest();
    const message: Message = context.message;

    const permissionsService = context.permissionsService;
    const isOwner = message.guild.ownerId === message.author.id;
    const isUserWhitelisted = await permissionsService.isUserWhitelisted(message.author.id, message.guild.id);

    if (!isOwner && !isUserWhitelisted) {
        await message.reply(BOT_TEXTS.YOU_ARE_NOT_AUTHORIZED_TO_PERFORM_THIS_ACTION);
        return false;
    }

    return true;
});

export const AuthorizedUser = createParamDecorator(async (data: unknown, ctx: ExecutionContext): Promise<{
    isOwner: boolean,
    isSecondOwner: boolean,
    isUserWhitelisted: boolean,
}> => {

    const context = ctx.switchToHttp().getRequest();
    const message: Message = context.message;

    const permissionsService = context.permissionsService;
    const serverRepository = context.serverRepository;
    const isOwner = message.guild.ownerId === message.author.id;
    const server = await serverRepository.findGuildById(
        message.guild.id,
    );
    const isSecondOwner = (server.secondOwners || ([] as any)).includes(
        message.author.id,
    );

    const isUserWhitelisted = await permissionsService.isUserWhitelisted(message.author.id, message.guild.id);

    return {
        isOwner,
        isSecondOwner,
        isUserWhitelisted,
    }
});

