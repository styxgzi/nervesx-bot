import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AfkStatusDocument = AfkStatus & Document;

@Schema()
export class AfkMessagePing {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  messageLink: string;
}

@Schema()
export class AfkStatus {
  @Prop({ required: true })
  discordId: string;

  @Prop({ required: true })
  reason: string;

  @Prop()
  guildId: string; // Optional, used for server-specific AFK

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: false })
  isGlobal: boolean; // Indicates if the AFK status is global

  @Prop({})
  afkMessagePing: AfkMessagePing;
}

export const AfkStatusSchema = SchemaFactory.createForClass(AfkStatus);
