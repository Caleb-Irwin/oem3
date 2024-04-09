import { publicProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";

export const eventSubscription = () => {
  let subs = new Map();

  const update = () => subs.forEach((emit) => emit());

  return {
    update,
    onUpdate: publicProcedure.subscription(() => {
      return observable<null>((emit) => {
        const id = crypto.randomUUID();
        subs.set(id, () => emit.next(null));
        return () => {
          subs.delete(id);
        };
      });
    }),
  };
};
