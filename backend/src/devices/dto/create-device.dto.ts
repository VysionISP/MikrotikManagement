import { IsString, IsInt, IsOptional, Min, Max, MinLength } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  ipAddress: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  apiPort?: number;

  @IsString()
  username: string;

  @IsString()
  password: string;
}
