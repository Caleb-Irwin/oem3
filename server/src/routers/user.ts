import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { type PermissionLevel, users } from './users.table';
import { db } from '../db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { ADMIN_PASSWORD, JWT_SECRET } from '../env';

interface jwtFieldsInput {
	username: string;
	permissionLevel: PermissionLevel;
}

export interface jwtFields extends jwtFieldsInput {
	exp: number;
	iat: number;
}

export const userRouter = router({
	login: publicProcedure
		.input(
			z.object({
				username: z.string().min(3, 'Username must be at least 3 characters').toLowerCase(),
				password: z.string().min(8, 'Password must be at least 8 characters')
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { username, password } = input;
			let token: string = '';

			if (username === 'admin') {
				if (password === ADMIN_PASSWORD) {
					token = sign(username, 'admin');
					if (
						(await db.query.users.findFirst({
							where: eq(users.username, 'admin')
						})) === undefined
					)
						await db.insert(users).values({
							username: 'admin',
							passwordHash: '',
							permissionLevel: 'admin'
						});
				}
			} else {
				const user = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.username, username)
				});
				if (!user)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Incorrect Username'
					});

				if (
					user.passwordHash &&
					user.permissionLevel &&
					(await Bun.password.verify(password, user.passwordHash))
				)
					token = sign(user.username, user.permissionLevel);
			}

			if (token === '') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Incorrect Password'
				});
			}

			ctx.cookies?.set('jwt', token);

			return { token };
		}),
	logout: publicProcedure.mutation(({ ctx }) => {
		ctx.cookies?.set('jwt', '', { expires: new Date() });
	})
});

function sign(username: string, permissionLevel: PermissionLevel): string {
	return jwt.sign({ username, permissionLevel } satisfies jwtFieldsInput, JWT_SECRET, {
		expiresIn: '12h'
	});
}
