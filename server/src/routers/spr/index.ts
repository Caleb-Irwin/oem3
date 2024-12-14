import { router } from "../../trpc";
import { sprFlatFileRouter } from "./flatFile";
import { enhancedContentRouter } from "./enhancedContent";
import { sprPriceFileRouter } from "./priceFile";

export const sprRouter = router({
  flatFile: sprFlatFileRouter,
  priceFile: sprPriceFileRouter,
  enhancedContent: enhancedContentRouter,
});
