export type AccessTokenRequestResponse = {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  scope: string;
  session_state: string;
  "not-before-policy": number;
};

export type AuthLogoutResult =
  | {
      status: "success";
    }
  | {
      status: "failure";
      error: Error;
    };

export type AuthLoginResult =
  | {
      status: "success";
      tokens: AccessTokenRequestResponse;
    }
  | {
      status: "failure";
      error: Error;
    };

export type AuthContextType = {
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<AuthLoginResult>;
  logout: () => Promise<AuthLogoutResult>;
  refreshAccessToken: () => Promise<void>;
  error: Error | null;
};

export type KeycloakClientConfig = {
  clientId: string;
  issuer: string;
  scopes: string[];
  signInRedirectUri: string;
};
