// allowed-users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  RegisteredUser,
  RegisteredUserDocument,
} from 'lib/models/registered-users.schema';
import { Model } from 'mongoose';

@Injectable()
export class AllowedUsersRepository {
  constructor(
    @InjectModel(RegisteredUser.name)
    private registeredUserModel: Model<RegisteredUserDocument>,
  ) {}

  async isUserRegistered(username: string, serverId: string): Promise<boolean> {
    const user = await this.registeredUserModel.findOne({ username, serverId });
    return !!user;
  }

  async addAllowedUser(
    username: string,
    serverId: string,
  ): Promise<RegisteredUser> {
    const newUser = new this.registeredUserModel({ username, serverId });
    return newUser.save();
  }

  async removeAllowedUser(username: string, serverId: string): Promise<any> {
    return this.registeredUserModel.deleteOne({ username, serverId });
  }
}
