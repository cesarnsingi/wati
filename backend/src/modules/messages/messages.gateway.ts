import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket }  from 'socket.io';
import { JwtService }      from '@nestjs/jwt';
import { OnEvent }         from '@nestjs/event-emitter';
import { Logger }          from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  // businessId → Set of socketIds
  private rooms = new Map<string, Set<string>>();

  constructor(private jwt: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwt.verify(token);
      const businessId: string = payload.businessId;

      socket.data.businessId = businessId;
      socket.join(`business:${businessId}`);

      if (!this.rooms.has(businessId)) this.rooms.set(businessId, new Set());
      this.rooms.get(businessId)!.add(socket.id);

      this.logger.log(`Socket connected: ${socket.id} → business:${businessId}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const biz = socket.data.businessId;
    if (biz) this.rooms.get(biz)?.delete(socket.id);
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  // Broadcast new inbound message to all agents of that business
  @OnEvent('message.inbound')
  onInbound(data: { businessId: string; message: any; conversation: any; contact: any }) {
    this.server.to(`business:${data.businessId}`).emit('message.inbound', data);
  }

  // Broadcast status update
  @OnEvent('message.status')
  onStatus(data: { businessId: string; waMessageId: string; status: string }) {
    this.server.to(`business:${data.businessId}`).emit('message.status', data);
  }
}
