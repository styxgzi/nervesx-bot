import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type JailedUserDocument = JailedUser & Document;

@Schema()
export class JailedUser {
  @Prop({ required: true })
  guildId: string;

  @Prop({ required: true })
  memberId: string;

  @Prop()
  roles: [string]
}

export const JailedUserSchema = SchemaFactory.createForClass(JailedUser);
