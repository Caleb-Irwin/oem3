import { TRPCError, initTRPC } from '@trpc/server';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { type CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import { type jwtFields } from './routers/user';
import { usersKv } from './utils/kv';
import { JWT_SECRET } from './env';
import { runDailyTasksIfNeeded } from './utils/scheduler';

export async function createContext(
	ctx: CreateExpressContextOptions | CreateWSSContextFnOptions
): Promise<{
	user: jwtFields | null;
	cookies?: Cookies;
}> {
	runDailyTasksIfNeeded();

	const { res, req } = ctx as CreateExpressContextOptions,
		cookies = new Cookies(req, res);

	try {
		const userToken = cookies.get('jwt') ?? req.headers.authorization;

		const user = userToken
			? (jwt.verify(userToken, JWT_SECRET) as unknown as jwtFields)
			: undefined;

		if (
			userToken &&
			user &&
			user.iat > parseInt((await usersKv.get('onlyValidAfterSeconds')) ?? '0')
		)
			return {
				user,
				cookies
			};
		else
			return {
				user: null,
				cookies
			};
	} catch (e) {
		if ((e as any)['name'] !== 'TokenExpiredError') console.log(e);
		return {
			user: null,
			cookies
		};
	}
}
export type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = publicProcedure.use<{
	user: jwtFields;
	cookies: Cookies;
}>((opts) => {
	const { ctx } = opts;
	if (ctx.user && ctx.user.permissionLevel === 'admin') return opts.next();
	else throw new TRPCError({ code: 'UNAUTHORIZED' });
});

export const generalProcedure = publicProcedure.use<{
	user: jwtFields;
	cookies: Cookies;
}>((opts) => {
	const { ctx } = opts;
	if (ctx.user && (ctx.user.permissionLevel === 'general' || ctx.user.permissionLevel === 'admin'))
		return opts.next();
	else throw new TRPCError({ code: 'UNAUTHORIZED' });
});

export const viewerProcedure = publicProcedure.use<{
	user: jwtFields;
	cookies: Cookies;
}>((opts) => {
	const { ctx } = opts;
	if (
		ctx.user &&
		(ctx.user.permissionLevel === 'viewer' ||
			ctx.user.permissionLevel === 'general' ||
			ctx.user.permissionLevel === 'admin')
	)
		return opts.next();
	else throw new TRPCError({ code: 'UNAUTHORIZED' });
});
