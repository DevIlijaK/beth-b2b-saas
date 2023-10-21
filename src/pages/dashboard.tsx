import Elysia from "elysia";
import { ctx } from "../context";
import { organizations } from "../db/primary/schema";
import { redirect } from "../lib";
import { BaseHtml } from "../components/base";

export const dashboard = new Elysia()
  .use(ctx)
  .get("/dashboard", async ({ db, session, headers, set }) => {
    if (!session) {
        redirect({ set, headers}, "/login");
        return;
    }
    const orgId = session.user.organization_id;
    if(!orgId) {
        redirect({ set, headers}, "/new-user");
        return;
    }


    const organization = await db.query.organizations.findFirst({
      where: (organization, { eq }) =>
        eq(organization.id, orgId),
    });
    if(!organization){
        redirect({ set, headers}, "/new-user");
        return;
    }
    return (
        <BaseHtml>
        <h1>
            {organization.name} | {session.user.name}
        </h1>
        </BaseHtml>
    )
  });
