import { OAuthRequestError } from "@lucia-auth/oauth";
import { Elysia, t } from "elysia";
import { LuciaError } from "lucia";
import { parseCookie, serializeCookie } from "lucia/utils";
import { googleAuth } from "../auth";
import { config } from "../config";
import { ctx } from "../context";
import { redirect } from "../lib";

class DuplicateEmailError extends Error {
  constructor() {
    super("Duplicate email");
  }
}

export const authController = new Elysia({
  prefix: "/auth",
})
  .use(ctx)
  // .post(
  //   "/signInOrUp",
  //   async ({ body: { handle, password, action }, auth, set }) => {
  //     let user;

  //     // Decide action based on the "action" param sent in body
  //     if (action === "signup") {
  //       user = await auth
  //         .createUser({
  //           key: {
  //             providerId: "basic",
  //             providerUserId: handle.toLowerCase(),
  //             password,
  //           },
  //           attributes: {
  //             handle,
  //           },
  //         })
  //         .catch((err) => {
  //           if (err.code === "SQLITE_CONSTRAINT") {
  //             throw new DuplicateEmailError();
  //           } else {
  //             throw err;
  //           }
  //         });
  //     } else if (action === "signin") {
  //       user = await auth.useKey("basic", handle.toLowerCase(), password);
  //     } else {
  //       throw new Error("Invalid action");
  //     }

  //     const session = await auth.createSession({
  //       userId: user.userId,
  //       attributes: {},
  //     });
  //     const sessionCookie = auth.createSessionCookie(session);

  //     set.headers["Set-Cookie"] = sessionCookie.serialize();
  //     set.headers["HX-Location"] = "/";
  //   },
  //   {
  //     body: t.Object({
  //       handle: t.String({
  //         minLength: 1,
  //         maxLength: 20,
  //       }),
  //       password: t.String({
  //         minLength: 4,
  //         maxLength: 255,
  //       }),
  //       action: t.Enum({
  //         signup: "signup",
  //         signin: "signin",
  //       }), // Enum to validate action type
  //     }),
  //     error({ code, error, set, log }) {

  //       log.error(error);

  //       let errorMessage = "";

  //       if (code === "VALIDATION") {
  //         errorMessage = "Invalid email or password";
  //       } else if (error instanceof DuplicateEmailError) {
  //         errorMessage = "Email already exists";
  //       } else if (
  //         error instanceof LuciaError &&
  //         (error.message === "AUTH_INVALID_KEY_ID" ||
  //           error.message === "AUTH_INVALID_PASSWORD")
  //       ) {
  //         errorMessage = "Invalid email or password";
  //       } else {
  //         errorMessage = "Internal server error";
  //       }

  //       set.status = "Unauthorized"; // set the status to 400 for all errors for simplicity

  //       return `${errorMessage}`;
  //     },
  //   },
  // )
  .post("/signout", async (ctx) => {
    const authRequest = ctx.auth.handleRequest(ctx);
    const session = await authRequest.validate();

    if (!session) {
      redirect(
        {
          set: ctx.set,
          headers: ctx.headers,
        },
        "/",
      );
      return;
    }

    await ctx.auth.invalidateSession(session.sessionId);

    const sessionCookie = ctx.auth.createSessionCookie(null);

    ctx.set.headers["Set-Cookie"] = sessionCookie.serialize();
    redirect(
      {
        set: ctx.set,
        headers: ctx.headers,
      },
      "/",
    );
  })
  .get("/login/google", async ({ set }) => {
    const [url, state] = await googleAuth.getAuthorizationUrl();

    const state_cookie = serializeCookie("google_auth_state", state, {
      maxAge: 60 * 60,
      httpOnly: true,
      secure: config.env.NODE_ENV === "production",
      path: "/",
    });
    set.headers["Set-Cookie"] = state_cookie;

    set.redirect = url.toString();
  })
  .get("/google/callback", async ({ set, query, headers, auth }) => {
    const { state, code } = query;
    const cookies = parseCookie(headers["cookie"] || "");
    const state_cookie = cookies["google_auth_state"];

    if (!state_cookie || !state || state_cookie != state || !code) {
      set.status = "Unauthorized";
      return;
    }

    try {
      const { createUser, getExistingUser, googleUser } =
        await googleAuth.validateCallback(code);

      const getUser = async () => {
        const existingUser = await getExistingUser();
        if (existingUser) {
          return existingUser;
        }
        const user = await createUser({
          attributes: {
            name: googleUser.name,
            email: googleUser.email ?? null,
            picture: googleUser.picture,
          },
        });
        return user;
      };
      const user = await getUser();
      const session = await auth.createSession({
        userId: user.userId,
        attributes: {},
      });
      const sessionCookie = auth.createSessionCookie(session);

      set.headers["Set-Cookie"] = sessionCookie.serialize();

      redirect(
        {
          set,
          headers,
        },
        "/",
      );
    } catch (e) {
      console.log(e, "Error signing in with Google");
      if (e instanceof OAuthRequestError) {
        set.status = "Unauthorized";
        return;
      } else {
        set.status = "Internal Server Error";
        return;
      }
    }
  });
