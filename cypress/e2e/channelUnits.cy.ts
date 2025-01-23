import { setupDatabase } from "./setup";

/**
 * This Cypress file contains tests for checking that workspace events
 * are triggered properly.
 */
describe("channel event tests", () => {
    before(() => {
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
        cy.visit('/');
        cy.login('admin');
        cy.createWorkspace("event channel");
        cy.createChannel("event channel");
        cy.createChannel("pinChan1");
        cy.contains("pinChan1").should("exist");
        cy.createChannel("pinChan2");
        cy.contains("pinChan2").should("exist");
        cy.logout();
    });

    beforeEach(() => {
        cy.visit('/');
        cy.login('channel user');
        cy.openWorkspace("event channel");
    });

    afterEach(() => {
        cy.logout();
    });

    after(() => {
        cy.visit('/');
        cy.login('admin');
        cy.deleteWorkspace("event channel");
        cy.get('#close-workspaces-button').click();
        cy.logout();
    });

    /**
     * Test Case: Pins channel.
     * Expects the channel to still be visible on page.
     */
    it("should pin channel", () => {
        cy.pinChannel("event channel");
        cy.contains("event channel").should("exist");
        cy.pinChannel("event channel");
        cy.contains("event channel").should("exist");
    });

    /**
     * Test Case: Views previously pinned channels
     * Expects channels to still be pinned when logging out and logging back in.
     */
    it("should see previously pinned channels after logging out", () => {
        cy.pinChannel("pinChan1");
        cy.pinChannel("pinChan2");
        cy.logout();
        cy.login("channel user");
        cy.openWorkspace("event channel");
        cy.contains("pinChan1").should("exist");
        cy.contains("pinChan2").should("exist");
    });
})