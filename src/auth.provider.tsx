
import React from "react";
import {
  DiscoveryDocument,
  useAuthRequest,
  useAutoDiscovery,
} from "expo-auth-session";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useMemo, useState } from "react";
import authTokenService from "./auth-token.service";
import { AuthContextType, KeycloakClientConfig } from "./auth-types";
import AuthContext from "./auth.context";
import authService from "./auth.service";
import { isDef } from "./utils";

/**
 * AuthProvider component that provides authentication context to its children.
 *
 * @param {Object} props - The component props
 * @param {React.ReactNode} props.children - The child components
 * @param {KeycloakClientConfig} props.config - The Keycloak client configuration
 * @returns {JSX.Element} The AuthProvider component
 */
export default function AuthProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: KeycloakClientConfig;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const discovery = useAutoDiscovery(config.issuer);


  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri: config.signInRedirectUri,
      scopes: config.scopes,
    },
    discovery
  );

  const refreshAccessToken = useCallback(async () => {
    await authTokenService.refreshTokens();
  }, []);

  /**
   * Initializes authentication by retrieving tokens from secure storage.
   *
   * @param {string} [tokenEndpoint] - The token endpoint URL
   */
  const handleInitAuth = useCallback(
    async (discovery: DiscoveryDocument) => {
      authService.init({
        discovery,
        config: config,
      });

      authTokenService.init({
        clientId: config.clientId,
        tokenEndpoint: discovery.tokenEndpoint ?? "",
      });

      try {
        const tokens = await authTokenService.retrieveTokens();

        if (!isDef(tokens)) {
          throw new Error("No tokens found in secure storage");
        }

        const { accessToken, refreshToken, idToken } = tokens;

        if (!isDef(accessToken)) {
          throw new Error("No access token found in secure storage");
        }

        if (!isDef(refreshToken)) {
          throw new Error("No refresh token found in secure storage");
        }

        if (!isDef(idToken)) {
          throw new Error("No id token found in secure storage");
        }

        const decodedAccessToken = jwtDecode(accessToken);

        if (
          isDef(decodedAccessToken.exp) &&
          decodedAccessToken.exp < Date.now() / 1000
        ) {
          console.info("Access token expired, attempting to refresh");

          if (!discovery.tokenEndpoint) {
            throw new Error("No token endpoint provided, aborting refresh");
          }

          await authTokenService.refreshTokens();

          console.info("Access token refreshed");
        }

        setIsAuthenticated(true);
      } catch (e) {
        console.warn(e);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    },
    [config]
  );

  /**
   * Logs in the user by prompting for authentication and retrieving tokens.
   *
   * @returns {Promise<{status: string, tokens?: any, error?: Error}>} The login status and tokens or error
   */
  const login: AuthContextType["login"] = useCallback(async () => {
    try {
      const promptAsyncResponse = await promptAsync();

      if (!isDef(request)) {
        throw new Error("No request found");
      }

      if (
        !isDef(promptAsyncResponse) ||
        promptAsyncResponse.type !== "success"
      ) {
        throw new Error("No success in promptAsyncResponse");
      }

      if (!isDef(promptAsyncResponse.params.code)) {
        throw new Error("No code in promptAsyncResponse");
      }

      if (!isDef(request.codeVerifier)) {
        throw new Error("No code verifier in request");
      }

      const tokens = await authService.requestAccessToken({
        authorizationCode: promptAsyncResponse.params.code,
        codeVerifier: request.codeVerifier,
      });

      if (!isDef(tokens)) {
        throw new Error("Tokens not defined");
      }

      await authTokenService.storeTokens(tokens);

      setIsAuthenticated(true);
      return {
        status: "success",
        tokens,
      };
    } catch (e) {
      setIsAuthenticated(false);
      console.error(e);
      return {
        status: "failure",
        error: e as Error,
      };
    }
  }, [promptAsync, request]);

  /**
   * Logs out the user by ending the session and removing tokens.
   *
   * @returns {Promise<{status: string, error?: Error}>} The logout status and error if any
   */
  const logout: AuthContextType["logout"] = useCallback(async () => {
    try {
      await authService.endSession();

      await authTokenService.removeTokens();

      setIsAuthenticated(false);

      return {
        status: "success",
      };
    } catch (e) {
      console.error(e);
      return {
        status: "failure",
        error: e as Error,
      };
    }
  }, []);

  const memoizedValue: AuthContextType = useMemo(
    () => ({
      loading,
      isAuthenticated,
      login,
      logout,
      refreshAccessToken,
      error,
    }),
    [loading, isAuthenticated, login, logout, refreshAccessToken, error]
  );

  useEffect(() => {
    if (!discovery) return;
    if (discovery.discoveryDocument?.error) {
      console.error(
        "Error fetching discovery document",
        discovery.discoveryDocument.error
      );
      setError(new Error(discovery.discoveryDocument.error.toString()));
      setLoading(false);
      return;
    }
    handleInitAuth(discovery);
  }, [discovery, handleInitAuth]);

  return (
    <AuthContext.Provider value={memoizedValue}>
      {children}
    </AuthContext.Provider>
  );
}
