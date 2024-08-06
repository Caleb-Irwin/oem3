import { z } from "zod";
import { publicProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";

export const eventSubscription = () => {
  const subs = new Map<string, { next: () => void; topic: string }>();
  const update = (updateTopic = "default") => {
    subs.forEach(({ next, topic }) => {
      if (updateTopic === topic) next();
    });
  };

  return {
    update,
    onUpdate: publicProcedure
      .input(z.string().default("default"))
      .subscription(({ input: topic }) => {
        return observable<null>((emit) => {
          const id = crypto.randomUUID();
          subs.set(id, {
            next: () => emit.next(null),
            topic,
          });
          return () => {
            subs.delete(id);
          };
        });
      }),
  };
};
