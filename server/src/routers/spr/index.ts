import { router } from "../../trpc";
import { sprFlatFileRouter } from "./flatFile";

export const sprRouter = router({
  flatFile: sprFlatFileRouter,
});
