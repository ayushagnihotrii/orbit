import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiModerationResult {
  toxicityScore: number;
  flagged: boolean;
}

@Injectable()
export class AiModerationClient {
  private readonly logger = new Logger(AiModerationClient.name);

  constructor(private readonly configService: ConfigService) {}

  async score(text: string): Promise<AiModerationResult> {
    const baseUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8001',
    );

    try {
      const response = await fetch(`${baseUrl}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(
          `AI moderation service responded with status ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        toxicity_score: number;
        flagged: boolean;
      };
      return { toxicityScore: data.toxicity_score, flagged: data.flagged };
    } catch (error) {
      // Never let an unreachable AI service block publishing — the profanity
      // filter still runs, and content can always be caught later via reports.
      this.logger.warn(
        `AI moderation service unavailable, continuing without it: ${(error as Error).message}`,
      );
      return { toxicityScore: 0, flagged: false };
    }
  }
}
