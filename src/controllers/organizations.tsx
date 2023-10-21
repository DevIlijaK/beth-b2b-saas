import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { config } from "../config";
import { ctx } from "../context";
import { organizations, user } from "../db/primary/schema";
import { pushToTenantDb } from "../db/tenant";
import { createDatabaseId, redirect, syncIfLocal } from "../lib";

export const organizationsController = new Elysia({
  prefix: "organizations",
})
  .use(ctx)
  .post(
    "/",
    async ({ body, session, set, headers, turso, db }) => {
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

      const dbName = `org-${createDatabaseId()}`;
      console.log("Proslo prvu: " + dbName);
      console.log("Nesto" + config.env.TURSO_API_KEY);
      console.log(
        "Nesto" +
          JSON.stringify({
            name: dbName,
            // group: "tenants",
          }),
      );

      // export class TursoClient {
      //   private BASE_URL = "https://api.turso.tech";
      //   constructor(private API_TOKEN: string) {}

      //   private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
      //     const res = await fetch(`${this.BASE_URL}${path}`, {
      //       ...options,
      //       headers: {
      //         Authorization: `Bearer ${this.API_TOKEN}`,
      //         ...options?.headers,
      //       },
      //     });
      //     if (!res.ok) {
      //       throw new Error(`Error fetching ${path}: ${res.statusText}`);
      //     }
      //     return res.json();
      //   }

      //   public databases: DatabaseAPI = {
      //     create: ({ name, location, image, group }) =>
      //       this.fetch("/v1/databases", {
      //         method: "POST",
      //         body: JSON.stringify({
      //           name,
      //           location,
      //           image,
      //           group,
      //         }),
      //       }),
      //   };
      // }
      const apiUrl = "https://api.turso.tech/v1/databases";
      const token = `Bearer ${config.env.TURSO_API_KEY}`;

      const requestData = {
        name: dbName,
        group: "tenants"
      };

      const requestHeaders = {
        Authorization: token,
        "Content-Type": "application/json",
      };
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestData),
      });
      
      type DatabaseInfo = {
        database: {
          DbId: string;
          Hostname: string;
          IssuedCertCount: number;
          IssuedCertLimit: number;
          Name: string;
        };
        password: string;
        username: string;
      }
      const responseData: DatabaseInfo | null = await response.json();
      if (responseData === null) {
        throw new Error("Response data is null");
      }
  
      console.log("Response Data:", responseData);
      // if (!res.ok) {
      //   throw new Error(
      //     `Error fetching ${`https://api.turso.tech/v1/databases`}`,
      //   );
      // }

      //   const {
      //     database: { Name },
      //   } = await turso.databases.create({
      //     name: dbName,
      //     group: "tenants",
      //   });
      const name = responseData.database.Name;
      console.log("Proslo prvu: " + name);
      console.log("Proslo drugu: " + name);
      // const { jwt } = await turso.logicalDatabases.mintAuthToken(
 
      // );
      // /v1/organizations/${org_slug}/databases/${db_name}/auth/tokens?${params.toString()}
      const jwtUrl = `https://api.turso.tech/v1/organizations/devilijak/databases/${dbName}/auth/tokens`;
      const jwtRequest = {
        org_slug: "devilijak",      
        db_name: dbName,
      }
      const jwtResponse = await fetch(jwtUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(jwtRequest),
      });
      type JWTResponse = {
        jwt: string
      }
      const jwtResponseJSON: JWTResponse | null = await jwtResponse.json();
      if (jwtResponseJSON === null) {
        throw new Error("Response data is null");
      }
      console.log("Proslo 1: " + JSON.stringify(jwtResponseJSON));
      const jwt = jwtResponseJSON.jwt;

      await pushToTenantDb({
        dbName: name,
        authToken: jwt,
      });
      console.log("Proslo 2: " + name);
      const [result] = await db
        .insert(organizations)
        .values({
          name: body.organizationName,
          database_name: name,
          database_auth_token: jwt,
        })
        .returning({
          id: organizations.id,
        });
        console.log("Proslo 3: " + name);
      if (!result) {
        set.status = `Internal Server Error`;
        return "Internal Server Error";
      }
      console.log("Proslo 4: " + name);
      await db
        .update(user)
        .set({
          organization_id: result.id,
        })
        .where(eq(user.id, session.user.id));
        console.log("Proslo drugu: " + name);
      await syncIfLocal();
    },
    {
      body: t.Object({
        organizationName: t.String({
          minLength: 1,
          maxLength: 30,
        }),
      }),
    },
  )
  .post(
    "/join",
    async ({ body, session, set, headers, turso, db }) => {
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

      const organization = await db.query.organizations.findFirst({
        where: (organizations, { eq }) =>
          eq(organizations.database_name, body.organizationCode),
      });

      if (!organization) {
        set.status = `Not Found`;
        return "Organization not found";
      }

      await db
        .update(user)
        .set({
          organization_id: organization.id,
        })
        .where(eq(user.id, session.user.id));
      await syncIfLocal();
    },
    {
      body: t.Object({
        organizationCode: t.String({
          minLength: 11,
          maxLength: 11,
        }),
      }),
    },
  );
