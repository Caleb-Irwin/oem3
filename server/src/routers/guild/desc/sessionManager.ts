const PUBLIC_V_HOST = "https://test.shopofficeonline.com"; // TODO: add to env?

import setCookieParser from "set-cookie-parser";

export interface Session {
  vSession: string;
  vRememberMe: string;
  vAuthorization: string;
  vUserId: string;
  vStoreId: string;
  vCartId: null | string;
  lang: "en" | "fr";
}

async function getSession(
  previousSession: Session | undefined,
  mode: "default" | "refresh" | "new" = "default"
): Promise<{ contents?: Session }> {
  const originalSession = mode === "new" ? null : previousSession;
  if (originalSession && mode !== "refresh")
    return { contents: originalSession };

  const res = await fetch(PUBLIC_V_HOST, {
    headers: {
      cookie:
        originalSession !== null && mode !== "new"
          ? `REMEMBERME=${originalSession?.vRememberMe}; SESSION=${originalSession?.vSession}`
          : "",
    },
  }),
    text = await res.text();

  const setCookies = setCookieParser(res.headers.getSetCookie(), {
    map: true,
  }),
    rememberMe =
      setCookies["REMEMBERME"]?.value ?? originalSession?.vRememberMe,
    session = setCookies["SESSION"]?.value ?? originalSession?.vSession,
    authorization = /Bearer .+?(?=')/.exec(text)?.[0] ?? "",
    userId = /addItemToCart\(.*?,.*?,.*?,\\'(\d+).*?\)/.exec(text)?.[1] ?? "",
    storeId = /addItemToCart\(\\'(\d+).*?\)/.exec(text)?.[1] ?? "",
    cartId = originalSession?.vCartId ?? null;

  if (!(rememberMe?.length > 0 && session?.length > 0)) return {};

  const tokenPayload: Session = {
    vSession: session,
    vRememberMe: rememberMe,
    vAuthorization: authorization,
    vUserId: userId,
    vStoreId: storeId,
    vCartId: cartId,
    lang: "en",
  };
  return {
    contents: tokenPayload,
  };
}

export class SessionManager {
  private initing: boolean = false;
  private inited: boolean = false;
  private session: Session | undefined;
  ready: Promise<void>;
  private resolveReady: undefined | (() => void);

  constructor() {
    this.ready = new Promise<void>((res) => {
      this.resolveReady = res;
    });
  }

  async init(
    previousSession?: Session,
    mode: "default" | "refresh" | "new" = "default"
  ) {
    this.initing = true;
    const sessionFull = await getSession(previousSession, mode);
    if (sessionFull.contents === undefined)
      throw new Error("Failed to create session");
    this.session = sessionFull.contents;
    this.inited = true;
    this.initing = false;
    if (this.resolveReady) this.resolveReady();
  }

  private async readyGuard() {
    if (this.inited) return;
    else if (this.initing) {
      await this.ready;
      return;
    } else {
      throw new Error("Must init() first!");
    }
  }

  get s() {
    if (!this.inited) throw new Error("Must init() first!");
    return this.session as Session;
  }

  async update(partialSession: Partial<Session>) {
    await this.readyGuard();
    const originalSession = { ...this.session } as Session,
      newSession: Session = {
        ...originalSession,
        ...partialSession,
      };

    if (originalSession.vSession !== newSession.vSession) {
      await this.init(newSession, "refresh");
    } else {
      this.session = newSession as Session;
    }
  }

  private async updateFromResponse(res: Response) {
    await this.readyGuard();
    const setCookies = setCookieParser(res.headers.getSetCookie(), {
      map: true,
    });

    if (setCookies["SESSION"]?.value) {
      await this.update({
        vSession: setCookies["SESSION"]?.value,
        vRememberMe:
          setCookies["REMEMBERME"]?.value ?? this.session?.vRememberMe,
      });
    } else if (setCookies["REMEMBERME"]?.value) {
      await this.update({
        vRememberMe: setCookies["REMEMBERME"]?.value,
      });
    }
  }

  async req(
    path: string,
    reqInit?: RequestInit,
    conf?: ReqConf,
    customFetch?: typeof fetch,
    retry = true
  ): Promise<Response> {
    await this.readyGuard();

    const res = await req(
      path,
      this.session as Session,
      reqInit,
      conf,
      customFetch
    );

    await this.updateFromResponse(res);

    if (res.status === 401 && retry) {
      await this.init(undefined, "refresh");
      return await this.req(path, reqInit, conf, customFetch, false);
    }

    return res;
  }
}

export interface ReqConf {
  authorization?: null | string;
  cookies?: {
    session?: null | string;
    rememberme?: null | string;
    others?: string;
  } | null;
  query?: {
    storeId?: null | string;
    langId?: null | "en" | "fr";
    userId?: null | string;
    cartId?: null | string;
    deptId?: null | "0";
  } | null;
  customQuery?: {
    [name: string]: string;
  };
}

export async function req(
  path: string,
  session: Session,
  reqInit?: RequestInit,
  conf: ReqConf = {},
  customFetch?: typeof fetch
) {
  const url = new URL(PUBLIC_V_HOST);
  url.pathname = path;
  if (conf.query !== null) {
    conf.query?.storeId !== null &&
      url.searchParams.append(
        "storeId",
        conf.query?.storeId ?? session.vStoreId
      );
    conf.query?.langId !== null &&
      url.searchParams.append("langId", conf.query?.langId ?? session.lang);
    conf.query?.userId !== null &&
      url.searchParams.append("userId", conf.query?.userId ?? session.vUserId);
    conf.query?.cartId !== null &&
      url.searchParams.append(
        "cartId",
        conf.query?.cartId ?? session.vCartId ?? "0"
      );
    conf.query?.deptId !== null &&
      url.searchParams.append("deptId", conf.query?.deptId ?? "0");
  }
  if (conf.customQuery) {
    Object.keys(conf.customQuery).forEach((name) => {
      // @ts-expect-error can not be undefined
      url.searchParams.append(name, conf.customQuery[name]);
    });
  }
  const req = new Request(url as any, reqInit);
  if (conf.authorization !== null)
    req.headers.set(
      "authorization",
      conf.authorization ?? session.vAuthorization
    );
  if (conf.cookies !== null)
    req.headers.set(
      "cookie",
      `REMEMBERME=${conf.cookies?.rememberme ?? session.vRememberMe}; SESSION=${conf.cookies?.session ?? session.vSession
      }${conf.cookies?.others ? ";" + conf.cookies?.others : ""}`
    );
  return await (customFetch ?? fetch)(req);
}
