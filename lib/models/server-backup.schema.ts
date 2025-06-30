import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ServerBackupDocument = ServerBackup & Document;

@Schema()
export class ServerBackup extends Document {
  @Prop({ required: true })
  serverId: string;

  @Prop({ required: true })
  serverName: string;

  @Prop({ type: Object })
  serverSettings: any;

  @Prop({ type: [{ type: Object }] })
  channels: any[];

  @Prop({ type: [{ type: Object }] })
  roles: any[];

  @Prop({ type: [{ type: Object }] })
  bans: any[];

  @Prop({ type: [{ type: Object }] })
  templates: any[];

  @Prop()
  timestamp: Date;
}

export const ServerBackupSchema = SchemaFactory.createForClass(ServerBackup);
