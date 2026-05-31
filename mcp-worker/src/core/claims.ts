// The verified MGT-JWT claims a per-app MCP receives from the gateway.
// Shape is locked by MCP_PLATFORM_REQUIREMENTS.md §5.2.

export interface MgtClaims {
  iss: string;
  sub: string; // Supabase auth.users.id of the OS user
  email: string;
  name: string;
  is_admin: boolean;
  apps: string[];
  scopes: Record<string, string[]>;
  iat: number;
  exp: number;
}

export type Scope = "read" | "write" | "delete";
