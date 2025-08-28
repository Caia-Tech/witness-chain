import '@testing-library/jest-dom';

// Mock WebSocket for tests
global.WebSocket = class MockWebSocket {
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 3; // CLOSED
      if (this.onclose) {
        this.onclose(new CloseEvent('close'));
      }
    }, 100);
  }

  close() {
    this.readyState = 3;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send implementation
  }
};