import { decodeJwtPayload, getCurrentRoleFromJwt } from "../../src/utils/jwt";

// Tokens con firma ficticia: solo se leen los claims, no se valida la firma.
const WORKER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJlbWFpbCI6ImFAYi5jb20iLCJjdXJyZW50X3JvbGUiOiJ3b3JrZXIifQ.sig";
const CLIENT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0yIiwiY3VycmVudF9yb2xlIjoiY2xpZW50In0.sig";
const NO_ROLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0zIn0.sig";
const UNKNOWN_ROLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci00IiwiY3VycmVudF9yb2xlIjoiYWRtaW4ifQ.sig";

describe("jwt utils", () => {
  describe("decodeJwtPayload", () => {
    it("decodes the payload of a valid token", () => {
      expect(decodeJwtPayload(WORKER_TOKEN)).toEqual({
        user_id: "user-123",
        email: "a@b.com",
        current_role: "worker",
      });
    });

    it("returns null for empty, malformed or unparseable tokens", () => {
      expect(decodeJwtPayload(null)).toBeNull();
      expect(decodeJwtPayload(undefined)).toBeNull();
      expect(decodeJwtPayload("")).toBeNull();
      expect(decodeJwtPayload("not-a-jwt")).toBeNull();
      expect(decodeJwtPayload("aaa.%%%.ccc")).toBeNull();
    });
  });

  describe("getCurrentRoleFromJwt", () => {
    it("returns the role from the JWT claim", () => {
      expect(getCurrentRoleFromJwt(WORKER_TOKEN)).toBe("worker");
      expect(getCurrentRoleFromJwt(CLIENT_TOKEN)).toBe("client");
    });

    it("returns null when the token has no known role", () => {
      expect(getCurrentRoleFromJwt(NO_ROLE_TOKEN)).toBeNull();
      expect(getCurrentRoleFromJwt(UNKNOWN_ROLE_TOKEN)).toBeNull();
      expect(getCurrentRoleFromJwt(null)).toBeNull();
      expect(getCurrentRoleFromJwt("garbage")).toBeNull();
    });
  });
});
