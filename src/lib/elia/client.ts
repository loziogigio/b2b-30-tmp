import { StreamEvent } from './types';

// Use proxy route to keep API URL server-side
const API_URL = '/api/proxy/b2b';

export class EliaClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Stream search with Server-Sent Events
   */
  async *streamSearch(message: string): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/elia/stream?message=${encodeURIComponent(message)}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event: StreamEvent = JSON.parse(data);
              yield event;
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Direct search (non-streaming)
   */
  async search(message: string, context?: any) {
    const response = await fetch(`${this.baseUrl}/elia/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  private getToken(): string {
    if (typeof window !== 'undefined') {
      // Try to get token from localStorage
      const token =
        localStorage.getItem('auth_token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('token');
      return token || '';
    }
    return '';
  }
}

export const eliaClient = new EliaClient();
