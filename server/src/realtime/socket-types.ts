import { Socket } from "socket.io";

export interface AuthenticatedUserData {
  userId: string;
  email: string;
  username: string;
  name: string;
}

export interface SocketData {
  user: AuthenticatedUserData;
  userId: string;
}

export interface ServerToClientEvents {
  [event: string]: (...args: any[]) => void;
}

export interface ClientToServerEvents {
  [event: string]: (...args: any[]) => void;
}

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  SocketData
>;
