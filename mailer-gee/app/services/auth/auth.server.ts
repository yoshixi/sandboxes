import { Authenticator } from "remix-auth";
import * as sessionStorage from "./session.server";

export type AuthUserType = {
  id: string;
  name: string;
  email: string;
};

const authenticator = new Authenticator<AuthUserType>(sessionStorage);

export default authenticator;
