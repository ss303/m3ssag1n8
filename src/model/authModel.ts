/**
 * This module provides an authorization model for handling user login and logout operations.
 * It includes JSON schema validation, a fetch wrapper for typed responses, and a class for managing authentication.
 */
import {
  JSONSchema,
  $Compiler,
  wrapCompilerAsTypeGuard,
  FromSchema,
} from "json-schema-to-ts";
import Ajv from "ajv";

const ajv = new Ajv();
const $compile: $Compiler = (schema) => ajv.compile(schema);
const compile = wrapCompilerAsTypeGuard($compile);

/**
 * Schema for a Token JSON response
 * @param data the data to type check
 * @returns a narrowed type on data if it is a proper login response
 */
const authResponseSchema = {
  $id: "authResponse.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "authResponse",
  type: "object",
  required: ["token"],
  properties: {
    token: { type: "string" },
  },

  additionalProperties: false,
} as const satisfies JSONSchema;
const isAuthResponse = compile(authResponseSchema);

/**
 * A type representing the response body returned when authorizing a user.
 */
type authResponse = FromSchema<typeof authResponseSchema>;

/**
 * Checks if the provided data is undefined.
 * @param data - The data to check.
 * @returns `true` if the data is undefined, otherwise `false`.
 */
function isEmpty(data: unknown): data is undefined {
  return typeof data === "undefined";
}

/**
 * A type guard function definition.
 * @template T - The type to guard.
 * @param data - The data to validate.
 * @returns `true` if the data is of type `T`, otherwise `false`.
 */
type TypeGuard<T> = (data: unknown) => data is T;

/**
 * Wrapper around fetch to return a Promise that resolves to the desired type.
 *
 * This function will return null if the response body is empty. Use isT() and
 * isEmpty() to validate the response.
 *
 * @param url - The URL to fetch data from.
 * @param validate - A TypeGuard function to validate the response type.
 * @param options - Optional fetch configuration options.
 * @returns - A Promise that resolves to the unmarshaled JSON response.
 * @throws - An error if the fetch fails, there is no response body, or
 *           the response is not valid JSON.
 */
function typedFetch<T>(
  url: string,
  validate: TypeGuard<T>,
  options?: RequestInit,
): Promise<T> {
  return fetch(url, options)
    .then((response: Response) => {
      if (!response.ok) {
        console.error("response was not okay");
        throw new Error(response.status.toString());
      }
      // Handle response text parsing to ensure it's valid JSON
      return response.text().then((text: string) => {
        let data: unknown;

        if (text.length !== 0) {
          // Will throw an exception if the response is not valid JSON
          data = JSON.parse(text);
        }

        // Type of unmarshaled response needs to be validated
        if (validate(data)) {
          return data;
        }

        throw new Error(`invalid response: ${text}`);
      });
    })
    .catch((error: Error) => {
      console.log(error);
      if (error.message == "Failed to fetch") {
        throw new Error(
          "Connection to owldb lost. Please reconnect and log back in",
        );
      }
      throw error.message;
    });
}

/**
 * Factory function for initializing the authModel
 * @param dbHost The local host for the database
 * @param authPath The path to the authorization HTTP requests
 * @returns A new instance of the authModel
 */
export function initAuthModel(dbHost: string, authPath: string) {
  return new authModel(dbHost, authPath);
}

/**
 * Handles authorization requests, logging in and logging out
 */
class authModel {
  /** The local host for the database */
  private dbHost: string;
  /** The path to the authorization HTTP requests */
  private authPath: string;

  /** The username of the user logged in */
  private username: string;
  /** The token for the user logged in to make all other requests */
  private token: string;

  /**
   * Initializes all private fields of the authModel
   * @param dbHost The local host for the database
   * @param authPath The path to the authorization HTTP requests
   */
  constructor(dbHost: string, authPath: string) {
    // should this call login? no, because model should still work while user is not logged in
    this.dbHost = dbHost;
    this.authPath = authPath;
    this.username = "";
    this.token = "";
  }

  /**
   * Authorizes the user so they can access the messaging application
   * @param username The provided username from the user
   * @returns A Promise<Token> which will later be stored in this model
   */
  async authorize(username: string): Promise<authResponse> {
    const headers = new Headers();
    headers.append("accept", "application/json");
    headers.append("Content-Type", "application/json");
    const options = {
      method: "POST",
      headers: headers,
      body: `{"username": "${username}"}`,
    };
    // Response is a string
    const response = await typedFetch(
      this.dbHost + this.authPath,
      isAuthResponse,
      options,
    ).catch((error) => {
      console.log(error);
      throw new Error(
        "Failed to authorize user. Please check if the connection to owldb is stable.",
      );
    });
    console.log(response);

    if (!isAuthResponse(response)) {
      console.log("Error when authorizing");
      throw new Error(
        "Failed to authorize user. Please check if the connection to owldb is stable.",
      );
    }
    return response;
  }

  /**
   * Logs out the current user from the underlying database
   * @returns A void Promise so the result of the logout can be handled
   */
  logout(): Promise<void> {
    const headers = new Headers();
    headers.append("accept", "*/*");
    headers.append("Authorization", `Bearer ${this.token}`);
    const options = {
      method: "DELETE",
      headers: headers,
    };
    // Response is a string
    return typedFetch(this.dbHost + this.authPath, isEmpty, options).catch(
      (error) => {
        console.log(error);
        throw new Error(
          "Failed to logout user. Please check if the connection to owldb is stable.",
        );
      },
    );
  }

  /**
   * Gets the user's token from the authModel
   * @returns The current user's token
   */
  getToken(): string {
    return this.token;
  }

  /**
   * Gets the username of the current user from the authModel
   * @returns The username of the current user
   */
  getUsername(): string {
    return this.username;
  }

  /**
   * Stores the current user in the authModel with their token
   * @param username The username of the current user
   * @param token The token associated with the current user
   */
  addUserToken(username: string, token: string): void {
    this.username = username;
    this.token = token;
  }

  /**
   * Removes the current user from the authModel and their token
   */
  removeUserToken(): void {
    this.username = "";
    this.token = "";
  }
}
