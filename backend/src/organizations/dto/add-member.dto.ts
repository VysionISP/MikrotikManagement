import { IsInt, IsEnum } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class AddMemberDto {
  @IsInt()
  userId: number;

  @IsEnum(OrgRole)
  role: OrgRole;
}
