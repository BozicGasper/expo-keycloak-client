
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { AccessTokenRequestResponse } from "./auth-types";
import { isDef } from "./utils";

const TOKEN_STORAGE_KEY = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  ID_TOKEN: "idToken",
};

class AuthTokenService {
  private static _instance: AuthTokenService;

  private _tokenEndpoint: string | null = null;

  private _clientId: string | null = null;

  private constructor() {}

  public get tokenEndpoint() {
    return this._tokenEndpoint;
  }

  public set tokenEndpoint(tokenEndpoint: string | null) {
    this._tokenEndpoint = tokenEndpoint;
  }

  public get clientId() {
    return this._clientId;
  }

  public set clientId(clientId: string | null) {
    this._clientId = clientId;
  }

  /**
   * Initializes the AuthTokenService with the provided configuration.
   *
   * @param params - The configuration parameters.
   * @param params.tokenEndpoint - The endpoint to obtain the token.
   * @param params.clientId - The client ID for authentication.
   */
  public init({
    tokenEndpoint,
    clientId,
  }: {
    tokenEndpoint: string;
    clientId: string;
  }) {
    console.info("Initializing AuthTokenService");
    this.tokenEndpoint = tokenEndpoint;
    this.clientId = clientId;
  }

  /**
   * Gets the singleton instance of AuthTokenService.
   *
   * @returns {AuthTokenService} The singleton instance of AuthTokenService
   */
  public static getInstance(): AuthTokenService {
    if (!AuthTokenService._instance) {
      AuthTokenService._instance = new AuthTokenService();
    }

    return AuthTokenService._instance;
  }

  /**
   * Stores the tokens in secure storage.
   *
   * @param {AccessTokenRequestResponse} accessTokenRequestResponse - The response containing the tokens
   * @returns {Promise<void>} A promise that resolves when the tokens are stored
   */
  public async storeTokens(
    accessTokenRequestResponse: AccessTokenRequestResponse
  ) {
    await SecureStore.setItemAsync(
      TOKEN_STORAGE_KEY.ACCESS_TOKEN,
      accessTokenRequestResponse.access_token
    );
    await SecureStore.setItemAsync(
      TOKEN_STORAGE_KEY.REFRESH_TOKEN,
      accessTokenRequestResponse.refresh_token
    );
    await SecureStore.setItemAsync(
      TOKEN_STORAGE_KEY.ID_TOKEN,
      accessTokenRequestResponse.id_token
    );
  }

  /**
   * Removes the tokens from secure storage.
   *
   * @returns {Promise<void>} A promise that resolves when the tokens are removed
   */
  public async removeTokens() {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY.ID_TOKEN);
  }

  /**
   * Retrieves the tokens from secure storage.
   *
   * @returns {Promise<{accessToken: string | null, refreshToken: string | null, idToken: string | null} | null>} The tokens or null if an error occurred
   */
  public async retrieveTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
  } | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(
        TOKEN_STORAGE_KEY.ACCESS_TOKEN
      );
      const refreshToken = await SecureStore.getItemAsync(
        TOKEN_STORAGE_KEY.REFRESH_TOKEN
      );
      const idToken = await SecureStore.getItemAsync(
        TOKEN_STORAGE_KEY.ID_TOKEN
      );

      return { accessToken, refreshToken, idToken };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * Decodes the access token.
   *
   * @returns {Promise<any | null>} The decoded access token or null if an error occurred
   */
  public async decodeAccessToken<T>(): Promise<T | null> {
    const tokens = await this.retrieveTokens();

    if (!isDef(tokens) || !isDef(tokens?.accessToken)) {
      return null;
    }

    try {
      return jwtDecode<T>(tokens.accessToken);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * Retrieves the access token from the stored tokens.
   *
   * @returns {Promise<string | null>} A promise that resolves to the access token if available, or null if not.
   */
  public async getAccessToken(): Promise<string | null> {
    const tokens = await this.retrieveTokens();
    return tokens?.accessToken ?? null;
  }

  /**
   * Refreshes the tokens using the refresh token.
   *
   * @param {Object} params - The parameters for the token refresh
   * @param {string} params.tokenEndpoint - The token endpoint URL
   * @param {string} params.clientId - The client ID
   * @returns {Promise<AccessTokenRequestResponse>} The new tokens
   * @throws {Error} If no tokens are found or the refresh token is missing
   */
  public async refreshTokens() {
    const tokens = await this.retrieveTokens();

    if (!isDef(tokens)) {
      throw new Error("No tokens found");
    }

    if (!tokens?.refreshToken) {
      throw new Error("No refresh token found");
    }

    if (!this._clientId) {
      throw new Error("No client ID found");
    }

    if (!this._tokenEndpoint) {
      throw new Error("No token endpoint found");
    }

    const formData = new URLSearchParams();
    formData.append("grant_type", "refresh_token");
    formData.append("client_id", this._clientId);
    formData.append("refresh_token", tokens.refreshToken);

    const response = await fetch(`${this._tokenEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const tokenResponse: AccessTokenRequestResponse = await response.json();

      await this.storeTokens(tokenResponse);

      return tokenResponse;
    } else {
      await authTokenService.removeTokens();
      throw new Error(
        `Failed to refresh tokens: ${response.status}: ${
          response.statusText
        } ${await response.text()}`
      );
    }
  }
}

const authTokenService = AuthTokenService.getInstance();

export default authTokenService;
