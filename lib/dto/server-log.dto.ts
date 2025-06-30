import {
  IsString,
  IsMongoId,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer'; // Corrected import

export class LogChannelDTO {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ServerLogChannelDTO {
  @IsString()
  readonly id: string; // Assuming this is the guild ID

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly jailLogChannel?: LogChannelDTO;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly joinLogChannel?: LogChannelDTO;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly leaveLogChannel?: LogChannelDTO;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly messageLogChannel?: LogChannelDTO;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly modLogChannel?: LogChannelDTO;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogChannelDTO)
  readonly serverLogChannel?: LogChannelDTO;

  @IsMongoId()
  readonly serverId: string;
}
