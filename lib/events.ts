import { EventEmitter } from "node:events";

declare global {
  var __selfTeacherBus: EventEmitter | undefined;
}

const bus =
  globalThis.__selfTeacherBus ??
  (globalThis.__selfTeacherBus = new EventEmitter().setMaxListeners(0));

export type ProfileEvent =
  | { type: "session-created"; sessionId: string }
  | { type: "ping" };

export function publishProfileEvent(profileId: string, evt: ProfileEvent) {
  bus.emit(`profile:${profileId}`, evt);
}

export function subscribeProfile(
  profileId: string,
  handler: (evt: ProfileEvent) => void,
) {
  const channel = `profile:${profileId}`;
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}
