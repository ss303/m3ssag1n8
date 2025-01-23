/**
 * This file contains the classes and functions used to manage user authentication
 * actions in the chat application, including login and logout events.
 * It includes an `initAuthView` function to initialize authentication elements
 * and the `AuthView` class that handles form submissions, button interactions,
 * and UI updates for authentication-related tasks.
 */

/**
 * Initializes the authentication view, setting up the login and logout buttons.
 *
 * @returns A new instance of the AuthView class.
 * @throws Will throw an error if the logout button or login form is not found.
 */
export function initAuthView() {
  const logoutbutton = document.querySelector("#logout-button");
  const loginForm = document.querySelector("#login-check");
  const loginInput = document.querySelector("#username-input");

  if (!(logoutbutton instanceof HTMLButtonElement)) {
    console.error("logoutbutton is not a button");
    throw new Error("there is no logout button");
  }

  if (!(loginForm instanceof HTMLFormElement)) {
    console.error("form is not a form");
    throw new Error("there is no login form");
  }

  if (!(loginInput instanceof HTMLInputElement)) {
    console.error("username input is not an input");
    throw new Error("there is no username input");
  }

  return new AuthView(logoutbutton, loginForm, loginInput);
}

/**
 * Class to manage user authentication actions, including login and logout events.
 */
class AuthView {
  /** Button element for user logout */
  private logoutbutton: HTMLButtonElement;
  /** Form element used for login actions */
  private loginForm: HTMLFormElement;
  /** Input element used for providing username for login */
  private loginInput: HTMLInputElement;

  /**
   * Initializes the AuthView with the required buttons and form elements.
   * Sets up event listeners for login and logout actions.
   *
   * @param logoutbutton - The button element for logging out.
   * @param loginForm - The form element used for login actions.
   * @param loginInput - The username input element.
   */
  constructor(
    logoutbutton: HTMLButtonElement,
    loginForm: HTMLFormElement,
    loginInput: HTMLInputElement,
  ) {
    this.logoutbutton = logoutbutton;
    this.loginForm = loginForm;
    this.loginInput = loginInput;

    this.loginForm.addEventListener("submit", this.submitUsername.bind(this));
    this.logoutbutton.addEventListener("click", this.clickLogout.bind(this));
    this.loginInput.focus();
  }

  /**
   * Handles form submission to log in a user.
   *
   * @param event - The form submission event.
   */
  private submitUsername(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    var formData = new FormData(this.loginForm);
    var username = formData.get("username");
    if (!username) {
      console.error("username is null");
      return;
    }

    // Create new instance of custom login event
    const loginEvent = new CustomEvent("loginEvent", {
      detail: { username: username.toString() },
    });

    // Notifies the document to login the user
    const usernameIpt = document.querySelector("#username-input");
    if (!(usernameIpt instanceof HTMLInputElement)) {
      console.error("username input not found");
      return;
    }
    usernameIpt.value = "";
    document.dispatchEvent(loginEvent);
  }

  /**
   * Handles user logout and triggers a custom logout event.
   *
   * @param event - The logout button click event.
   */
  private clickLogout(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    // Create new instance of custom login event
    const logoutEvent = new CustomEvent("logoutEvent");

    // Notifies the document to login the user
    document.dispatchEvent(logoutEvent);
  }

  /**
   * Displays the username on the main page and hides the login modal dialog.
   *
   * @param username - The username to display.
   */
  SuccessLogin(username: string) {
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    userHeader.innerText = username;
    document.getElementById("login-modal")?.classList.add("hide");
  }

  /**
   * Logs out the user, clears displayed data, and re-displays the login modal dialog.
   */
  SuccessLogout() {
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    const postArea = document.querySelector("#post-area");
    if (!(postArea instanceof HTMLElement)) {
      console.error("post area is not a html element");
      throw new Error("there is no post html element");
    }

    const postText = document.querySelector("post-textarea");
    if (postText instanceof HTMLElement) {
      if (!postText.shadowRoot) {
        console.error("no shadow root on post text area");
        throw new Error("there is no shadow root on text area");
      }

      const postTextInput = postText.shadowRoot.querySelector(".post-input");
      if (!(postTextInput instanceof HTMLTextAreaElement)) {
        console.error("not a text area");
        throw new Error("no text area input");
      }
      postTextInput.value = "";
    }

    const channelArea = document.querySelector("#channels");
    if (!(channelArea instanceof HTMLElement)) {
      console.error("channel area is not an element");
      throw new Error("there is no channel area");
    }
    const channelHeader = document.querySelector("#channel-title");
    if (!(channelHeader instanceof HTMLHeadingElement)) {
      console.error("channel title is not a header");
      throw new Error("there is no channel title");
    }

    const workspaceArea = document.querySelector("#select-workspace");
    if (!(workspaceArea instanceof HTMLElement)) {
      console.error("workspace area is not an element");
      throw new Error("there is no workspace area");
    }

    const workspaceHeader = document.querySelector("#workspace-title");
    if (!(workspaceHeader instanceof HTMLHeadingElement)) {
      console.error("workspace title is not a header");
      throw new Error("there is no workspace title");
    }

    const mainTextarea = document.querySelector("#main-post-textarea");
    if (!(mainTextarea instanceof HTMLElement)) {
      console.error("main textarea section is not present");
      throw new Error("there is no main textarea section");
    }

    const workspacesModal = document.getElementById("workspaces-modal");
    if (!(workspacesModal instanceof HTMLDialogElement)) {
      console.error("workspace modal is not a dialogue");
      throw new Error("there is no workspace modal");
    }

    postArea.innerText = "";
    channelArea.innerText = "";
    workspaceArea.innerText = "";
    workspaceHeader.innerText = "";
    channelHeader.innerText = "";
    userHeader.innerText = "";
    mainTextarea.innerHTML = "";
    workspacesModal.classList.add("hide");
    document.getElementById("login-modal")?.classList.remove("hide");

    this.loginInput.focus();
  }
}
