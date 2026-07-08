import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

type BlastProgressPayload = {
  blastJobId: string;
  currentGroupIndex: number;
  totalGroups: number;
  status: string;
  errorMessage?: string;
};

type GroupPublishedPayload = {
  blastJobId: string;
  groupId: string;
  status: string;
  errorMessage: string | null;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/blast-progress',
})
export class BlastProgressGateway implements OnGatewayConnection {
  private readonly logger = new Logger(BlastProgressGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      client.disconnect();
      return;
    }

    const blastJobId = client.handshake.query.blastJobId as string | undefined;
    if (blastJobId) {
      client.join(`blast-${blastJobId}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { blastJobId: string },
  ) {
    client.join(`blast-${data.blastJobId}`);
  }

  @OnEvent('group-published')
  handleGroupPublished(payload: GroupPublishedPayload) {
    this.server
      .to(`blast-${payload.blastJobId}`)
      .emit('group-published', payload);
  }

  @OnEvent('blast-progress')
  handleProgress(payload: BlastProgressPayload) {
    this.server
      .to(`blast-${payload.blastJobId}`)
      .emit('blast-progress', payload);
  }
}
