// allowed-user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RegisteredUserDocument = RegisteredUser & Document;

@Schema()
export class RegisteredUser {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  serverId: string;
}

export const RegisteredUserSchema =
  SchemaFactory.createForClass(RegisteredUser);
