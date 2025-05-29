import { z } from "zod";
import { viewerProcedure } from "../trpc";
import EventEmitter, { on } from 'events';

export const eventSubscription = () => {
  const ee = new EventEmitter(); const update = (updateTopic = "default") => {
    ee.emit(updateTopic);
  };

  return {
    update,
    onUpdate: viewerProcedure.input(z.string().default("default")).subscription(
      async function* (opts) {
        // listen for new events
        for await (const _ of on(ee, opts.input, {
          // Passing the AbortSignal from the request automatically cancels the event emitter when the subscription is aborted
          signal: opts.signal,
        })) {
          yield null;
        }
      }
    ),
  };
};
