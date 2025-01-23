/// <reference types="cypress" />

export function setupDatabase(host: string, database: string): void {
  // Remove the trailing slash.
  const dburl = host + database.slice(0, -1);

  // Delete entire database in case it was modified in previous tests.
  // Allow this to fail, as the database might not exist yet.
  cy.request({
    method: "DELETE",
    url: dburl,
    headers: {
      Authorization: "Bearer user1token",
    },
    failOnStatusCode: false,
  });

  cy.request({
    method: "PUT",
    url: dburl,
    headers: {
      Authorization: "Bearer user1token",
    },
  });

  cy.request({
    method: "PUT",
    url: `${dburl}/Workspace`,
    headers: {
      Authorization: "Bearer user1token",
    },
    body: {},
  });

  cy.request({
    method: "PUT",
    url: `${dburl}/Workspace/channels/`,
    headers: {
      Authorization: "Bearer user1token",
    },
  });

  cy.request({
    method: "PUT",
    url: `${dburl}/Workspace/channels/Channel`,
    headers: {
      Authorization: "Bearer user1token",
    },
    body: {},
  });

  cy.request({
    method: "PUT",
    url: `${dburl}/Workspace/channels/Channel/posts/`,
    headers: {
      Authorization: "Bearer user1token",
    },
    body: {},
  });

  cy.request({
    method: "POST",
    url: `${dburl}/Workspace/channels/Channel/posts/`,
    headers: {
      Authorization: "Bearer user1token",
    },
    body: {
      msg: "This is a test post",
    },
  });
}