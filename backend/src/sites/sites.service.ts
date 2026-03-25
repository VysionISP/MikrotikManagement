import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: number, dto: CreateSiteDto, userId: number) {
    await this.assertOrgAccess(orgId, userId);
    const existing = await this.prisma.site.findUnique({
      where: { name_organizationId: { name: dto.name, organizationId: orgId } },
    });
    if (existing) throw new ConflictException('Site name already exists in this organization');
    return this.prisma.site.create({
      data: { name: dto.name, description: dto.description, organizationId: orgId },
      include: { _count: { select: { devices: true } } },
    });
  }

  async findAll(orgId: number, userId: number) {
    await this.assertOrgAccess(orgId, userId);
    return this.prisma.site.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { devices: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        organization: true,
        devices: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            status: true,
            model: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: { select: { devices: true } },
      },
    });
    if (!site) throw new NotFoundException('Site not found');
    await this.assertOrgAccess(site.organizationId, userId);
    return site;
  }

  async update(id: number, dto: UpdateSiteDto, userId: number) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    await this.assertOrgAccess(site.organizationId, userId);
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async remove(id: number, userId: number) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    await this.assertOrgAccess(site.organizationId, userId);
    return this.prisma.site.delete({ where: { id } });
  }

  private async assertOrgAccess(orgId: number, userId: number) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
  }
}
