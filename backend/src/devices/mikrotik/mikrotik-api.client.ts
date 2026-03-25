import * as net from 'net';

export interface RouterOSResponse {
  [key: string]: string;
}

export interface SystemResources {
  uptime: string;
  uptimeSeconds: number;
  cpuLoad: number;
  memoryUsed: number;
  totalMemory: number;
  boardName: string;
  version: string;
}

export interface InterfaceInfo {
  name: string;
  type: string;
  macAddress: string;
  running: boolean;
  disabled: boolean;
  txByte: number;
  rxByte: number;
  txPacket: number;
  rxPacket: number;
}

export class MikrotikApiClient {
  private socket: net.Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private resolvers: Array<{
    resolve: (data: RouterOSResponse[]) => void;
    reject: (err: Error) => void;
    results: RouterOSResponse[];
  }> = [];
  private connected = false;

  constructor(
    private readonly host: string,
    private readonly port: number = 8728,
    private readonly timeout: number = 10000,
  ) {}

  private encodeLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x4000) {
      len |= 0x8000;
      return Buffer.from([(len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x200000) {
      len |= 0xc00000;
      return Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x10000000) {
      len |= 0xe0000000;
      return Buffer.from([
        (len >> 24) & 0xff,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    }
    return Buffer.from([
      0xf0,
      (len >> 24) & 0xff,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  }

  private encodeWord(word: string): Buffer {
    const wordBuf = Buffer.from(word, 'utf8');
    return Buffer.concat([this.encodeLength(wordBuf.length), wordBuf]);
  }

  private encodeSentence(words: string[]): Buffer {
    const parts = words.map((w) => this.encodeWord(w));
    parts.push(Buffer.from([0x00]));
    return Buffer.concat(parts);
  }

  private decodeLength(buf: Buffer, pos: number): { len: number; bytesUsed: number } {
    const b = buf[pos];
    if ((b & 0x80) === 0) {
      return { len: b, bytesUsed: 1 };
    } else if ((b & 0xc0) === 0x80) {
      return { len: ((b & 0x3f) << 8) | buf[pos + 1], bytesUsed: 2 };
    } else if ((b & 0xe0) === 0xc0) {
      return {
        len: ((b & 0x1f) << 16) | (buf[pos + 1] << 8) | buf[pos + 2],
        bytesUsed: 3,
      };
    } else if ((b & 0xf0) === 0xe0) {
      return {
        len:
          ((b & 0x0f) << 24) |
          (buf[pos + 1] << 16) |
          (buf[pos + 2] << 8) |
          buf[pos + 3],
        bytesUsed: 4,
      };
    }
    return {
      len:
        (buf[pos + 1] << 24) |
        (buf[pos + 2] << 16) |
        (buf[pos + 3] << 8) |
        buf[pos + 4],
      bytesUsed: 5,
    };
  }

  private processBuffer(): void {
    let pos = 0;
    const sentences: string[][] = [];
    let currentSentence: string[] = [];

    while (pos < this.buffer.length) {
      if (this.buffer.length - pos < 1) break;
      const { len, bytesUsed } = this.decodeLength(this.buffer, pos);
      pos += bytesUsed;

      if (len === 0) {
        sentences.push(currentSentence);
        currentSentence = [];
        continue;
      }

      if (pos + len > this.buffer.length) {
        pos -= bytesUsed;
        break;
      }

      const word = this.buffer.slice(pos, pos + len).toString('utf8');
      pos += len;
      currentSentence.push(word);
    }

    this.buffer = this.buffer.slice(pos);

    for (const sentence of sentences) {
      this.processSentence(sentence);
    }
  }

  private processSentence(sentence: string[]): void {
    if (sentence.length === 0) return;

    const resolver = this.resolvers[0];
    if (!resolver) return;

    const type = sentence[0];
    const attrs: RouterOSResponse = {};

    for (let i = 1; i < sentence.length; i++) {
      const word = sentence[i];
      if (word.startsWith('=')) {
        const eqIdx = word.indexOf('=', 1);
        if (eqIdx !== -1) {
          attrs[word.slice(1, eqIdx)] = word.slice(eqIdx + 1);
        }
      }
    }

    if (type === '!re') {
      resolver.results.push(attrs);
    } else if (type === '!done') {
      this.resolvers.shift();
      resolver.resolve(resolver.results);
    } else if (type === '!trap') {
      this.resolvers.shift();
      resolver.reject(new Error(attrs['message'] || 'RouterOS API error'));
    } else if (type === '!fatal') {
      this.resolvers.shift();
      resolver.reject(new Error(attrs['message'] || 'RouterOS fatal error'));
    }
  }

  async connect(username: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      const timeoutHandle = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error(`Connection to ${this.host}:${this.port} timed out`));
      }, this.timeout);

      this.socket.connect(this.port, this.host, async () => {
        clearTimeout(timeoutHandle);
        this.socket!.on('data', (data: Buffer) => {
          this.buffer = Buffer.concat([this.buffer, data]);
          this.processBuffer();
        });
        this.socket!.on('error', (err) => {
          this.resolvers.forEach((r) => r.reject(err));
          this.resolvers = [];
        });
        this.socket!.on('close', () => {
          this.connected = false;
        });

        try {
          await this.send(['/login', `=name=${username}`, `=password=${password}`]);
          this.connected = true;
          resolve();
        } catch (err) {
          this.socket?.destroy();
          reject(err);
        }
      });

      this.socket.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`Cannot connect to ${this.host}:${this.port} - ${err.message}`));
      });
    });
  }

  async send(words: string[]): Promise<RouterOSResponse[]> {
    return new Promise((resolve, reject) => {
      this.resolvers.push({ resolve, reject, results: [] });
      const sentence = this.encodeSentence(words);
      this.socket?.write(sentence);
    });
  }

  disconnect(): void {
    this.connected = false;
    this.socket?.destroy();
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.resolvers = [];
  }

  isConnected(): boolean {
    return this.connected && this.socket !== null && !this.socket.destroyed;
  }

  async getSystemResources(): Promise<SystemResources> {
    const result = await this.send(['/system/resource/print']);
    if (!result.length) throw new Error('No system resource data received');
    const r = result[0];

    const uptimeStr = r['uptime'] || '0s';
    const uptimeSeconds = this.parseUptimeToSeconds(uptimeStr);

    const freeMemory = parseInt(r['free-memory'] || '0', 10);
    const totalMemory = parseInt(r['total-memory'] || '0', 10);
    const memoryUsed = totalMemory - freeMemory;

    return {
      uptime: uptimeStr,
      uptimeSeconds,
      cpuLoad: parseInt(r['cpu-load'] || '0', 10),
      memoryUsed,
      totalMemory,
      boardName: r['board-name'] || 'Unknown',
      version: r['version'] || 'Unknown',
    };
  }

  async getInterfaces(): Promise<InterfaceInfo[]> {
    const results = await this.send(['/interface/print', '=stats=']);
    return results.map((r) => ({
      name: r['name'] || '',
      type: r['type'] || '',
      macAddress: r['mac-address'] || '',
      running: r['running'] === 'true',
      disabled: r['disabled'] === 'true',
      txByte: parseInt(r['tx-byte'] || '0', 10),
      rxByte: parseInt(r['rx-byte'] || '0', 10),
      txPacket: parseInt(r['tx-packet'] || '0', 10),
      rxPacket: parseInt(r['rx-packet'] || '0', 10),
    }));
  }

  async getBoardInfo(): Promise<{ model: string; version: string }> {
    const resources = await this.getSystemResources();
    return { model: resources.boardName, version: resources.version };
  }

  private parseUptimeToSeconds(uptime: string): number {
    let total = 0;
    const weeks = uptime.match(/(\d+)w/);
    const days = uptime.match(/(\d+)d/);
    const hours = uptime.match(/(\d+)h/);
    const minutes = uptime.match(/(\d+)m/);
    const seconds = uptime.match(/(\d+)s/);
    if (weeks) total += parseInt(weeks[1]) * 7 * 24 * 3600;
    if (days) total += parseInt(days[1]) * 24 * 3600;
    if (hours) total += parseInt(hours[1]) * 3600;
    if (minutes) total += parseInt(minutes[1]) * 60;
    if (seconds) total += parseInt(seconds[1]);
    return total;
  }
}
