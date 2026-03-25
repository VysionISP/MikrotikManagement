import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as { token?: string }).token ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'mikrotik-management-secret',
      }) as { sub: number };
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join-org')
  handleJoinOrg(@MessageBody() orgId: number, @ConnectedSocket() client: Socket) {
    void client.join(`org:${orgId}`);
  }

  @SubscribeMessage('leave-org')
  handleLeaveOrg(@MessageBody() orgId: number, @ConnectedSocket() client: Socket) {
    void client.leave(`org:${orgId}`);
  }

  @SubscribeMessage('join-site')
  handleJoinSite(@MessageBody() siteId: number, @ConnectedSocket() client: Socket) {
    void client.join(`site:${siteId}`);
  }

  @SubscribeMessage('leave-site')
  handleLeaveSite(@MessageBody() siteId: number, @ConnectedSocket() client: Socket) {
    void client.leave(`site:${siteId}`);
  }

  emitDeviceStatusUpdate(siteId: number, deviceId: number, status: string, data?: object) {
    this.server.to(`site:${siteId}`).emit('device:status', { deviceId, status, ...data });
  }

  emitDeviceMetric(siteId: number, deviceId: number, metric: object) {
    this.server.to(`site:${siteId}`).emit('device:metric', { deviceId, ...metric });
  }
}
