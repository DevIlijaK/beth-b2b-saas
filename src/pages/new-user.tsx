import Elysia from "elysia";
import { BaseHtml } from "../components/base";
import { ctx } from "../context";
import { redirect } from "../lib";

export const newUser = new Elysia()
  .use(ctx)
  .get("/new-user", async ({ html, session, set, headers }) => {
    console.log("Sesija je: ", session);
    if (!session) {
      redirect(
        {
          set,
          headers,
        },
        "/login",
      );
      return;
    }
    return html(() => (
      <BaseHtml>
        <main class="flex w-full flex-col items-center justify-center gap-5">
          <div>
            <h1 safe class="text-3xl font-bold">
              hi new user {session.user.name}
            </h1>
            <p>Do you want to join or create a organisation?</p>
            <form
              hx-post="/api/organizations"
              class="flex flex-col items-center justify-center gap-5"
            >
              <input name="organizationName" placeholder="organization name" />
              <button type="submit">Create organization</button>
            </form>
            <form
              class="flex flex-col items-center justify-center gap-5"
              hx-post="/api/organizations/join"
            >
              <input name="organizationCode" placeholder="organization code" />
              <button type="submit">Join organization</button>
            </form>
            <button
              hx-post="/api/auth/signout"
              class="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              Sign Out
            </button>
          </div>
        </main>
      </BaseHtml>
    ));
  });
