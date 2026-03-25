import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post('organizations/:orgId/sites')
  create(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sitesService.create(orgId, dto, user.id);
  }

  @Get('organizations/:orgId/sites')
  findAll(
    @Param('orgId', ParseIntPipe) orgId: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sitesService.findAll(orgId, user.id);
  }

  @Get('sites/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.sitesService.findOne(id, user.id);
  }

  @Put('sites/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sitesService.update(id, dto, user.id);
  }

  @Delete('sites/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    return this.sitesService.remove(id, user.id);
  }
}
