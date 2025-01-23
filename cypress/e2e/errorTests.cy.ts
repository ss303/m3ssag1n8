/// <reference types="cypress" />

import { setupDatabase } from "./setup";

// Test file where tests check that error modal shows up

// Test suite for Error Tests
describe("login errors", () => {
    before(() => {
        // Setup the database once before all tests in this describe block.
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
    });
    // Before each test, visit the application homepage
    beforeEach(() => {
        cy.visit("/");
    });

    /**
     * Test case: Should not be able to log in due to an invalid login request.
     * The login request is intercepted and mocked to simulate a failed response,
     * and we check that the error modal is displayed.
     */
    it("should not login", () => {
        // Intercept login request and simulate a 400 error response (bad request)
        cy.intercept(
            "POST",
            `${Cypress.env("DATABASE_HOST")}${Cypress.env("AUTH_PATH")}`, (req) => {
                req.reply({ statusCode: 400, ok: false });
            });

        // Attempt to log in with an invalid username
        cy.login("name");

        // Confirm that the error modal appears on the page
        cy.get("#error-modal").should("be.visible");

        // Close the error modal
        cy.get('#close-error-button').click();

        // Ensure that the username input is still visible for retrying login
        cy.get('input[name="username"]').should("be.visible");
    });

    it("should login and error while getting workspaces", () => {
        // Intercept login request and simulate a 404 error response (bad request)
        cy.intercept(
            "GET",
            `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}`, (req) => {
                req.reply({ statusCode: 404, ok: false });
            });

        // Login user
        cy.login("name");

        // Confirm that the error modal appears on the page
        cy.get("#error-modal").should("be.visible");

        // Close the error modal
        cy.get('#close-error-button').click();
    });

    it("should login and not return a token", () => {
        // Intercept login request and simulate a 400 error response (bad request)
        cy.intercept(
            "POST",
            `${Cypress.env("DATABASE_HOST")}${Cypress.env("AUTH_PATH")}`, (req) => {
                req.reply({ token: "" });
            });

        // Login user
        cy.login("name");

        // Confirm that the error modal appears on the page
        cy.get("#error-modal").should("be.visible");

        // Close the error modal
        cy.get('#close-error-button').click();

        // Ensure that the username input is still visible for retrying login
        cy.get('input[name="username"]').should("be.visible");
    });

    /**
     * Test case: Should fail to log out and display the error modal.
     * The logout request is intercepted and mocked to simulate a failed response,
     * and we verify that the error modal is displayed.
     */
    it("should fail logout", () => {
        // Log in successfully before testing logout
        cy.login("logout user");

        // Confirm that the username appears on the page
        cy.contains(":not(input)", "logout user").should("exist");

        // Intercept the logout request and simulate a 401 error response (unauthorized)
        cy.intercept("DELETE", `${Cypress.env("DATABASE_HOST")}${Cypress.env("AUTH_PATH")}`, (req) => {
            req.reply({ statusCode: 401 });
        }).as('bad logout');

        // Attempt to log out
        cy.logout();

        // Confirm that the error modal appears on the page
        cy.get("#error-modal").should("be.visible");

        // Close the error modal
        cy.get('#close-error-button').click();

        // Ensure that the username input is still visible for retrying login
        cy.get('input[name="username"]').should("be.visible");
    });
});

describe("workspace errors", () => {
    before(() => {
        // Setup the database once before all tests in this describe block.
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
    });

    // Before each test, visit the application homepage and log in
    beforeEach(() => {
        cy.visit('/')
        cy.login("bad worker");
    });

    // After each test, close the error modal, close the workspace, and log out
    afterEach(() => {
        cy.get('#close-error-button').click();
        cy.get("#close-workspaces-button").then($button => {
            if ($button.is(':visible')) {
                cy.wrap($button).click();
            }
        });
        cy.logout();
    });

    /**
     * Test case: Attempts to delete a workspace that has already been deleted.
     * We simulate a scenario where the workspace is not found (404) and verify that
     * the error modal appears.
     */
    it("tries to delete an already gone workspace", () => {
        // Create a new workspace
        cy.createWorkspace("delete_workspace");

        // Confirm that the workspace appears on the page
        cy.contains("delete_workspace").should("exist");

        // Intercept delete request and simulate a 404 response (workspace not found)
        cy.intercept("DELETE", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}delete_workspace`, (req) => {
            req.reply({ statusCode: 404 });
        });

        // Attempt to delete the workspace
        cy.deleteWorkspace("delete_workspace");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    /**
     * Test case: Attempts to create a workspace that already exists.
     * We simulate a conflict (412) response and verify that the error modal appears.
     */
    it("tries to create an already created workspace", () => {
        // Intercept PUT request for creating a workspace and simulate a 412 response (resource already exists)
        cy.intercept("PUT", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}created_workspace`, (req) => {
            req.reply({ statusCode: 412 });
        });

        // Attempt to create the workspace
        cy.createWorkspace("created_workspace");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    it("is unauthorized while deleting a workspace", () => {
        cy.createWorkspace("unauth_workspace");

        // Confirm that the workspace appears on the page
        cy.contains("unauth_workspace").should("exist");

        cy.intercept("DELETE", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}unauth_workspace`, (req) => {
            req.reply({ statusCode: 401 });
        });

        cy.deleteWorkspace("unauth_workspace");

        cy.get("#error-modal").should("be.visible");
    });
});

describe("unauthorized workspace errors", () => {
    before(() => {
        // Setup the database once before all tests in this describe block.
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
    });

    // Before each test, visit the application homepage and log in
    beforeEach(() => {
        cy.visit('/')
        cy.login("bad worker");
        cy.contains(":not(input)", "bad worker").should("exist");
    });

    // After each test, close the error modal, close the workspace, and log out
    afterEach(() => {
        cy.get('#close-error-button').click();
        cy.get('input[name="username"]').should("be.visible");
    });

    it("errors while displaying a workspace", () => {
        cy.createWorkspace("temp_workspace");

        cy.contains("temp_workspace").should('exist');

        cy.createWorkspace("workspace_error");

        cy.contains("workspace_error").should('exist');
        // Intercept PUT request for creating a workspace and simulate a 412 response (resource already exists)
        cy.intercept("GET", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}temp_workspace/channels/`, (req) => {
            req.reply({ statusCode: 401 });
        });

        // Attempt to create the workspace
        cy.openWorkspace("temp_workspace");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    it("errors while refreshing workspaces", () => {
        // Intercept GET request for refreshing workspaces and simulate a 401 response (resource already exists)
        cy.intercept("GET", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}`, (req) => {
            req.reply({ statusCode: 401 });
        });

        // Attempt to create the workspace
        cy.get('#open-workspaces-button').click();

        cy.refreshWorkspace();

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });
})

describe("channel errors", () => {
    before(() => {
        // Setup the database once before all tests in this describe block.
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
    });

    // Before each test, visit the application homepage, log in, and create a workspace
    beforeEach(() => {
        cy.visit('/')
        cy.login("bad worker");
        cy.createWorkspace("channel_errors");
    });

    // After each test, close the error modal, delete the created workspace, close workspace modal, and log out
    afterEach(() => {
        cy.get('#close-error-button').click();
        cy.deleteWorkspace("channel_errors");
        cy.get('#close-workspaces-button').click();
        cy.logout();
    });

    /**
     * Test case: Attempts to delete a channel that has already been deleted.
     * We simulate a scenario where the channel is not found (404) and verify that
     * the error modal appears.
     */
    it("tries to delete an already gone channel", () => {
        // Create a new channel
        cy.createChannel("delete_channel");

        // Intercept delete request for the channel and simulate a 404 response (channel not found)
        cy.intercept("DELETE", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}channel_errors/channels/delete_channel`, (req) => {
            req.reply({ statusCode: 404 });
        });

        // Attempt to delete the channel
        cy.deleteChannel("delete_channel");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    /**
     * Test case: Attempts to create a channel that already exists.
     * We simulate a conflict (412) response and verify that the error modal appears.
     */
    it("tries to create an already created channel", () => {
        // Intercept PUT request for creating a channel and simulate a 412 response (resource already exists)
        cy.intercept("PUT", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}channel_errors/channels/created_channel`, (req) => {
            req.reply({ statusCode: 412 });
        });

        // Attempt to create the channel
        cy.createChannel("created_channel");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    /**
     * Test case: Attempts to delete a channel as an unauthorized user.
     * We simulate a conflict (401) response and verify that the error modal appears.
     */
    it("is unauthorized while deleting a channel", () => {
        cy.createChannel("unauth_channel");

        // Confirm that the channel appears on the page
        cy.contains("unauth_channel").should("exist");

        cy.intercept("DELETE", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}channel_errors/channels/unauth_channel`, (req) => {
            req.reply({ statusCode: 401 });
        });

        cy.deleteChannel("unauth_channel");

        cy.get("#error-modal").should("be.visible");
    });
});

describe("unauthorized channel errors", () => {
    before(() => {
        // Setup the database once before all tests in this describe block.
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
        cy.visit('/')
        cy.login("admin");
        cy.createWorkspace("channel_errors");
        cy.logout();
    });

    // Before each test, visit the application homepage, log in, and create a workspace
    beforeEach(() => {
        cy.visit('/')
        cy.login("bad worker");
        cy.openWorkspace("channel_errors");
    });

    // After each test, close the error modal, delete the created workspace, close workspace modal, and log out
    afterEach(() => {
        cy.get('#close-error-button').click();
        cy.get('input[name="username"]').should("be.visible");
    });

    after(() => {
        cy.visit('/')
        cy.login("admin");
        cy.deleteWorkspace("channel_errors");
        cy.get('#close-workspaces-button').click();
        cy.logout();
    })

    it("errors while displaying a channel", () => {
        cy.createChannel("temp_channel");

        cy.contains("temp_channel").should('exist');

        cy.createChannel("channel_error_chan");

        cy.contains("channel_error_chan").should('exist');
        // Intercept PUT request for creating a channel and simulate a 401 response (resource already exists)
        cy.intercept("GET", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}channel_errors/channels/temp_channel/posts/`, (req) => {
            req.reply({ statusCode: 401 });
        });

        // Attempt to display the channel
        cy.openChannel("temp_channel");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    it("errors while refreshing channels", () => {
        // Intercept GET request for refreshing channels and simulate a 401 response (resource already exists)
        cy.intercept("GET", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}channel_errors/channels/`, (req) => {
            req.reply({ statusCode: 401 });
        });

        // Attempt to refresh channels
        cy.refreshChannel();

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });
})

describe("unauthorized post errors", () => {
    before(() => {
        cy.visit('/');
        cy.login('admin');
        cy.createWorkspace("post_errors");
        cy.contains("post_errors").should('exist');
        cy.createChannel("post_errors_chan");
        cy.contains("post_errors_chan").should('exist');
        cy.logout();
    });

    // Before each test, visit the application homepage, log in, and create a workspace
    beforeEach(() => {
        cy.visit('/')
        cy.login("bad worker");
        cy.openWorkspace("post_errors");
        cy.contains("post_errors").should('exist');
        cy.openChannel("post_errors_chan");
        cy.contains("post_errors_chan").should('exist');
    });

    // After each test, close the error modal, delete the created workspace, close workspace modal, and log out
    afterEach(() => {
        cy.get('#close-error-button').click();
        cy.get('input[name="username"]').should("be.visible");
    });

    after(() => {
        cy.visit('/');
        cy.login('admin');
        cy.deleteWorkspace("post_errors");
        cy.get('#close-workspaces-button').click();
        cy.logout();
    });

    /**
     * Test case: Attempts to reply to a post but user is unauthorized.
     * We simulate a conflict (401) response and verify that the error modal appears.
     */
    it("is unauthorized while sending a reply", () => {
        cy.createPost("you will be unauthorized again");

        cy.contains("you will be unauthorized again").should('exist');

        // Intercept POST request for creating a channel and simulate a 412 response (resource already exists)
        cy.intercept("POST", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}post_errors/channels/post_errors_chan/posts/`, (req) => {
            req.reply({ statusCode: 401 });
        });

        // Attempt to reply to the post
        cy.getPost("you will be unauthorized again").replyToPost("i can't be made");

        // Confirm that the error modal appears
        cy.get("#error-modal").should("be.visible");
    });

    /**
     * Test case: Attempts to create a post but user is unauthorized.
     * We simulate a conflict (401) response and verify that the error modal appears.
     */
    it("is unauthorized while creating a post", () => {
        cy.intercept("POST", `${Cypress.env("DATABASE_HOST")}${Cypress.env("DATABASE_PATH")}post_errors/channels/post_errors_chan/posts/`, (req) => {
            req.reply({ statusCode: 401 });
        });

        cy.createPost("you can't make me");

        cy.get("#error-modal").should("be.visible");
    });

    // it("tries to create an empty post", () => {
    //     cy.get('post-textarea', { includeShadowDom: true }).get(`button[id=send-post]`).click()
    //     cy.get('post-textarea', { includeShadowDom: true }).get(`textarea[name=post]`).type('').should(($posttextarea) => {
    //     expect($posttextarea.get(0).checkValidity()).to.equal(false);
    //     expect($posttextarea.get(0).validationMessage).to.equal('Invalid date');
    //  });
    // });
})