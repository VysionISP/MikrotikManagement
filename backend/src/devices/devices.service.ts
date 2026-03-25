import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MikrotikApiClient } from './mikrotik/mikrotik-api.client';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async create(siteId: number, dto: CreateDeviceDto, userId: number) {
    await this.assertSiteAccess(siteId, userId);

    const existing = await this.prisma.device.findUnique({
      where: { ipAddress_siteId: { ipAddress: dto.ipAddress, siteId } },
    });
    if (existing) throw new ConflictException('Device with this IP already exists in this site');

    const device = await this.prisma.device.create({
      data: {
        name: dto.name,
        ipAddress: dto.ipAddress,
        apiPort: dto.apiPort ?? 8728,
        username: dto.username,
        password: dto.password,
        siteId,
      },
    });

    // Attempt initial connection to get device info
    this.probeDevice(device.id).catch(() => {});

    return device;
  }

  async findAll(siteId: number, userId: number) {
    await this.assertSiteAccess(siteId, userId);
    return this.prisma.device.findMany({
      where: { siteId },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        apiPort: true,
        model: true,
        version: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        site: { include: { organization: true } },
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 60,
        },
      },
    });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);
    // Omit password from response
    const { password: _pw, ...result } = device;
    return result;
  }

  async update(id: number, dto: UpdateDeviceDto, userId: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);
    return this.prisma.device.update({
      where: { id },
      data: dto,
      select: {
        id: true, name: true, ipAddress: true, apiPort: true,
        model: true, version: true, status: true, updatedAt: true,
      },
    });
  }

  async remove(id: number, userId: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);
    return this.prisma.device.delete({ where: { id } });
  }

  async testConnection(id: number, userId: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);

    const client = new MikrotikApiClient(device.ipAddress, device.apiPort);
    try {
      await client.connect(device.username, device.password);
      const info = await client.getSystemResources();
      client.disconnect();

      await this.prisma.device.update({
        where: { id },
        data: {
          status: DeviceStatus.ONLINE,
          model: info.boardName,
          version: info.version,
        },
      });

      return { success: true, info };
    } catch (err) {
      await this.prisma.device.update({
        where: { id },
        data: { status: DeviceStatus.OFFLINE },
      });
      throw new BadRequestException(`Connection failed: ${(err as Error).message}`);
    }
  }

  async getDeviceStats(id: number, userId: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);

    const client = new MikrotikApiClient(device.ipAddress, device.apiPort);
    try {
      await client.connect(device.username, device.password);
      const [resources, interfaces] = await Promise.all([
        client.getSystemResources(),
        client.getInterfaces(),
      ]);
      client.disconnect();

      // Store metric snapshot
      await this.prisma.deviceMetric.create({
        data: {
          deviceId: id,
          cpuLoad: resources.cpuLoad,
          memoryUsed: resources.memoryUsed,
          totalMemory: resources.totalMemory,
          uptime: resources.uptimeSeconds,
        },
      });

      await this.prisma.device.update({
        where: { id },
        data: { status: DeviceStatus.ONLINE },
      });

      return { resources, interfaces };
    } catch (err) {
      await this.prisma.device.update({
        where: { id },
        data: { status: DeviceStatus.OFFLINE },
      });
      throw new BadRequestException(`Failed to fetch stats: ${(err as Error).message}`);
    }
  }

  async getMetrics(id: number, userId: number, limit = 60) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    await this.assertSiteAccess(device.siteId, userId);

    return this.prisma.deviceMetric.findMany({
      where: { deviceId: id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async probeDevice(deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return;

    const client = new MikrotikApiClient(device.ipAddress, device.apiPort, 5000);
    try {
      await client.connect(device.username, device.password);
      const resources = await client.getSystemResources();
      client.disconnect();

      await this.prisma.device.update({
        where: { id: deviceId },
        data: {
          status: DeviceStatus.ONLINE,
          model: resources.boardName,
          version: resources.version,
        },
      });

      await this.prisma.deviceMetric.create({
        data: {
          deviceId,
          cpuLoad: resources.cpuLoad,
          memoryUsed: resources.memoryUsed,
          totalMemory: resources.totalMemory,
          uptime: resources.uptimeSeconds,
        },
      });
    } catch {
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { status: DeviceStatus.OFFLINE },
      });
    }
  }

  private async assertSiteAccess(siteId: number, userId: number) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { organizationId: true },
    });
    if (!site) throw new NotFoundException('Site not found');

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: site.organizationId },
      },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
  }
}
