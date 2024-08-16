type PeerId = string;
type Code = string;

type PeerUser = {
  id: string;
  name: string;
  email: string;
  image: string;
  peerId: PeerId;
  muted: boolean;
  visible: boolean;
};

type PeerUserWithSocketId = { socketId: string } & PeerUser;

export type KeyValue<T> = Record<string, T>;

export interface ClientToServerEvents {
  "user:join-request": ({}: {
    code: Code;
    user: PeerUser;
    ownerId: string;
  }) => void;
  "user:accepted": ({}: { code: Code; user: PeerUserWithSocketId }) => void;
  "user:rejected": ({}: { code: Code; user: PeerUserWithSocketId }) => void;
  "meeting:join": ({}: { code: Code; user: PeerUserWithSocketId }) => void;
  "user:toggle-audio": (peerId: PeerId) => void;
  "user:toggle-video": (peerId: PeerId) => void;
}
export interface ServerToClientEvents {
  "meeting:full": () => void;
  "user:accepted": ({}: { code: Code; user: PeerUser }) => void;
  "user:rejected": ({}: { code: Code; user: PeerUser }) => void;
  "user:wait-for-owner": () => void;
  "user:join-request": (user: PeerUserWithSocketId) => void;
  "user:joined": (user: PeerUser) => void;
  "user:toggle-audio": (peerId: PeerId) => void;
  "user:toggle-video": (peerId: PeerId) => void;
  "user:left": (peerId: PeerId) => void;
}
