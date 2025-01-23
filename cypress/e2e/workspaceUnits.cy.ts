import { setupDatabase } from "./setup";

/**
 * This Cypress file contains tests for checking that workspace events
 * are triggered properly.
 */
describe("workspace event tests", () => {
    before(() => {
        setupDatabase(Cypress.env("DATABASE_HOST"), Cypress.env("DATABASE_PATH"));
        cy.visit('/');
        cy.login('admin');
        cy.createWorkspace("event workspace");
        cy.logout();
    });

    beforeEach(() => {
        cy.visit('/');
        cy.login('workspace user');
    });

    afterEach(() => {
        cy.get('#close-workspaces-button').click();
        cy.logout();
    });

    after(() => {
        cy.visit('/');
        cy.login('admin');
        cy.deleteWorkspace("event workspace");
        cy.get('#close-workspaces-button').click();
        cy.logout();
    })

    /**
     * Test Case: Triggers change workspace event.
     * Expects the event handler to have been called one time.
     */
    it("should trigger change workspace event", () => {
        cy.get('#open-workspaces-button').click();
        cy.get('workspace-item').contains("event workspace").then((component) => {
            const eventHandler = cy.spy().as("eventHandler");
            component[0].addEventListener('change', eventHandler);

            component[0].dispatchEvent(new Event('change'));

            // Assert that the event handler was called
            cy.get("@eventHandler").should("have.been.calledOnce");

        });
    });

    /**
     * Test Case: Pins workspace.
     * Expects the workspace to still be visible on page.
     */
    it("should pin workspace", () => {
        cy.get('#open-workspaces-button').click();
        cy.pinWorkspace("event workspace");
        cy.contains("event workspace").should("exist");
        cy.pinWorkspace("event workspace");
        cy.contains("event workspace").should("exist");
    });
})