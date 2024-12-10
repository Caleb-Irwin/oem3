import { router } from "../../trpc";
import { sprFlatFileRouter } from "./flatFile";
import { imagesRouter } from "./images";
import { sprPriceFileRouter } from "./priceFile";

export const sprRouter = router({
  flatFile: sprFlatFileRouter,
  priceFile: sprPriceFileRouter,
  images: imagesRouter,
});
