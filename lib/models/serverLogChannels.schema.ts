import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class LogChannel {
  @Prop()
  id?: string;

  @Prop()
  name?: string;
}

export const LogChannelSchema = SchemaFactory.createForClass(LogChannel);

export type ServerLogChannelDocument = ServerLogChannel & Document;

@Schema()
export class ServerLogChannel {
  @Prop({ required: true, unique: true })
  id: string; // Assuming this is the guild ID

  @Prop({ type: LogChannelSchema, required: false })
  jailLogChannel?: LogChannel;

  @Prop({ type: LogChannelSchema, required: false })
  joinLogChannel?: LogChannel;

  @Prop({ type: LogChannelSchema, required: false })
  leaveLogChannel?: LogChannel;

  @Prop({ type: LogChannelSchema, required: false })
  messageLogChannel?: LogChannel;

  @Prop({ type: LogChannelSchema, required: false })
  modLogChannel?: LogChannel;

  @Prop({ type: LogChannelSchema, required: false })
  serverLogChannel?: LogChannel;

  @Prop({ type: Types.ObjectId, required: true })
  serverId: Types.ObjectId;
}

export const ServerLogChannelSchema =
  SchemaFactory.createForClass(ServerLogChannel);
