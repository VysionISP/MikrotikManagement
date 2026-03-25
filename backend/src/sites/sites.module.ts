import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SitesController],
  providers: [SitesService, PrismaService],
  exports: [SitesService],
})
export class SitesModule {}
