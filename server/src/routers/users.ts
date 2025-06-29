import { z } from 'zod';
import { db } from '../db';
import { adminProcedure, router } from '../trpc';
import { permissionLevelEnumZod, users } from './users.table';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { eventSubscription } from '../utils/eventSubscription';
import { usersKv } from '../utils/kv';

const { update, createSub } = eventSubscription();

export const usersRouter = router({
	all: adminProcedure.query(async () => {
		return await db.query.users.findMany();
	}),
	allSub: createSub(async ({ ctx }) => {
		if (ctx.user.permissionLevel !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED' });
		return await db.query.users.findMany();
	}),
	create: adminProcedure
		.input(
			z.object({
				username: z.string().min(3, 'Username must be at least 3 characters').toLowerCase(),
				password: z.string().min(8, 'Password must be at least 8 characters'),
				permissionLevel: permissionLevelEnumZod
			})
		)
		.mutation(async (opts) => {
			const res = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.username, opts.input.username)
			});

			if (res || opts.input.username === 'admin')
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Username Already Taken'
				});

			await db.insert(users).values({
				username: opts.input.username,
				passwordHash: await Bun.password.hash(opts.input.password),
				permissionLevel: opts.input.permissionLevel
			});
			update();
		}),
	changePassword: adminProcedure
		.input(
			z.object({
				username: z.string(),
				password: z.string().min(8, 'Password must be at least 8 characters')
			})
		)
		.mutation(async ({ input: { username, password } }) => {
			const user = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.username, username)
			});

			if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

			await db
				.update(users)
				.set({ passwordHash: await Bun.password.hash(password) })
				.where(eq(users.username, username));
		}),
	delete: adminProcedure
		.input(z.object({ username: z.string() }))
		.mutation(async ({ input: { username } }) => {
			await db.delete(users).where(eq(users.username, username));
			update();
		}),
	invalidateAll: adminProcedure.mutation(async () => {
		await usersKv.set('onlyValidAfterSeconds', Math.round(Date.now() / 1000).toString());
	})
});
