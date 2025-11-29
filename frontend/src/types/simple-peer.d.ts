/**
 * Déclarations de types pour simple-peer
 */
declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  namespace SimplePeer {
    interface Options {
      initiator?: boolean;
      stream?: MediaStream;
      trickle?: boolean;
      config?: RTCConfiguration;
      channelConfig?: RTCDataChannelInit;
      channelName?: string;
      sdpTransform?: (sdp: string) => string;
      streams?: MediaStream[];
    }

    interface Instance extends EventEmitter {
      signal(data: any): void;
      send(data: string | Buffer | ArrayBufferView): void;
      destroy(err?: Error): void;
      addStream(stream: MediaStream): void;
      removeStream(stream: MediaStream): void;
      addTrack(track: MediaStreamTrack, stream: MediaStream): void;
      removeTrack(track: MediaStreamTrack, stream: MediaStream): void;
      replaceTrack(
        oldTrack: MediaStreamTrack,
        newTrack: MediaStreamTrack,
        stream: MediaStream
      ): void;
      on(event: 'signal', listener: (data: any) => void): this;
      on(event: 'connect', listener: () => void): this;
      on(event: 'data', listener: (data: Buffer) => void): this;
      on(event: 'stream', listener: (stream: MediaStream) => void): this;
      on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
      on(event: 'close', listener: () => void): this;
      on(event: 'error', listener: (err: Error) => void): this;
    }
  }

  interface SimplePeerConstructor {
    new (opts?: SimplePeer.Options): SimplePeer.Instance;
    (opts?: SimplePeer.Options): SimplePeer.Instance;
  }

  const SimplePeer: SimplePeerConstructor;
  export = SimplePeer;
}
