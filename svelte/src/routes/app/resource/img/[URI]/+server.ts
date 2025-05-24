import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
    const originalURL = decodeURIComponent(params.URI)
    let newURL = originalURL;
    if (originalURL.startsWith("https://img.shopofficeonline.com/venxia/") || originalURL.startsWith("https://shopofficeonline.com/ProductImages/")) {
        newURL = await locals.client.resources.getImageUrl.query({ originalURL, thumbnail: url.search.includes("thumbnail") });
    }
    throw redirect(307, newURL)
};
