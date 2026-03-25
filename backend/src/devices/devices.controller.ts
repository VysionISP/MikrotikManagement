import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('sites/:siteId/devices')
  create(
    @Param('siteId', ParseIntPipe) siteId: number,
    @Body() dto: CreateDeviceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devicesService.create(siteId, dto, user.id);
  }

  @Get('sites/:siteId/devices')
  findAll(
    @Param('siteId', ParseIntPipe) siteId: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devicesService.findAll(siteId, user.id);
  }

  @Get('devices/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.devicesService.findOne(id, user.id);
  }

  @Put('devices/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devicesService.update(id, dto, user.id);
  }

  @Delete('devices/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.devicesService.remove(id, user.id);
  }

  @Post('devices/:id/test')
  testConnection(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.devicesService.testConnection(id, user.id);
  }

  @Get('devices/:id/stats')
  getStats(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.devicesService.getDeviceStats(id, user.id);
  }

  @Get('devices/:id/metrics')
  getMetrics(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.devicesService.getMetrics(id, user.id, limit ? parseInt(limit, 10) : 60);
  }
}
