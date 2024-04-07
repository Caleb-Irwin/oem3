import { adminProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";

export const eventSubscription = () => {
  let subs = new Map();

  const update = () => subs.forEach((emit) => emit());

  return {
    update,
    onUpdate: adminProcedure.subscription(() => {
      return observable<null>((emit) => {
        console.log("+Sub");

        const id = crypto.randomUUID();
        subs.set(id, () => emit.next(null));
        return () => {
          console.log("-Sub");
          subs.delete(id);
        };
      });
    }),
  };
};
