import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { DevicesService } from '../devices/devices.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class PollingService {
  private readonly logger = new Logger(PollingService.name);

  constructor(
    private prisma: PrismaService,
    private devicesService: DevicesService,
    private eventsGateway: EventsGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async pollAllDevices() {
    const devices = await this.prisma.device.findMany({
      select: { id: true, siteId: true },
    });

    for (const device of devices) {
      try {
        await this.devicesService.probeDevice(device.id);
        const updated = await this.prisma.device.findUnique({
          where: { id: device.id },
          select: { status: true },
        });
        if (updated) {
          const metric = await this.prisma.deviceMetric.findFirst({
            where: { deviceId: device.id },
            orderBy: { timestamp: 'desc' },
          });
          this.eventsGateway.emitDeviceStatusUpdate(
            device.siteId,
            device.id,
            updated.status,
            metric ? { cpuLoad: metric.cpuLoad, memoryUsed: metric.memoryUsed } : {},
          );
          if (metric) {
            this.eventsGateway.emitDeviceMetric(device.siteId, device.id, {
              cpuLoad: metric.cpuLoad,
              memoryUsed: metric.memoryUsed,
              totalMemory: metric.totalMemory,
              uptime: metric.uptime,
              timestamp: metric.timestamp,
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to poll device ${device.id}: ${(err as Error).message}`);
      }
    }
  }
}
