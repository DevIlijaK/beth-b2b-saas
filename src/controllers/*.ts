import Elysia from "elysia";
import { authController } from "./auth";
import { organizationsController } from "./organizations";
// import { tweetsController } from "./tweets";

export const api = new Elysia({
  prefix: "/api",
})
  .use(authController)
  .use(organizationsController)
  // .use(tweetsController);
