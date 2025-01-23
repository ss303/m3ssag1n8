/// <reference types="cypress" />

import { setupDatabase } from "./setup";

/**
 * This file contains the stubbing of a concurrent server for Cypress testing.
 * It defines the setup of a mock server to intercept HTTP requests and simulate various operations such as GET, POST, PUT, DELETE, and PATCH for workspaces, channels, posts, and reactions.
 */

type Doc = {
  /** The path to the document */
  path: string;
  /** Flexible type for JSON objects representing document data */
  doc: any;
  /** Metadata information including creation and modification details */
  meta: {
    createdBy: string;
    createdAt: number;
    lastModifiedBy: string;
    lastModifiedAt: number;
  };
};

type PatchBody = {
  /** The patch operation type, either adding or removing an array element */
  op: "ArrayAdd" | "ArrayRemove";
  /** The path in the document to apply the patch operation */
  path: string;
  /** The value(s) to be added or removed */
  value: string[];
};

/**
 * Stubs a concurrent server to simulate backend behavior for testing.
 * This function intercepts HTTP requests to simulate database operations such as creating workspaces, channels, posts, and managing reactions.
 */
function stubConcurrentServer() {
  const workspaces: Record<string, Doc> = {};
  const channels: Record<string, Doc> = {};
  const posts: Record<string, Doc> = {};
  const reactions = new Map<string, string[]>([
    [":smile:", []],
    [":frown:", []],
    [":like:", []],
    [":celebrate:", []],
  ]);

  let next = 0;

  /**
   * Resolves the entity from the URL path by extracting workspace, channel, and post names.
   * @param url - The URL to resolve the entity from.
   * @returns An object containing workspaceName, channelName, and postName.
   */
  function resolveEntity(url: string) {
    const parts = url.replace(`${DB_PATH}`, "").split("/");
    const workspaceName = parts[0];
    const channelName = parts[2];
    const postName = parts[4];
    return { workspaceName, channelName, postName };
  }

  // Intercept GET requests
  cy.intercept("GET", `${DB_HOST}${DB_PATH}*`, (req) => {
    const { workspaceName, channelName } = resolveEntity(req.url);
    const body =
      !workspaceName
        ? Object.values(workspaces)
        : !channelName
          ? Object.values(channels).filter((c) => c.path.startsWith(`${workspaceName}/`))
          : Object.values(posts).filter((p) =>
            p.path.startsWith(`${workspaceName}/channels/${channelName}/`)
          );

    req.reply({
      statusCode: 200,
      body,
    });
  });

  // Intercept POST requests (workspaces, channels, posts)
  cy.intercept("POST", `${DB_HOST}${DB_PATH}*`, (req) => {
    const { workspaceName, channelName } = resolveEntity(req.url);
    const id = next++;
    const entity = req.body as Doc;
    const path = workspaceName
      ? channelName
        ? `${workspaceName}/channels/${channelName}/posts/${id}`
        : `${workspaceName}/channels/${id}`
      : `${id}`;
    const target =
      !workspaceName ? workspaces : !channelName ? channels : posts;

    target[path] = { ...entity, path: `${DB_PATH}${path}` };
    req.reply({
      statusCode: 201,
      body: { uri: `${DB_PATH}${path}` },
    });
  });

  // Intercept PUT requests
  cy.intercept("PUT", `${DB_HOST}${DB_PATH}*`, (req) => {
    const { workspaceName, channelName, postName } = resolveEntity(req.url);
    const target =
      !workspaceName ? workspaces : !channelName ? channels : posts;
    const path = `${workspaceName}/channels/${channelName}/posts/${postName}`;
    const statusCode = target[path] ? 204 : 201;
    target[path] = req.body as Doc;

    req.reply({
      statusCode,
      body: { uri: `${DB_PATH}${path}` },
    });
  });

  // Intercept DELETE requests
  cy.intercept("DELETE", `${DB_HOST}${DB_PATH}*`, (req) => {
    const { workspaceName, channelName, postName } = resolveEntity(req.url);
    const target =
      !workspaceName ? workspaces : !channelName ? channels : posts;
    const path = `${workspaceName}/channels/${channelName}/posts/${postName}`;

    if (target[path]) {
      delete target[path];
      req.reply({ statusCode: 204 });
    } else {
      req.reply({ statusCode: 404 });
    }
  });

  // Intercept PATCH requests (reactions)
  cy.intercept("PATCH", `${DB_HOST}${DB_PATH}*`, (req) => {
    const patchBody = req.body as PatchBody[];
    let patchFailed = false;

    patchBody.forEach((patch) => {
      const reactionKey = patch.path.split("/").pop();
      if (reactionKey && reactions.has(reactionKey)) {
        if (patch.op === "ArrayAdd") {
          const existing = reactions.get(reactionKey) || [];
          reactions.set(reactionKey, [...existing, ...patch.value]);
        } else if (patch.op === "ArrayRemove") {
          const existing = reactions.get(reactionKey) || [];
          reactions.set(
            reactionKey,
            existing.filter((v) => !patch.value.includes(v))
          );
        }
      } else {
        patchFailed = true;
      }
    });

    req.reply({
      statusCode: 200,
      body: {
        uri: req.url,
        patchFailed: patchFailed.toString(),
        message: patchFailed ? "Some patches failed" : "Patches applied",
      },
    });
  });
}

// Test to verify the stub functionality
describe("one user reacting", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
  });

  beforeEach(() => {
    //stubConcurrentServer();
    cy.visit("/");
    cy.login("posts user");
    cy.createWorkspace("Concurrent Workspace");
    cy.createChannel("Concurrent Channel");
  });

  afterEach(() => {
    cy.deleteWorkspace("Concurrent Workspace");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  });

  it("should react to the same emoji 99 times", () => {
    cy.createPost("I will react to like!");

    for (let i = 0; i < 99; i++) {
      cy.getPost("I will react to like").reactToPost(":like:");
    }

    cy.contains("1").should("exist");
  });

  it("should react to the same emoji 100 times", () => {
    cy.createPost("I will react to frown!");

    for (let i = 0; i < 100; i++) {
      cy.getPost("I will react to frown").reactToPost(":frown:");
    }

    cy.getPost("I will react to frown").find(`[data-button=frown]`, { includeShadowDom: true }).contains("1").should("not.exist");
  });
});

describe("multiple users reacting", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
  });

  beforeEach(() => {
    cy.visit("/");
    cy.login("admin");
    cy.createWorkspace("Concurrent Workspace");
    cy.createChannel("Concurrent Channel");
    cy.createPost("Everyone react to me!");
  });

  afterEach(() => {
    cy.login("admin")
    cy.deleteWorkspace("Concurrent Workspace");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  });

  it("should have 25 users react to the same post with the same emoji", () => {
    for (let i = 0; i < 25; i++) {
      cy.visit("/");
      cy.login(`user${i}`);
      cy.openWorkspace("Concurrent Workspace");
      cy.openChannel("Concurrent Channel");
      cy.getPost("Everyone react to me!").reactToPost(":celebrate:");
      cy.getPost("Everyone react to me!").find(`[data-button=celebrate]`, { includeShadowDom: true }).contains(`${i + 1}`).should("exist");

      cy.logout();
    }
  });
});
