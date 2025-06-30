import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AntiConfig,
  CreateServerType,
  Server,
  ServerDocument,
} from '../models/server.schema';

@Injectable()
export class ServerRepository {
  constructor(
    @InjectModel(Server.name)
    private serverModel: Model<ServerDocument>,
  ) {}

  // Create a new Server
  async create(createDto: CreateServerType): Promise<Server> {
    const createdServer = new this.serverModel(createDto);
    return createdServer.save();
  }

  // Find a Server by ID
  async findOneById(id: string): Promise<Server | null> {
    return this.serverModel.findById(id).exec();
  }

  async findGuildById(id: string): Promise<Server | null> {
    return this.serverModel.findOne({ id });
  }

  // Update a Server
  async update(id: string, updateDto: any): Promise<Server | null> {
    return this.serverModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  // Update a Server
  async softDelete(id: string): Promise<boolean> {
    try {
      this.serverModel.findByIdAndUpdate(id, { isSoftDeleted: true }).exec();
      return true;
    } catch (err) {
      return false;
    }
  }

  async findOrCreateNewServer(
    serverData: CreateServerType,
  ): Promise<Server | null> {
    const server = await this.serverModel.findOne({ id: serverData.id });
    if (!server) {
      return this.serverModel.create(serverData);
    }
    return this.serverModel.findOneAndUpdate({ id: serverData.id }, serverData);
  }

  async addServerWhiteListUser(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { whitelistedUserIds: userId } },
      );

      // Check if the update was successful
      if (result.modifiedCount === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async removeUserFromServerWhitelist(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { whitelistedUserIds: userId } },
      );
      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addSpamWhiteListUser(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { spamWhitelistedUserIds: userId } },
      );

      // Check if the update was successful
      if (result.modifiedCount === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async removeUserFromSpamWhitelist(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { spamWhitelistedUserIds: userId } },
      );
      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addServerMediaOnlyChannel(
    channelId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { mediaOnlyChannels: channelId } },
      );

      // Check if the update was successful
      if (result.mediaOnlyChannels === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addSecondOwner(userId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { secondOwners: userId } },
      );

      // Check if the update was successful
      if (result.mediaOnlyChannels === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addMentionLimit(
    mentionLimit: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { mentionLimit: mentionLimit },
      );

      // Check if the update was successful
      if (result.mentionLimit === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addAdminUser(userId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { adminIds: userId } },
      );

      if (result.adminIds === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addModUser(userId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { modIds: userId } },
      );

      if (result.modIds === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addAdminRole(roleId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { adminRoles: roleId } },
      );

      if (result.adminRoles === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async addModRole(roleId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { modRoles: roleId } },
      );

      if (result.modRoles === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getAdminUserIds(id: string): Promise<string[]> {
    const server = await this.serverModel.findOne({ id }, { adminIds: 1 });
    return (server && server.adminIds) || [];
  }

  async getModsUserIds(id: string): Promise<string[]> {
    const server = await this.serverModel.findOne({ id }, { modIds: 1 });
    return (server && server.modIds) || [];
  }

  async getAdminRoleIds(id: string): Promise<string[]> {
    const server = await this.serverModel.findOne({ id }, { adminRoles: 1 });
    return (server && server.adminRoles) || [];
  }

  async getModsRoleIds(id: string): Promise<string[]> {
    const server = await this.serverModel.findOne({ id }, { modRoles: 1 });
    return (server && server.modRoles) || [];
  }

  async removeAdminUser(userId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { adminIds: userId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the adminIds array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Anti Link channel:', error);
      return false;
    }
  }
  async removeModUser(userId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { modIds: userId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the modIds array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Anti Link channel:', error);
      return false;
    }
  }

  async removeAdminRole(roleId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { adminRoles: roleId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the adminIds array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Anti Link channel:', error);
      return false;
    }
  }
  async removeModRole(roleId: string, serverId: string): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { modRoles: roleId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the modIds array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Anti Link channel:', error);
      return false;
    }
  }
  async addAntiLinkAllowedChannel(
    channelId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $push: { antiLinkAllowedChannels: channelId } },
      );

      // Check if the update was successful
      if (result.antiLinkAllowedChannels === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getAntiLinkChannels(id: string): Promise<string[]> {
    const server = await this.serverModel.findOne(
      { id },
      { antiLinkAllowedChannels: 1 },
    );
    return (server && server.antiLinkAllowedChannels) || [];
  }

  async removeAntiLinkChannel(
    channelId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { antiLinkAllowedChannels: channelId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the antiLinkAllowedChannels array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing Anti Link channel:', error);
      return false;
    }
  }

  async removeServerMediaOnlyChannel(
    channelId: string,
    serverId: string,
  ): Promise<boolean> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $pull: { mediaOnlyChannels: channelId } },
      );

      // Check if the update was successful
      if (result.nModified === 0) {
        console.log(
          'No server found with the specified ID, or the channel was not in the mediaOnlyChannels array.',
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing media-only channel:', error);
      return false;
    }
  }

  // Delete a Server
  async delete(id: string) {
    return this.serverModel.deleteOne({ id: id }).exec();
  }

  async getServerWhiteListedUsers(id: string): Promise<any> {
    const server = await this.serverModel.findOne(
      { id },
      { whitelistedUserIds: 1 },
    );
    return (server && server.whitelistedUserIds) || [];
  }

  async getServerMediaOnlyChannels(id: string): Promise<any> {
    const server = await this.serverModel.findOne(
      { id },
      { mediaOnlyChannels: 1 },
    );
    return (server && server.mediaOnlyChannels) || [];
  }

  async getServerDangerousRoles(id: string): Promise<any> {
    const server = await this.serverModel.findOne(
      { id },
      { dangerousRoleIds: 1 },
    );
    return (server && server.dangerousRoleIds) || [];
  }

  async getAutoRoles(id: string): Promise<any> {
    const server = await this.serverModel.findOne({ id }, { autoRoleIds: 1 });
    return (server && server.autoRoleIds) || [];
  }

  async setWelcomeChannel(
    welcomeChannelId: string,
    serverId: string,
  ): Promise<any> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $set: { welcomeChannelId: welcomeChannelId } },
      );
      // Check if the update was successful
      if (result.modifiedCount === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async setPrefix(prefix: string, serverId: string): Promise<any> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $set: { prefix: prefix } },
      );
      // Check if the update was successful
      if (result.modifiedCount === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getServerWelcomeChannel(id: string): Promise<string> {
    const server = await this.serverModel.findOne(
      { id },
      { welcomeChannelId: 1 },
    );
    return server && server.welcomeChannelId;
  }

  async setAntiConfig(antiConfig: AntiConfig, serverId: string): Promise<any> {
    try {
      const result: any = await this.serverModel.updateOne(
        { id: serverId },
        { $set: { antiConfig } },
      );
      // Check if the update was successful
      if (result.modifiedCount === 0) {
        console.log(
          'No server found with the specified ID, or no change was made.',
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getAntiConfigs(id: string): Promise<AntiConfig> {
    const server = await this.serverModel.findOne({ id }, { antiConfig: 1 });
    return server && server.antiConfig;
  }

  async getServerPrefix(id: string): Promise<string> {
    const server = await this.serverModel.findOne({ id }, { prefix: 1 });
    return server && server.prefix;
  }

  async getServerSecurityDetails(id: string): Promise<Server> {
    return await this.serverModel.findOne(
      { id },
      {
        owner: 1,
        secondOwners: 1,
        whitelistedUserIds: 1,
        dangerousRoleIds: 1,
        spamWhitelistedUserIds: 1,
        adminIds: 1,
        modIds: 1,
      },
    );
  }
  async getMentionLimit(serverId: string): Promise<number> {
    const server = await this.serverModel.findOne(
      { id: serverId },
      { mentionLimit: 1 },
    );
    return server?.mentionLimit || 10;
  }
  async isInviteOnlyServer(serverId: string): Promise<boolean> {
    const server = await this.serverModel.findOne(
      { id: serverId },
      { isInviteOnlyServer: 1 },
    );
    return server?.isInviteOnlyServer || false;
  }
}
