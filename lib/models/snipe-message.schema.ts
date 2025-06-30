// snipe-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SnipeMessageDocument = SnipeMessage & Document;

@Schema()
export class SnipeMessage {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  channelId: string;

  @Prop({ required: true })
  guildId: string;

  @Prop({ type: Date, default: Date.now })
  time: Date;
}

export const SnipeMessageSchema = SchemaFactory.createForClass(SnipeMessage);
