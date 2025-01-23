/**
 * This module provides schemas for various JSON structures, including post reactions, metadata, and document data,
 * as well as functions for interacting with a messaging database, managing channels, posts, and workspaces.
 * It includes a model class (`Model`) that supports creating, deleting, subscribing, and modifying posts, channels,
 * and workspaces in the database, using typed schemas for validation.
 */
import {
  EventSourceMessage,
  fetchEventSource,
} from "@microsoft/fetch-event-source";
import {
  JSONSchema,
  FromSchema,
  $Compiler,
  wrapCompilerAsTypeGuard,
} from "json-schema-to-ts";
import Ajv from "ajv";

const ajv = new Ajv();
const $compile: $Compiler = (schema) => ajv.compile(schema);
const compile = wrapCompilerAsTypeGuard($compile);

/**
 * JSON Schema for reactions in post document
 */
const ReactionsSchema = {
  $id: "reactions.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "Reactions",
  definitions: {
    reactionArray: {
      type: "array",
      items: { type: "string" },
      default: [],
      uniqueItems: true,
    },
  },
  type: "object",
  items: { $ref: "#/definitions/reactionArray" },
  default: {},
  properties: {
    ":smile:": { $ref: "#/definitions/reactionArray" },
    ":like:": { $ref: "#/definitions/reactionArray" },
    ":frown:": { $ref: "#/definitions/reactionArray" },
    ":celebrate:": { $ref: "#/definitions/reactionArray" },
  },
  uniqueItems: true,
  additionalProperties: true,
} as const satisfies JSONSchema;
compile(ReactionsSchema);

/**
 * JSON Schema for metadata in post document
 */
const MetadataSchema = {
  $id: "metadata.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "MetaData",
  type: "object",
  required: ["createdBy", "createdAt", "lastModifiedBy", "lastModifiedAt"],
  properties: {
    createdBy: { type: "string" },
    createdAt: { type: "integer" },
    lastModifiedBy: { type: "string" },
    lastModifiedAt: { type: "integer" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
compile(MetadataSchema);

/**
 * JSON Schema for body of post document
 */
const PostBodySchema = {
  $id: "postBody.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "Post Body",
  type: "object",
  required: ["msg"],
  properties: {
    msg: { type: "string" },
    parent: { type: "string", default: "" },
    reactions: { $ref: "reactions.json" },
    extensions: {
      type: "object",
      properties: { pins: { type: "array", items: { type: "string" } } },
    },
  },
  additionalProperties: true,
} as const satisfies JSONSchema;
compile(PostBodySchema);

/**
 * JSON Schema for post subscription data
 */
const PostUpdateSchema = {
  $id: "postUpdate.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "Update Post Data",
  type: "object",
  required: ["path", "doc", "meta"],
  properties: {
    path: { type: "string" },
    doc: { $ref: "postBody.json" },
    meta: { $ref: "metadata.json" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
let isPostUpdate = compile(PostUpdateSchema);

/**
 * JSON Schema for document data
 */
const DocumentSchema = {
  $id: "document.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "document",
  type: "object",
  required: ["path", "doc", "meta"],
  properties: {
    path: { type: "string" },
    doc: {
      type: "object",
      properties: { pins: { type: "array", items: { type: "string" } } },
    },
    meta: { $ref: "metadata.json" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
let isDocument = compile(DocumentSchema);

/**
 * JSON Schema for array of doc data
 */
const ArrayDocSchema = {
  $id: "arrayDoc.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "Array of Doc",
  type: "array",
  items: { $ref: "document.json" },
  additionalProperties: false,
} as const satisfies JSONSchema;
let isArrayDoc = compile(ArrayDocSchema);

/**
 * JSON Schema for create response
 */
const PutResponseSchema = {
  $id: "putResponse.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "putResponse",
  type: "object",
  required: ["uri"],
  properties: {
    uri: { type: "string" },
  },

  additionalProperties: false,
} as const satisfies JSONSchema;
let isPutResponse = compile(PutResponseSchema);

/**
 * JSON Schema for reaction response
 */
const PatchResponseSchema = {
  $id: "patchResponse.json",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "patchResponse",
  type: "object",
  required: ["uri", "patchFailed", "message"],
  properties: {
    uri: { type: "string" },
    patchFailed: { type: "boolean" },
    message: { type: "string" },
  },

  additionalProperties: false,
} as const satisfies JSONSchema;
let isPatchResponse = compile(PatchResponseSchema);

/*
 * Type representing the body of a post document.
 */
export type PostBody = FromSchema<
  typeof PostBodySchema,
  { references: [typeof ReactionsSchema] }
>;

/*
 * Type representing post update data.
 */
export type PostUpdate = FromSchema<
  typeof PostUpdateSchema,
  { references: [typeof PostBodySchema, typeof MetadataSchema] }
>;
/*
 * Type for the response of a PUT operation.
 */
type putResponse = FromSchema<typeof PutResponseSchema>;
/*
 * Type for the response of a PATCH operation.
 */
type patchResponse = FromSchema<typeof PatchResponseSchema>;
/*
 * Type representing a single document in the database.
 */
type Document = FromSchema<typeof DocumentSchema>;

/**
 * A type guard function definition.
 * @template T - The type to guard.
 * @param data - The data to validate.
 * @returns `true` if the data is of type `T`, otherwise `false`.
 */
type TypeGuard<T> = (data: unknown) => data is T;

/*
 * Type representing a patch operation body.
 */
type PatchBody = {
  op: string;
  path: string;
  value: any;
};

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
        console.error(response.status + " " + response.statusText);
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
 * Wrapper around fetch to return a Promise that resolves when an empty
 * response is received.
 *
 * @param url      url to fetch from
 * @param options  fetch options
 * @returns        a Promise that resolves when an empty response is received
 * @throws         an error if the fetch fails or there is a response body,
 */
function emptyFetch(url: string, options?: RequestInit): Promise<void> {
  return fetch(url, options).then((response: Response) => {
    if (!response.ok) {
      throw new Error(response.status.toString());
    }

    // Return decoded JSON if there is a response body or null otherwise
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && contentLength !== "0") {
      // Should not be a response body
      throw new Error(`expected empty response`);
    } else {
      // No content
      return;
    }
  });
}

/**
 * Factory function to initialize a new instance of the Model.
 * @param dbHost - The database host URL.
 * @param dbPath - The path to the database's channels endpoint.
 * @returns - A new instance of the ChannelModel class.
 */
export function initModel(dbHost: string, dbPath: string) {
  return new Model(dbHost, dbPath);
}

/**
 * A model for managing all interactions with the OwlDB database.
 */
class Model {
  /** The database host URL */
  private dbHost: string;
  /** The database path */
  private dbPath: string;
  /** Controller for managing the subscription lifecycle */
  private controller: AbortController | null = null;

  /**
   * Initializes the Model with database connection parameters.
   * @param dbHost - The database host URL.
   * @param dbPath - The path to the channels endpoint.
   */
  constructor(dbHost: string, dbPath: string) {
    this.dbHost = dbHost;
    this.dbPath = dbPath;
  }

  /**
   * Fetches all of a type of document at the given path using an authorization token.
   * @param path - The path at which the docuemnts are to be fetched.
   * @param token - The authorization token for accessing the back-end database.
   * @returns - A promise that resolves to an array of Document objects.
   * @throws - Throws an error if fetching documents fails.
   */
  async getAll(path: string, token: string): Promise<Array<Document>> {
    try {
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      const options = {
        method: "GET",
        headers: headers,
      };

      const documents = await typedFetch<Array<Document>>(
        path,
        isArrayDoc,
        options,
      );

      if (!isArrayDoc(documents)) {
        throw new Error("Could not validate workspace request from Server");
      }

      return documents;
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /** Creates a new channel in the designated workspace with the designated fields
   *
   * @param workspace   The workspace where the channel is to be inserted
   * @param channel     The name of the new channel
   * @param token       A valid authorization token for the database
   * @returns           All of the channels in the provided workspace after the addition of the new channel
   */
  async createChannel(
    workspace: string,
    channel: string,
    token: string,
  ): Promise<Array<Document>> {
    try {
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      const options = {
        method: "PUT",
        headers: headers,
        body: `{}`,
      };
      //Put workspace
      const putChannel = await typedFetch<putResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}`,
        isPutResponse,
        options,
      );

      if (!isPutResponse(putChannel)) {
        throw new Error("Error putting channel");
      }

      //Put the channels collection in workspace
      const putPosts = await typedFetch<putResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}/posts/`,
        isPutResponse,
        options,
      );

      if (!isPutResponse(putPosts)) {
        throw new Error("Error putting posts collection in " + channel);
      }

      const path = `${this.dbHost}${this.dbPath}${workspace}/channels/`;
      return this.getAll(path, token);
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /** Deletes a channel in the database
   *
   * @param workspace   The name of the workspace of where the channel exists
   * @param name     The name of the channel to be deleted
   * @param token           A valid bearer token for the database
   * @returns               A Promise of all the names of the channels in the
   *                        workspace after the channel is deleted.
   */
  async deleteChannel(
    workspace: string,
    name: string,
    token: string,
  ): Promise<Array<Document>> {
    try {
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      const options = {
        method: "DELETE",
        headers: headers,
      };
      await emptyFetch(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${name}`,
        options,
      );
      const path = `${this.dbHost}${this.dbPath}${workspace}/channels/`;
      return this.getAll(path, token); // get all channels
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /** Creates a new post in the designated database with the designated fields
   *
   * @param msg         The message of the post to be inserted
   * @param workspace   The workspace where the post is to be inserted
   * @param channel     The channel where the post is to be inserted
   * @param token       A valid authorization token for the database
   * @param parent      The parent of the post, empty if it's not a reply
   * @returns           The newly created post
   */
  async createPost(
    msg: string,
    workspace: string,
    channel: string,
    token: string,
    parent: string,
  ): Promise<Document> {
    try {
      const body: PostBody = {
        msg: msg,
        parent: parent,
      };
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Content-Type", "application/json");
      const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      };

      const resp = await typedFetch<putResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}/posts/`,
        isPutResponse,
        options,
      );

      if (!isPutResponse(resp)) {
        throw new Error("Error putting post in " + channel);
      }

      var split = resp.uri.split("/");
      var postName = split.at(split.length - 1);
      const headers2 = new Headers();
      headers2.append("accept", "application/json");
      headers2.append("Authorization", `Bearer ${token}`);
      const resp2 = await typedFetch<Document>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}/posts/${postName}`,
        isDocument,
        {
          method: "GET",
          headers: headers2,
        },
      );

      if (!isDocument(resp2)) {
        throw new Error("Error getting post in " + channel);
      }

      return resp2;
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Triggers a reaction on a post in a channel
   * @param workspace - The workspace where the post exists
   * @param channel - The channel containing the post
   * @param post - The specific post to react to
   * @param emoji - The emoji reaction to add or remove
   * @param username - The username of the user reacting
   * @param reacted - Whether the user has already reacted or not
   * @param token - The authorization token for the database
   */
  async triggerReaction(
    workspace: string,
    channel: string,
    post: string,
    emoji: string,
    username: string,
    reacted: boolean,
    token: string,
  ): Promise<void> {
    try {
      var patches = new Array<PatchBody>();
      patches.push({ op: "ObjectAdd", path: "/reactions", value: {} });
      patches.push({ op: "ObjectAdd", path: "/reactions/:smile:", value: [] });
      patches.push({ op: "ObjectAdd", path: "/reactions/:like:", value: [] });
      patches.push({ op: "ObjectAdd", path: "/reactions/:frown:", value: [] });
      patches.push({
        op: "ObjectAdd",
        path: "/reactions/:celebrate:",
        value: [],
      });
      // conditional for arrayadd or arrayremove
      if (reacted) {
        patches.push({
          op: "ArrayRemove",
          path: `/reactions/:${emoji}:`,
          value: `${username}`,
        });
      } else {
        patches.push({
          op: "ArrayAdd",
          path: `/reactions/:${emoji}:`,
          value: `${username}`,
        });
      }
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Content-Type", "application/json");
      const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(patches),
      };
      await typedFetch<patchResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}/posts/${post}`,
        isPatchResponse,
        options,
      );
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates the pin state of a specific post in a channel.
   * @param workspace - The workspace where the post exists.
   * @param channel - The channel containing the post.
   * @param post - The specific post to pin or unpin.
   * @param username - The username of the user performing the action.
   * @param pinned - Indicates whether the post is currently pinned.
   *                  - `true`: Unpins the post.
   *                  - `false`: Pins the post.
   * @param token - The authorization token for database access.
   * @throws Error - Propagates errors encountered during the fetch operation.
   */
  async triggerPin(
    workspace: string,
    channel: string,
    post: string,
    username: string,
    pinned: boolean,
    token: string,
  ) {
    try {
      var patches = new Array<PatchBody>();
      patches.push({ op: "ObjectAdd", path: "/extensions", value: {} });
      patches.push({ op: "ObjectAdd", path: "/extensions/pins", value: [] });
      // conditional for arrayadd or arrayremove
      if (pinned) {
        patches.push({
          op: "ArrayRemove",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      } else {
        patches.push({
          op: "ArrayAdd",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      }
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Content-Type", "application/json");
      const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(patches),
      };
      await typedFetch<patchResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}/posts/${post}`,
        isPatchResponse,
        options,
      );
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates the pin state of a channel.
   * @param workspace - The workspace where the post exists.
   * @param channel - The channel containing the post.
   * @param username - The username of the user performing the action.
   * @param pinned - Indicates whether the post is currently pinned.
   *                  - `true`: Unpins the post.
   *                  - `false`: Pins the post.
   * @param token - The authorization token for database access.
   * @throws Error - Propagates errors encountered during the fetch operation.
   */
  async triggerChannelPin(
    workspace: string,
    channel: string,
    username: string,
    pinned: boolean,
    token: string,
  ) {
    try {
      var patches = new Array<PatchBody>();
      patches.push({ op: "ObjectAdd", path: "/extensions", value: {} });
      patches.push({ op: "ObjectAdd", path: "/extensions/pins", value: [] });
      // conditional for arrayadd or arrayremove
      if (pinned) {
        patches.push({
          op: "ArrayRemove",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      } else {
        patches.push({
          op: "ArrayAdd",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      }
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Content-Type", "application/json");
      const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(patches),
      };
      await typedFetch<patchResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/${channel}`,
        isPatchResponse,
        options,
      );
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates the pin state of a workspace.
   * @param workspace - The workspace where the post exists.
   * @param username - The username of the user performing the action.
   * @param pinned - Indicates whether the post is currently pinned.
   *                  - `true`: Unpins the post.
   *                  - `false`: Pins the post.
   * @param token - The authorization token for database access.
   * @throws Error - Propagates errors encountered during the fetch operation.
   */
  async triggerWorkspacePin(
    workspace: string,
    username: string,
    pinned: boolean,
    token: string,
  ) {
    try {
      var patches = new Array<PatchBody>();
      patches.push({ op: "ObjectAdd", path: "/extensions", value: {} });
      patches.push({ op: "ObjectAdd", path: "/extensions/pins", value: [] });
      // conditional for arrayadd or arrayremove
      if (pinned) {
        patches.push({
          op: "ArrayRemove",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      } else {
        patches.push({
          op: "ArrayAdd",
          path: `/extensions/pins`,
          value: `${username}`,
        });
      }
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Content-Type", "application/json");
      const options = {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(patches),
      };
      await typedFetch<patchResponse>(
        `${this.dbHost}${this.dbPath}${workspace}`,
        isPatchResponse,
        options,
      );
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Subscribing sends initial updates with everything that is in the subscribed collection,
   * so won't need to call get all posts separately after this is implemented
   * @param workspace - The workspace containing the channel
   * @param channel - The channel to subscribe to
   * @param token - The authorization token
   */
  async subscribe(path: string, token: string): Promise<void> {
    console.log("Subscribing user to all posts in the current channel");
    this.controller = new AbortController();
    await fetchEventSource(path, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      onmessage(msg: EventSourceMessage) {
        if (msg.event !== "update") {
          console.log("Keep Alive SSE");
          return;
        }
        const data: unknown = JSON.parse(msg.data); // data should contain path, doc, and meta where doc is post body and meta has extra info
        if (isPostUpdate(data)) {
          let result: PostUpdate = data;
          const updatePostEvent = new CustomEvent("updatePostEvent", {
            detail: {
              id: msg.id + result.meta.lastModifiedBy, // user who this is from, if it is current logged in user, ignore
              post: result,
            },
          });
          window.dispatchEvent(updatePostEvent);
        }
      },
      onerror(err) {
        console.log("errored in subscription", err);
      },
      signal: this.controller.signal,
      openWhenHidden: true,
    });
  }

  /**
   * Unsubscribes from the current channel
   */
  unsubscribe() {
    console.log("Unsubscribing user from the current channel");
    this.controller?.abort();
    this.controller = null;
  }

  /** Creates a new workspace in the designated database
   *
   * @param workspace   The name of the new workspaces
   * @param token       A valid authorization token for the database
   * @returns           All of the channels in the new workspace
   */
  async createWorkspace(
    workspace: string,
    token: string,
  ): Promise<Array<Document>> {
    try {
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      const options = {
        method: "PUT",
        headers: headers,
        body: `{}`,
      };
      const path = `${this.dbHost}${this.dbPath}${workspace}`;
      //Put workspace
      const putWorkspace = await typedFetch<putResponse>(
        path,
        isPutResponse,
        options,
      );

      if (!isPutResponse(putWorkspace)) {
        throw new Error("Error putting workspace " + workspace);
      }

      //Put the channels collection in workspace
      const putChannels = await typedFetch<putResponse>(
        `${this.dbHost}${this.dbPath}${workspace}/channels/`,
        isPutResponse,
        options,
      );

      if (!isPutResponse(putChannels)) {
        throw new Error(
          "Error putting channels collection in workspace " + workspace,
        );
      }

      const path2 = `${this.dbHost}${this.dbPath}${workspace}/channels/`;
      return this.getAll(path2, token);
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }

  /** Deletes a workspace in the database
   *
   * @param workspaceName   The name of the workspace to be deleted
   * @param token           A valid bearer token for the database
   * @returns               A Promise of all the workspaces after the workspace is deleted.
   */
  async deleteWorkspace(
    workspaceName: string,
    token: string,
  ): Promise<Array<Document>> {
    try {
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Authorization", `Bearer ${token}`);
      const options = {
        method: "DELETE",
        headers: headers,
      };
      await emptyFetch(`${this.dbHost}${this.dbPath}${workspaceName}`, options);
      const path = `${this.dbHost}${this.dbPath}`;
      return this.getAll(path, token); // get all workspaces
    } catch (error: unknown) {
      console.log(error);
      throw error;
    }
  }
}
