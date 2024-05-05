import { z } from "zod";
import { db } from "../../db";
import { files } from "../../db/db";
import { generalProcedure } from "../trpc";

export const upload = (
  type: string,
  verifyFunction: (blob: string, fileType: string) => Promise<void>
) => {
  return {
    upload: generalProcedure
      .input(z.object({ file: z.string(), fileName: z.string() }))
      .mutation(
        async ({
          input: { file, fileName },
          ctx: {
            user: { username },
          },
        }) => {
          const blobHeader = file.slice(0, file.indexOf("base64,")),
            fileType = blobHeader.slice(5, blobHeader.length - 1);

          await verifyFunction(file, fileType);

          const { fileId } = (
            await db
              .insert(files)
              .values({
                content: file,
                type,
                name: fileName,
                author: username,
                uploadedTime: Date.now(),
              })
              .returning({ fileId: files.id })
          )[0];

          return { fileId };
        }
      ),
  };
};
