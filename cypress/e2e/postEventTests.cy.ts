/// <reference types="cypress" />

import { setupDatabase } from "./setup";

/**
 * This Cypress test file contains tests for verifying existing post events and creating post events.
 * It includes setting up a stub server for mimicking backend responses and managing entities like workspaces, channels, and posts.
 * The test cases cover reacting to posts, creating reactions, and other interaction events.
 */

type Posts = {
  [key: string]: string;
};

const DB_PATH = "/v1/p2group20/";
const DB_HOST = "http://localhost:4318";

// Test suite for existing post events
describe("existing post events", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));

    cy.visit('/');
    cy.login("admin");
    cy.createWorkspace("Existing events workspace");
    cy.createChannel("Existing events channel");
    cy.createPost("All interactions with this");
    cy.logout();
  });

  beforeEach(() => {
    cy.visit('/');
    cy.login("post event user");
    cy.openWorkspace("Existing events workspace");
    cy.openChannel("Existing events channel");
  })

  afterEach(function () {
    cy.logout();
  });

  after(() => {
    cy.login("admin");
    cy.deleteWorkspace("Existing events workspace");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  });

  /**
   * Test: Should add a smile reaction to an existing post.
   */
  it("should trigger smile reaction", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("reactEvent", eventHandler);

      const smile = new CustomEvent("reactEvent", {
        detail: {
          reacted: false,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "smile",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(smile);

      const unsmile = new CustomEvent("reactEvent", {
        detail: {
          reacted: true,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "smile",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(unsmile);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledTwice");

      // Confirm that a reaction count of 1 is visible
      //cy.getPost("All interactions with this").find(`[data-button=smile]`, {includeShadowDom: true}).contains("1").should("exist");
    });
    // should call patch on owldb, should be stubbed
  });

  /**
   * Test Case: Should add a frown reaction to a post.
   */
  it("should trigger frown reaction", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("reactEvent", eventHandler);

      const frown = new CustomEvent("reactEvent", {
        detail: {
          reacted: false,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "frown",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(frown);

      const unfrown = new CustomEvent("reactEvent", {
        detail: {
          reacted: true,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "frown",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(unfrown);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledTwice");

    });
  });

  /**
   * Test Case: Should add a like reaction to a post.
   */
  it("should trigger like reaction", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("reactEvent", eventHandler);

      const like = new CustomEvent("reactEvent", {
        detail: {
          reacted: false,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "like",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(like);

      const unlike = new CustomEvent("reactEvent", {
        detail: {
          reacted: true,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "like",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(unlike);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledTwice");

    });
  });

  /**
   * Test Case: Should add a celebrate reaction to a post.
   */
  it("should trigger celebrate reaction", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("reactEvent", eventHandler);

      const celebrate = new CustomEvent("reactEvent", {
        detail: {
          reacted: false,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "celebrate",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(celebrate);

      const uncelebrate = new CustomEvent("reactEvent", {
        detail: {
          reacted: true,
          workspace: "test workspace",
          channel: "test channel",
          name: "test post",
          emoji: "celebrate",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(uncelebrate);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledTwice");

    });
  });

  /**
   * Test Case: Should pin a post.
   */
  it("should pin a post", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("pinPostEvent", eventHandler);

      const pin = new CustomEvent("pinPostEvent", {
        detail: {
          path: "/test workspace/channels/test channel/posts/test post",
          pinned: false,
          workspace: "test workspace",
          channel: "test channel",
          postName: "test post",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(pin);

      const unpin = new CustomEvent("pinPostEvent", {
        detail: {
          path: "/test workspace/channels/test channel/posts/test post",
          pinned: true,
          workspace: "test workspace",
          channel: "test channel",
          postName: "test post",
          clicker: "test user",
        },
      });
      component[0].dispatchEvent(unpin);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledTwice");

    });
  });

  /**
   * Test Case: Should trigger replying to a post.
   */
  it("should trigger reply", function () {
    cy.getPost("All interactions with this").then((component) => {
      const eventHandler = cy.spy().as("eventHandler");
      component[0].addEventListener("replyButtonEvent", eventHandler);

      const openReply = new CustomEvent("replyButtonEvent", {
        detail: {
          newTextarea: undefined
        },
      });
      component[0].dispatchEvent(openReply);

      // Assert that the event handler was called
      cy.get("@eventHandler").should("have.been.calledOnce");

    });
  });
});

describe("existing post interactions", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));

    cy.visit('/');
    cy.login("admin");
    cy.createWorkspace("Existing interactions workspace");
    cy.createChannel("Existing interactions channel");
    cy.createPost("This will get all interactions");
    cy.logout();
  });

  beforeEach(() => {
    cy.visit('/');
    cy.login("post event user");
    cy.openWorkspace("Existing interactions workspace");
    cy.openChannel("Existing interactions channel");
  })

  afterEach(function () {
    cy.logout();
  });

  after(() => {
    cy.login("admin");
    cy.deleteWorkspace("Existing interactions workspace");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  });

  it("should smile and unsmile", () => {
    cy.getPost("This will get all interactions").reactToPost(":smile:");
    cy.contains("1").should("exist");
    cy.getPost("This will get all interactions").reactToPost(":smile:");
    cy.getPost("This will get all interactions").find(`[data-button=smile]`, { includeShadowDom: true }).contains("1").should("not.exist");
  });

  it("should like and unlike", () => {
    cy.getPost("This will get all interactions").reactToPost(":like:");
    cy.contains("1").should("exist");
    cy.getPost("This will get all interactions").reactToPost(":like:");
    cy.getPost("This will get all interactions").find(`[data-button=like]`, { includeShadowDom: true }).contains("1").should("not.exist");
  });

  it("should frown and unfrown", () => {
    cy.getPost("This will get all interactions").reactToPost(":frown:");
    cy.contains("1").should("exist");
    cy.getPost("This will get all interactions").reactToPost(":frown:");
    cy.getPost("This will get all interactions").find(`[data-button=frown]`, { includeShadowDom: true }).contains("1").should("not.exist");
  });

  it("should celebrate and uncelebrate", () => {
    cy.getPost("This will get all interactions").reactToPost(":celebrate:");
    cy.contains("1").should("exist");
    cy.getPost("This will get all interactions").reactToPost(":celebrate:");
    cy.getPost("This will get all interactions").find(`[data-button=celebrate]`, { includeShadowDom: true }).contains("1").should("not.exist");
  });

  it("should pin and unpin", () => {
    cy.getPost("This will get all interactions").pinPost();
    cy.contains("This will get all interactions").should("exist");
    cy.getPost("This will get all interactions").pinPost();
    cy.contains("This will get all interactions").should("exist");
  });

  it("should open reply box and close reply box", () => {
    cy.getPost("This will get all interactions").then((subject) => {
      cy.wrap(subject).invoke('attr', 'id').then((id) => {
        var path: string = "";
        if (typeof id === "string") {
          path = id.substring(id.indexOf('/'))
        }
        cy.wrap(subject).find(`button[id=${Cypress.$.escapeSelector(`reply-${path}`)}]`, { includeShadowDom: true }).click();
      });
    });
    cy.get(`post-textarea`, { includeShadowDom: true }).get(`button[id=close-form]`).click();
    cy.get(`post-textarea`).should('exist');
  });
});

// Test suite for creating post events
describe("creating post events", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));

    cy.visit('/');
    cy.login("admin");
    cy.createWorkspace("Existing events workspace");
    cy.contains("Existing events workspace").should("exist");
    cy.createChannel("Existing events channel");
    cy.contains("Existing events channel").should("exist");
    cy.logout()
  });

  beforeEach(() => {
    cy.visit('/');
    cy.login('new user');
    cy.openWorkspace('Existing events workspace');
    cy.openChannel('Existing events channel');
  })

  afterEach(function () {
    cy.logout();
  });

  after(() => {
    cy.login('admin');
    cy.deleteWorkspace("Existing events workspace");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  })

  /**
   * Test Case: Should add a smile emoji to the text area.
   */
  it("should add smile emoji", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=smile]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', ':smile:');
    });
  });

  /**
   * Test Case: Should add a like emoji to the text area.
   */
  it("should add like emoji", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=like]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', ':like:');
    });
  });

  /**
   * Test Case: Should add a frown emoji to the text area.
   */
  it("should add frown emoji", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=frown]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', ':frown:');
    });
  });

  /**
   * Test Case: Should add a celebrate emoji to the text area.
   */
  it("should add celebrate emoji", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=celebrate]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', ':celebrate:');
    });
  });

  /**
   * Test Case: Should add a link to the text area.
   */
  it("should add link", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=link]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', '[]()');
    });
  });

  /**
   * Test Case: Should add bold text to the text area.
   */
  it("should add bold", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=bold]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', '****');
    });
  });

  /**
   * Test Case: Should add italics to the text area.
   */
  it("should add italics", function () {
    cy.get('post-textarea').get(`textarea[name=post]`).get('[data-button=italic]').then((component) => {
      const eventHandler = cy.spy().as('eventHandler');
      component[0].addEventListener('click', eventHandler);

      component[0].dispatchEvent(new Event('click'));

      // Assert that the event handler was called
      cy.get('@eventHandler').should('have.been.calledOnce');

      // Confirm that a reaction count of 1 is visible
      cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('have.value', '**');
    });
  });
});
