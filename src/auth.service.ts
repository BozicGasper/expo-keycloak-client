
import { DiscoveryDocument } from "expo-auth-session";
import authTokenService from "./auth-token.service";
import { KeycloakClientConfig, AccessTokenRequestResponse } from "./auth-types";
import { isDef } from "./utils";

class AuthService {
  private static _instance: AuthService;

  private _discovery: DiscoveryDocument | null = null;

  private _config: KeycloakClientConfig | null = null;

  private constructor() {}

  public get discovery() {
    return this._discovery;
  }

  public set discovery(discovery: DiscoveryDocument | null) {
    this._discovery = discovery;

    
  }

  public get config() {
    return this._config;
  }

  public set config(config: KeycloakClientConfig | null) {
    this._config = config;
  }

  /**
   * Initializes the AuthService with the provided discovery document and Keycloak client configuration.
   *
   * @param params - The initialization parameters.
   * @param params.discovery - The discovery document containing the OpenID Connect configuration.
   * @param params.config - The Keycloak client configuration.
   */
  public init({
    discovery,
    config,
  }: {
    discovery: DiscoveryDocument;
    config: KeycloakClientConfig;
  }) {
    console.info("Initializing AuthService");
    this.discovery = discovery;
    this.config = config;
  }

  /**
   * Gets the singleton instance of AuthService.
   *
   * @returns {AuthService} The singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService();
    }

    return AuthService._instance;
  }

  /**
   * Requests an access token from the token endpoint.
   *
   * @param {Object} params - The parameters for the token request
   * @param {string} params.client_id - The client ID
   * @param {string} params.redirect_uri - The redirect URI
   * @param {string} params.authorizationCode - The authorization code
   * @param {string} params.codeVerifier - The code verifier
   * @param {string} params.tokenEndpoint - The token endpoint URL
   * @returns {Promise<AccessTokenRequestResponse | null>} The token response or null if an error occurred
   */
  public async requestAccessToken({
    authorizationCode,
    codeVerifier,
  }: {
    authorizationCode: string;
    codeVerifier: string;
  }) {
    try {
      if (!isDef(this.discovery)) {
        throw new Error("No discovery found");
      }

      if (!isDef(this.config)) {
        throw new Error("No config found");
      }

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        code_verifier: codeVerifier,
        client_id: this.config.clientId,
        redirect_uri: this.config.signInRedirectUri,
      }).toString();

      const tokenRequestResponse = await fetch(
        `${this.discovery.tokenEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );

      // store this token in the secure storage
      const tokenResponse: AccessTokenRequestResponse =
        await tokenRequestResponse.json();

      return tokenResponse;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * Ends the user session by revoking the refresh token.
   *
   * @param {Object} params - The parameters for ending the session
   * @param {string} params.endSessionEndpoint - The end session endpoint URL
   * @param {string} params.clientId - The client ID
   * @returns {Promise<void>} A promise that resolves when the session is ended
   * @throws {Error} If no tokens are found or the refresh token is missing
   */
  public async endSession() {
    const tokens = await authTokenService.retrieveTokens();

    if (!isDef(this.discovery)) {
      throw new Error("No discovery found");
    }

    if (!isDef(this.config)) {
      throw new Error("No config found");
    }

    if (!isDef(tokens)) {
      throw new Error("No tokens found");
    }

    if (!tokens?.refreshToken) {
      throw new Error("No refresh token found");
    }

    const formData = new URLSearchParams();
    formData.append("client_id", this.config.clientId);
    formData.append("refresh_token", tokens.refreshToken);

    const response = await fetch(`${this.discovery.endSessionEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (response.ok) {
      console.info("Session ended successfully");
      return;
    } else {
      throw new Error(
        `Failed to end session: ${response.status}: ${
          response.statusText
        } ${await response.text()}`
      );
    }
  }
}

const authService = AuthService.getInstance();

export default authService;
