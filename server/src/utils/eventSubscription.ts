import { adminProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";

export const eventSubscription = () => {
  const eventEmitter = new EventEmitter(),
    update = () => eventEmitter.emit("update");

  return {
    update,
    onUpdate: adminProcedure.subscription(() => {
      return observable<null>((emit) => {
        eventEmitter.on("update", () => {
          emit.next(null);
        });
      });
    }),
  };
};
