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
type BatchProgressPayload = {
  batchJobId: string;
  fetchedCount: number;
  totalLimit: number;
  status: string;
  errorMessage?: string;
};

// Bentuk serialized (snake_case), sama seperti response REST — bukan entity
// TypeORM mentah, supaya konsisten dengan kontrak yang dibaca frontend.
type SerializedScrapedPost = {
  id: string;
  batch_job_id: string;
  shortcode: string;
  post_url: string;
  caption: string;
  thumbnail_url: string | null;
  is_video: boolean;
  status: string;
  created_at: Date;
};

type ScrapedPostPayload = {
  batchJobId: string;
  post: SerializedScrapedPost;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/scrape-progress',
})
export class ScrapeProgressGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ScrapeProgressGateway.name);

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

    const batchJobId = client.handshake.query.batchJobId as string | undefined;
    if (batchJobId) {
      client.join(`batch-${batchJobId}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { batchJobId: string },
  ) {
    client.join(`batch-${data.batchJobId}`);
  }

  @OnEvent('scraped-post')
  handleScrapedPost(payload: ScrapedPostPayload) {
    this.server.to(`batch-${payload.batchJobId}`).emit('scraped-post', payload);
  }

  @OnEvent('batch-progress')
  handleProgress(payload: BatchProgressPayload) {
    this.server
      .to(`batch-${payload.batchJobId}`)
      .emit('batch-progress', payload);
  }
}
