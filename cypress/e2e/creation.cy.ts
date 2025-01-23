/// <reference types="cypress" />

import { setupDatabase } from "./setup";

/**
 * Cypress test file where all tests assume that no workspace, channel, or posts have been created.
 * This file contains tests for login/logout, workspace, channel, post actions, deletion actions,
 * and refresh actions.
 */

// Test suite for Login/Logout Tests
describe("Login/Logout Tests", () => {
  before(() => {
    // Setup the database once before all tests in this describe block.
    setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
  });

  beforeEach(() => {
    cy.visit("/");
  });

  /**
   * Test: User should be able to log in successfully.
   * The test intercepts the login request, sends the login credentials, and verifies if the username is displayed correctly on the webpage.
   */
  it("should login", () => {
    // Intercept login request
    cy.intercept(
      "POST",
      `${Cypress.env("DATABASE_HOST")}${Cypress.env("AUTH_PATH")}`
    ).as("login");

    // Login
    cy.login("login user");

    // Ensure correct login request responds before checking page for username
    cy.wait("@login").its("request.body.username").should("eq", "login user");

    // Confirm username appears on the page other than in username input
    cy.contains(":not(input)", "login user").should("exist");
  });

  /**
   * Test: User should be able to log out successfully.
   * The test verifies that after logging out, the username is no longer displayed and checks for the correct logout request.
   */
  it("should logout", () => {
    // Login
    cy.login("logout user");

    // Confirm username appears on the page other than in username input
    cy.contains(":not(input)", "logout user").should("exist");

    // Intercept logout request
    cy.intercept(
      "DELETE",
      `${Cypress.env("DATABASE_HOST")}${Cypress.env("AUTH_PATH")}`
    ).as("logout");

    // Logout
    cy.logout();

    // Confirm username does not appear on the page
    cy.contains("logout user").should("not.exist");

    // Confirm correct logout request was sent
    cy.wait("@logout").its("response.statusCode").should("eq", 204);
  });
});

// Test suite for Workspace Tests
describe("Workspaces Tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.login("workspace user");
  });

  afterEach(() => {
    cy.logout();
  });

  /**
   * Test: User should be able to create a new workspace successfully.
   */
  it("should create a new workspace", () => {
    // Create a new workspace
    cy.createWorkspace("New Workspace");

    // Confirm that the new workspace's name is visible
    cy.contains("New Workspace").should("exist");
  });

  /**
   * Test: User should be able to select the newly created workspace.
   */
  it("should select New Workspace", () => {
    // Open New Workspace
    cy.openWorkspace("New Workspace");

    // Confirm that the workspace's name is visible
    cy.contains("New Workspace").should("exist");
  });

  /**
   * Test: User should be able to delete a test workspace successfully.
   */
  it("should delete Test Workspace", () => {
    cy.createWorkspace("Test Workspace");

    // Open Test Workspace
    //cy.openWorkspace("Test Workspace");

    // Confirm that the workspace's name is visible
    cy.contains("Test Workspace").should("exist");

    // Delete Test Workspace
    cy.deleteWorkspace("Test Workspace");
    cy.get('#close-workspaces-button').click();

    // Confirm that the workspace is no longer visible
    cy.contains("Test Workspace").should("not.exist");
  });
});

// Test suite for Channels Tests
describe("Channels Tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.login("channel user");
    cy.openWorkspace("New Workspace");
  });

  afterEach(() => {
    cy.logout();
  });

  /**
   * Test: User should be able to create a new channel successfully.
   */
  it("should create a new channel", () => {
    // Create a new channel
    cy.createChannel("New Channel");

    // Confirm that the new channel's name is visible
    cy.contains("New Channel").should("exist");
  });

  /**
   * Test: User should be able to select the newly created channel.
   */
  it("should select New Channel channel", () => {
    // Open New Channel
    cy.openChannel("New Channel");

    // Confirm that channel name is in header
    cy.get("#channel-title").should("contain", "New Channel");
  });

  /**
   * Test: User should be able to delete a test channel successfully.
   */
  it("should delete a test channel", () => {
    // Create a new channel
    cy.createChannel("Test Channel");

    // Confirm that the new channel's name is visible
    cy.contains("Test Channel").should("exist");

    // Delete Test Channel
    cy.deleteChannel("Test Channel");

    // Confirm that the channel is no longer visible
    cy.contains("Test Channel").should("not.exist");
  });
});

// Test suite for Posts Tests
describe("Posts Tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.login("posts user");
    cy.openWorkspace("New Workspace");
    cy.openChannel("New Channel");
  });

  afterEach(() => {
    cy.logout();
  });

  /**
   * Test: User should be able to create a new post successfully.
   */
  it("should create a new top-level post", () => {
    // Create a new post
    cy.createPost("This is a new post");

    // Confirm that the new post is visible
    cy.contains("This is a new post", { includeShadowDom: true }).should(
      "exist"
    );

    // Create another new post
    cy.createPost("This is another");

    // Confirm that the first new post is still visible
    cy.contains("This is a new post").should("exist");
  });

  /**
   * Test: User should be able to reply to a top-level post.
   */
  it("should reply to a top-level post", () => {
    // Reply to a post
    cy.getPost("This is a new post").replyToPost("This is a reply");

    // Confirm that the reply is visible
    cy.contains("This is a reply").should("exist");

    // Create another new post
    cy.createPost("This is yet another");

    // Confirm that the reply is still visible
    cy.contains("This is a reply").should("exist");
  });

  /**
   * Test: User should be able to reply to a nested post.
   */
  it("should reply to a nested post", () => {
    // Reply to a nested post
    cy.getPost("This is a reply").replyToPost("This is the next reply");

    // Confirm that the reply is visible
    cy.contains("This is the next reply").should("exist");

    // Reply to the top-level post again
    cy.getPost("This is a new post").replyToPost("I am a new reply");

    // Confirm that the reply is still visible
    cy.contains("This is the next reply").should("exist");
  });

  /**
   * Test: User should be able to react to a top-level post.
   */
  it("should react to a top-level post", () => {
    // React to a post
    cy.getPost("This is a new post").reactToPost(":like:");

    // Confirm that a reaction count of 1 is visible
    cy.getPost("This is a new post").find("p").contains("1").should("exist");
  });

  /**
   * Test: User should be able to react to a nested post.
   */
  it("should react to a nested post", () => {
    // React to a post
    cy.getPost("This is the next reply").reactToPost(":frown:");

    // Confirm that a reaction count of 1 is visible
    cy.getPost("This is the next reply").find("p").contains("1").should("exist");
  });
});

// Test suite for Post Textbox Tests
describe("Post Textbox Tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.login("posts user");
    cy.openWorkspace("New Workspace");
    cy.openChannel("New Channel");
  });

  afterEach(() => {
    cy.logout();
  });

  /**
   * Test: User should be able to create a new post successfully by pressing enter to submit.
   */
  it("should create a new top-level post by pressing enter", () => {
    // Create a new post
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).should('be.visible').type('This post was created by pressing enter');

    // Pressing enter should send the post.
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).type('{enter}');

    // Confirm that the new post is visible
    cy.get('.post-content', { includeShadowDom: true }).contains("This post was created by pressing enter").should("exist");
  });

  /**
   * Test: User should not be able to submit an empty post.
   */
  it("should not submit post on enter keypress if textarea is empty", () => {
    // After reply textbox is opened, close button should now be visible
    cy.getPost("This is a new post").invoke('attr', 'id').then((id) => {
      var path: string = "";
      if (typeof id === "string") {
        path = id.substring(id.indexOf('/'))
      }
      cy.getPost("This is a new post").find(`button[id=${Cypress.$.escapeSelector(`reply-${path}`)}]`, { includeShadowDom: true }).click();
    })
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('be.visible');

    // After attempt to submit empty textarea, close button should still be visible
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).type('{enter}');
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('be.visible');
  });

  /**
   * Test: User should not be able to submit an empty post.
   */
  it("should not submit post on send click if textarea is empty", () => {
    // After reply textbox is opened, close button should now be visible
    cy.getPost("This is a new post").invoke('attr', 'id').then((id) => {
      var path: string = "";
      if (typeof id === "string") {
        path = id.substring(id.indexOf('/'))
      }
      cy.getPost("This is a new post").find(`button[id=${Cypress.$.escapeSelector(`reply-${path}`)}]`, { includeShadowDom: true }).click();
    })
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('be.visible');

    // After attempt to submit empty textarea, close button should still be visible
    cy.get(`post-textarea`, { includeShadowDom: true }).find(`button[id=send-post]`).click();
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('be.visible');
  });

  /**
   * Test: User should be able to create a new post that contains a newline from shift+enter.
   */
  it("should create a new post including shift+enter", () => {
    // Create a new post
    cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).should('be.visible').type('This post uses shift+enter').should('have.value', 'This post uses shift+enter');

    // Pressing shift+enter should add a newline but not send the post.
    cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).type('{shift}').type('{enter}').should('have.value', 'This post uses shift+enter\n');
    cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).type("This is after the newline").should('have.value', 'This post uses shift+enter\nThis is after the newline');
    cy.get(`post-textarea`, { includeShadowDom: true }).get(`button[id=send-post]`).click();

    // Confirm that the new post is visible
    cy.get('.post-content', { includeShadowDom: true }).contains("This post uses shift+enter").should('exist');
  });

  /**
   * Test: User should be able to create a new post by pressing enter, after pressing and releasing shift.
   */
  it("should create a new post by pressing enter after shift", () => {
    // Simulate keypress (keydown and keyup) of shift key.
    cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).trigger('keydown', { keyCode: 16 });
    cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).trigger('keyup', { keyCode: 16 });
    cy.createPost('This post was sent after shift keypress');

    cy.get('.post-content', { includeShadowDom: true }).contains("This post was sent after shift keypress").should('exist');
  });

  /**
   * Test: User should be able to add bold text styling without text selected.
   */
  it("should bold with no text selected", () => {
    cy.get('post-textarea', { includeShadowDom: true }).find(`button[id=bold-text-button]`).click();
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).should('have.value', '****');
  });

  /**
   * Test: User should be able to add bold text styling around selected text.
   */
  it("should add bold styling around selected text", () => {
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).type('post text');

    // Highlight all text.
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).focus().invoke('select');

    // Style text.
    cy.get('post-textarea', { includeShadowDom: true }).find(`button[id=bold-text-button]`).click();
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).should('have.value', '**post text**');
  });

  /**
   * Test: User should be able to add link text styling around selected text.
   */
  it("should add link styling around selected text", () => {
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).type('link');

    // Highlight all text.
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).focus().invoke('select');

    // Style text.
    cy.get('post-textarea', { includeShadowDom: true }).find(`button[id=link-text-button]`).click();
    cy.get('post-textarea', { includeShadowDom: true }).find(`textarea[name=post]`).should('have.value', '[link]()');
  });

  /**
   * Test: User should be able to open and close a reply textbox.
   */
  it("should open and close a reply box", () => {
    // Close button should not be visible
    cy.get(`post-textarea`, { includeShadowDom: true })
      .should('be.visible')
      .find(`button[id=close-form]`)
      .should('not.be.visible');

    // After reply textbox is opened, close button should now be visible
    cy.getPost("This is a new post").invoke('attr', 'id').then((id) => {
      var path: string = "";
      if (typeof id === "string") {
        path = id.substring(id.indexOf('/'))
      }
      cy.getPost("This is a new post").find(`button[id=${Cypress.$.escapeSelector(`reply-${path}`)}]`, { includeShadowDom: true }).click();
    })
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('be.visible');

    // After reply textbox is closed, close button should not be visible
    cy.get(`post-textarea`, { includeShadowDom: true }).find(`button[id=close-form]`).click();
    cy.get(`post-textarea`, { includeShadowDom: true }).should('be.visible').find(`button[id=close-form]`).should('not.be.visible');
  });
});

// Test suite for Deletion Tests
describe("Deletion Tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.login("workspace user");
  });

  afterEach(() => {
    cy.logout();
  });

  /**
   * Test: User should be able to delete a channel they are not currently in.
   */
  it("should delete another channel it is not in", () => {
    cy.openWorkspace("New Workspace");
    cy.createChannel("To Delete Channel");
    cy.openChannel("New Channel");
    cy.deleteChannel("To Delete Channel");
    cy.contains("To Delete Channel").should("not.exist");
  });

  /**
   * Test: User should be able to delete a channel they are currently in.
   */
  it("should delete New Channel that it is in", () => {
    cy.openWorkspace("New Workspace");
    cy.openChannel("New Channel");
    cy.deleteChannel("New Channel");
    cy.get("#channel-title").should("not.contain", "New channel");
  });

  /**
   * Test: User should be able to delete a workspace.
   */
  it("should delete New Workspace", () => {
    cy.deleteWorkspace("New Workspace");
    cy.get('#close-workspaces-button').click();
    cy.contains("New Workspace").should("not.exist");
  });
});

// Test suite for Refresh Tests
describe("Refresh Tests", () => {
  const dburl = `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}`;

  beforeEach(() => {
    // Login
    cy.visit("/");
    cy.login("testuser");
  });

  afterEach(() => {
    cy.logout();
  });

  after(() => {
    cy.visit("/");
    cy.login("admin");
    cy.deleteWorkspace("refresh1");
    cy.get('#close-workspaces-button').click();
    cy.deleteWorkspace("refreshWork1");
    cy.get('#close-workspaces-button').click();
    cy.logout();
  });

  /**
   * Test: User should see an updated channel list after clicking the refresh button following a deletion.
   */
  it("should update the channel list after deletion on refresh", () => {
    // Create workspace
    cy.createWorkspace("refreshWork1");

    // Create two channels
    cy.createChannel("refreshChan1");
    cy.get("#channels").contains("refreshChan1").should("exist");
    cy.createChannel("refreshChan2");

    cy.get("#channels").contains("refreshChan1").should("exist");
    cy.get("#channels").contains("refreshChan2").should("exist");

    // Delete one channel directly using API request
    cy.request({
      method: "DELETE",
      url: `${dburl}refreshWork1/channels/refreshChan2`,
      headers: {
        Authorization: `Bearer user1token`,
      },
    }).then((response) => {
      expect(response.status).to.eq(204);
    });

    // Click the refresh button
    cy.refreshChannel();

    // Verify that the deleted channel is no longer visible after refresh
    cy.get("#channels").contains("refreshChan2").should("not.exist");
    cy.get("#channels").contains("refreshChan1").should("exist");
  });

  /**
   * Test: User should see an updated workspace list after clicking the refresh button following a deletion.
   */
  it("should update the workspace list after deletion on refresh", () => {
    // Create workspace
    cy.createWorkspace("refresh1");
    cy.contains("refresh1").should('exist');
    cy.createWorkspace("refresh2");
    cy.contains("refresh2").should('exist');
    cy.get('#open-workspaces-button').click();
    cy.get("#workspaces-modal-content").contains("refresh1").should("exist");
    cy.get("#workspaces-modal-content").contains("refresh2").should("exist");

    // Delete one channel directly using API request
    cy.request({
      method: "DELETE",
      url: `${dburl}refresh2`,
      headers: {
        Authorization: `Bearer user1token`,
      },
    }).then((response) => {
      expect(response.status).to.eq(204);
    });

    // Click the refresh button
    cy.refreshWorkspace();

    // Verify that the deleted channel is no longer visible after refresh
    cy.get("#workspaces-modal-content").contains("refresh2").should("not.exist");
    cy.get("#workspaces-modal-content").contains("refresh1").should("exist");

    cy.get("#close-workspaces-button").click();
  });
});