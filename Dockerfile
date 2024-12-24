# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS svelte-install
RUN mkdir -p /temp/svelte/dev/
COPY /svelte/package.json /svelte/bun.lockb /temp/svelte/dev/
RUN cd /temp/svelte/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/svelte/prod
COPY /svelte/package.json /svelte/bun.lockb /temp/svelte/prod/
RUN cd /temp/svelte/prod && bun install --frozen-lockfile --production

FROM base AS server-install
RUN mkdir -p /temp/server/prod/
COPY /server/package.json /server/bun.lockb /temp/server/prod/
RUN cd /temp/server/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS svlete-prerelease
COPY --from=svelte-install /temp/svelte/dev/node_modules /node_modules
COPY /svelte/. .

# [optional] tests & build
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=svelte-install /temp/svelte/prod/node_modules ./svelte/node_modules
COPY --from=svlete-prerelease /usr/src/app/build/. ./svelte/build/.
COPY --from=svlete-prerelease /usr/src/app/package.json ./svelte/.
COPY /server/. ./server/.
COPY --from=server-install /temp/server/prod/node_modules ./server/node_modules

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT cd server && bun start.ts