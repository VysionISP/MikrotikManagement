import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, userId: number) {
    const existing = await this.prisma.organization.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });
    if (existing) throw new ConflictException('Organization name or slug already taken');

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: { create: { userId, role: OrgRole.ADMIN } },
      },
      include: { members: { include: { user: { select: { id: true, username: true, email: true } } } } },
    });
  }

  async findAll(userId: number) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { sites: true, members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, email: true, role: true } } },
        },
        sites: {
          include: { _count: { select: { devices: true } } },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const membership = org.members.find((m) => m.userId === userId);
    if (!membership) throw new ForbiddenException('Not a member of this organization');
    return org;
  }

  async update(id: number, dto: UpdateOrganizationDto, userId: number) {
    await this.assertRole(id, userId, [OrgRole.ADMIN]);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async remove(id: number, userId: number) {
    await this.assertRole(id, userId, [OrgRole.ADMIN]);
    return this.prisma.organization.delete({ where: { id } });
  }

  async addMember(orgId: number, dto: AddMemberDto, requesterId: number) {
    await this.assertRole(orgId, requesterId, [OrgRole.ADMIN]);
    const existing = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: dto.userId, organizationId: orgId } },
    });
    if (existing) throw new ConflictException('User is already a member');
    return this.prisma.organizationMember.create({
      data: { userId: dto.userId, organizationId: orgId, role: dto.role },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
  }

  async removeMember(orgId: number, memberId: number, requesterId: number) {
    await this.assertRole(orgId, requesterId, [OrgRole.ADMIN]);
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: memberId, organizationId: orgId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.delete({
      where: { userId_organizationId: { userId: memberId, organizationId: orgId } },
    });
  }

  async updateMemberRole(orgId: number, memberId: number, role: OrgRole, requesterId: number) {
    await this.assertRole(orgId, requesterId, [OrgRole.ADMIN]);
    return this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId: memberId, organizationId: orgId } },
      data: { role },
    });
  }

  private async assertRole(orgId: number, userId: number, allowed: OrgRole[]) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    if (!allowed.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
  }
}
