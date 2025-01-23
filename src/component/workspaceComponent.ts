/**
 * A web component representing a workspace in the messaging application
 */
export class Workspace extends HTMLElement {
  /** The template for workspace items */
  private static template: HTMLTemplateElement;

  /** The shadow DOM for this workspace item */
  private shadow: ShadowRoot;
  /** The controller used for adding event listeners */
  private controller: AbortController | null = null;
  /** The HTML representation of the workspace name */
  private nameHTML: HTMLButtonElement;
  /** The name of the current workspace */
  private name: string;
  /** The button for deleting the current workspace */
  private deleteBtn: HTMLButtonElement;
  /** The button for pinning the current workspace */
  private pinBtn: HTMLButtonElement;

  /**
   * Initializes the workspace web component before any instances are created
   */
  static initialize(): void {
    var temp = document.querySelector("#workspace-template");
    if (!(temp instanceof HTMLTemplateElement)) {
      throw new Error("Workspace template is not a template");
    }
    Workspace.template = temp;
  }

  /**
   * Creates an instance of the Workspace web component
   * @param name The name of the current workspace
   */
  constructor(name: string) {
    super();

    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.append(Workspace.template.content.cloneNode(true));

    const nameField = this.shadow.querySelector(".workspace");
    if (!(nameField instanceof HTMLButtonElement)) {
      throw new Error("Name field is not a button");
    }

    const deleteBtn = this.shadow.querySelector(".delete-workspace");
    if (!(deleteBtn instanceof HTMLButtonElement)) {
      throw new Error("Workspace does not have a delete button");
    }

    const pinBtn = this.shadow.querySelector(".pin-workspace");
    if (!(pinBtn instanceof HTMLButtonElement)) {
      throw new Error("Workspace does not have a pin button");
    }
    pinBtn.id += `-${name}`;

    nameField.innerText = name;
    this.nameHTML = nameField;
    this.name = name;
    this.deleteBtn = deleteBtn;
    this.pinBtn = pinBtn;
  }

  /**
   * Initializes the controller and adds the click event listeners for the workspace
   */
  connectedCallback(): void {
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };

    // When clicking on the workspace option, trigger displaying channels on the sidebar
    // and displaying workspace name at the top left corner
    this.nameHTML.addEventListener(
      "click",
      this.viewWorkspace.bind(this),
      options,
    );

    this.deleteBtn.addEventListener(
      "click",
      this.deleteWorkspace.bind(this),
      options,
    );

    this.pinBtn.addEventListener(
      "click",
      this.pinWorkspace.bind(this),
      options,
    );
  }

  /**
   * Dispatches a displayWorkspaceEvent to the document
   */
  viewWorkspace(): void {
    const displayWorkspaceEvent = new CustomEvent("displayWorkspaceEvent", {
      detail: { name: this.name },
    });

    document.dispatchEvent(displayWorkspaceEvent);
  }

  /**
   * Dispatches a deleteWorkspaceEvent to the document
   */
  deleteWorkspace(): void {
    const deleteWorkspaceEvent = new CustomEvent("deleteWorkspaceEvent", {
      detail: { name: this.name },
    });

    document.dispatchEvent(deleteWorkspaceEvent);
  }

  /**
   * Handles the pinning of a workspace.
   * @param event - The event triggered by clicking the pin button.
   * @throws Error - If the username header element is not found in the DOM.
   */
  pinWorkspace(event: Event): void {
    event.stopPropagation();
    //event.preventDefault();
    this.pinBtn.disabled = true;

    // add to class list if it has already been clicked and then check that for a boolean that it's been reacted to
    // then if it has already been clicked, it will be an arrayadd
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var pinned: boolean;
    if (this.pinBtn.classList.contains("pinned")) {
      // has already been favorited and this is to remove from favorites
      pinned = true;
    } else {
      // has not been favorited and this is to add to favorites
      pinned = false;
    }

    const pinWorkspaceEvent = new CustomEvent("pinWorkspaceEvent", {
      detail: {
        clicker: userHeader.innerText,
        workspace: this.name,
        pinned: pinned,
      },
    });

    document.dispatchEvent(pinWorkspaceEvent);
  }

  /*
   * Enables the specified button by name.
   * @param name - The name of the button to enable. Currently supports:
   *               - "pin": Enables the pin button.
   */
  enableButton(name: string): void {
    switch (name) {
      case "pin":
        this.pinBtn.disabled = false;
        break;
      default:
        break;
    }
  }

  /**
   * Retrieves the name of the current channel.
   * @returns The name of the channel as a string.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Sets the controller to null when the workspace is removed from the document
   */
  disconnectedCallback(): void {
    this.controller?.abort();
    this.controller = null;
  }
}

/**
 * Initializes all web components for workspace items before they are created and added to the document
 */
export function initWorkspaceComponent(): void {
  Workspace.initialize();
  customElements.define("workspace-item", Workspace);
}
