import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { PollingService } from './polling.service';
import { DevicesModule } from '../devices/devices.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    DevicesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'mikrotik-management-secret',
    }),
  ],
  providers: [EventsGateway, PollingService, PrismaService],
  exports: [EventsGateway],
})
export class GatewayModule {}
