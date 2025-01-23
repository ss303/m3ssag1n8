import { Workspace } from "../component/workspaceComponent";

/**
 * This file contains the implementation of the `WorkspaceView` class,
 * which is responsible for managing the display and interaction with workspaces.
 * It also initializes the view for handling workspaces and workspace operations.
 */

/**
 * Represents a view workspace with path, document, and metadata.
 */
interface ViewWorkspace {
  path: string;
  doc: {
    extensions?: {
      pins?: Array<string>;
    };
  };
  meta: Metadata;
}

/**
 * Represents metadata information, including creation and modification details.
 */
interface Metadata {
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
}

/**
 * Initializes the workspace view by attaching to relevant DOM elements and setting up event handlers.
 * @returns A new instance of the WorkspaceView class
 */
export function initWorkspaceView() {
  const openWorkspacesButton = document.querySelector(
    "#open-workspaces-button",
  );
  const closeWorkspacesButton = document.querySelector(
    "#close-workspaces-button",
  );
  const refreshWorkspacesButton = document.querySelector(
    "#refresh-workspaces-button",
  );
  const workspaceForm = document.querySelector("#modify-workspace-form");
  const workspaceArea = document.querySelector("#select-workspace");
  const workspaceHeader = document.querySelector("#workspace-title");

  if (!(openWorkspacesButton instanceof HTMLButtonElement)) {
    console.error("openWorkspacesButton is not a button");
    throw new Error("there is no open workspaces button");
  }

  if (!(closeWorkspacesButton instanceof HTMLButtonElement)) {
    console.error("closeWorkspacesButton is not a button");
    throw new Error("there is no close workspaces button");
  }

  if (!(workspaceForm instanceof HTMLFormElement)) {
    console.error("workspace form is not a form");
    throw new Error("there is no workspace form");
  }

  if (!(workspaceArea instanceof HTMLElement)) {
    console.error("workspace area is not an unordered list");
    throw new Error("there is no workspace area");
  }

  if (!(workspaceHeader instanceof HTMLHeadingElement)) {
    console.error("workspace title is not a header");
    throw new Error("there is no workspace title");
  }

  if (!(refreshWorkspacesButton instanceof HTMLButtonElement)) {
    console.error("refresh workspaces is not a button");
    throw new Error("there is no add workspace ");
  }

  return new WorkspaceView(
    openWorkspacesButton,
    closeWorkspacesButton,
    refreshWorkspacesButton,
    workspaceForm,
    workspaceArea,
    workspaceHeader,
  );
}

/**
 * A class for managing the workspace view, including displaying and interacting with workspaces.
 */
class WorkspaceView {
  /** Area where workspaces are displayed */
  private workspaceArea: HTMLElement;
  /** Header element for the workspace display area */
  private workspaceHeader: HTMLHeadingElement;
  /** Button element for opening workspaces modal */
  private openWorkspacesButton: HTMLButtonElement;
  /** Button element for closing workspaces modal */
  private closeWorkspacesButton: HTMLButtonElement;
  /** Button element for refreshing workspaces  */
  private refreshWorkspacesButton: HTMLButtonElement;
  /** Form element used for creating workspace */
  private workspaceForm: HTMLFormElement;
  /** Mapping of all workspace names to their Workspace items */
  private allWorkspaceMapping: Map<string, Workspace>;
  /** Mapping of pinned Workspace names to their Workspace items */
  private pinnedWorkspaceMapping: Map<string, Workspace>;

  /**
   * Initializes the WorkspaceView instance with the given HTML elements for interacting with workspaces.
   *
   * @param openWorkspacesButton - The button element for opening workspaces modal.
   * @param closeWorkspacesButton - The button element for closing workspaces modal.
   * @param refreshWorkspacesButton - The button element for refreshing the list of workspaces.
   * @param workspaceForm - The form element used for creating a new workspace.
   * @param workspaceArea - The area where workspaces are displayed.
   * @param workspaceHeader - The header for the workspace display area.
   */
  constructor(
    openWorkspacesButton: HTMLButtonElement,
    closeWorkspacesButton: HTMLButtonElement,
    refreshWorkspacesButton: HTMLButtonElement,
    workspaceForm: HTMLFormElement,
    workspaceArea: HTMLElement,
    workspaceHeader: HTMLHeadingElement,
  ) {
    this.openWorkspacesButton = openWorkspacesButton;
    this.closeWorkspacesButton = closeWorkspacesButton;
    this.refreshWorkspacesButton = refreshWorkspacesButton;
    this.workspaceForm = workspaceForm;
    this.workspaceArea = workspaceArea;
    this.workspaceHeader = workspaceHeader;
    this.allWorkspaceMapping = new Map<string, Workspace>();
    this.pinnedWorkspaceMapping = new Map<string, Workspace>();

    this.openWorkspacesButton.addEventListener(
      "click",
      this.openWorkspacesModal,
    );
    this.closeWorkspacesButton.addEventListener(
      "click",
      this.closeWorkspacesModal,
    );

    this.workspaceForm.addEventListener(
      "submit",
      this.createWorkspace.bind(this),
    );

    this.refreshWorkspacesButton.addEventListener(
      "click",
      this.refreshWorkspaces,
    );

    this.workspaceArea.addEventListener(
      "change",
      this.changeWorkspace.bind(this),
    );
  }

  /**
   * Displays all available workspaces in the workspace area.
   * @param workspaces - An array of workspaces to display.
   */
  displayAllWorkspaces(workspaces: Array<ViewWorkspace>): void {
    console.log(
      "Displaying all workspaces to the current user, # of workspaces: ",
      workspaces.length,
    );
    this.workspaceArea.innerHTML = ""; // sidebar area

    var pinnedWorkspaces = new Array<ViewWorkspace>();
    var generalWorkspaces = new Array<ViewWorkspace>();

    // Separate posts into pinned by current user and not pinned by current user
    this.getPinnedWorkspaces(workspaces, pinnedWorkspaces, generalWorkspaces);

    pinnedWorkspaces.forEach((workspace: ViewWorkspace) => {
      var name = workspace.path.slice(1);
      const workspaceComp = new Workspace(name); // need to escape current post's path as well
      this.pinnedWorkspaceMapping.set(name, workspaceComp);
      if (workspaceComp.shadowRoot) {
        const pinButton = workspaceComp.shadowRoot.getElementById(
          `pin-${name}`,
        );
        if (!(pinButton instanceof HTMLButtonElement)) {
          throw new Error("no pin button");
        }
        pinButton.classList.add("pinned");
      }
      this.workspaceArea.append(workspaceComp);
    });
    console.log("added pinned workspaces");

    generalWorkspaces.forEach((workspace: ViewWorkspace) => {
      var name = workspace.path.slice(1);
      const workspaceComp = new Workspace(name);
      this.allWorkspaceMapping.set(name, workspaceComp);
      this.workspaceArea.append(workspaceComp);
    });
    console.log("added unpinned workspaces");
  }

  /**
   * Modifies Workspace arrays in place to distinguish pinned Workspaces from non-pinned Workspaces
   * @param allWorkspaces Array of Workspace objects currently in the Workspace
   * @param pinnedWorkspaces Array of Workspace objects to contain pinned Workspaces by current user
   * @param generalWorkspaces Array of Workspace objects to contain Workspaces not pinned by current user
   */
  private getPinnedWorkspaces(
    allWorkspaces: Array<ViewWorkspace>,
    pinnedWorkspaces: Array<ViewWorkspace>,
    generalWorkspaces: Array<ViewWorkspace>,
  ) {
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    const currUser = userHeader.innerText;
    allWorkspaces.forEach((workspace: ViewWorkspace) => {
      let pins = workspace.doc.extensions?.pins;
      if (Array.isArray(pins)) {
        if (pins.find((s) => s === currUser)) {
          pinnedWorkspaces.push(workspace);
        } else {
          generalWorkspaces.push(workspace);
        }
      } else {
        generalWorkspaces.push(workspace);
      }
    });
  }

  /**
   * Handles workspace selection changes and triggers a custom event.
   * @param event - The change event triggered by selecting a new workspace.
   */
  changeWorkspace(event: Event) {
    const selectedOption = event.target as HTMLButtonElement;
    const name = selectedOption.textContent;
    const displayWorkspaceEvent = new CustomEvent("displayWorkspaceEvent", {
      detail: { name: name },
    });

    document.dispatchEvent(displayWorkspaceEvent);
  }

  /**
   * Adjusts the display of workspace buttons and channels for a selected workspace.
   * @param name - The name of the selected workspace.
   */
  displayWorkSpace(name: string): void {
    this.closeWorkspacesModal();
    this.workspaceHeader.innerText = name;
  }

  /**
   * Clears the display area for workspaces.
   */
  clearWorkspaceDisplay() {
    this.workspaceHeader.innerText = "";
  }

  /**
   * Opens the workspaces modal dialog to display the list of available workspaces.
   */
  private openWorkspacesModal() {
    const workspacesModal = document.getElementById("workspaces-modal");

    if (!(workspacesModal instanceof HTMLDialogElement)) {
      console.error("workspace modal is not a dialogue");
      throw new Error("there is no workspace modal");
    }
    workspacesModal.classList.remove("hide");

    // Query all focusable elements inside the modal
    const focusableElements = workspacesModal.querySelectorAll(
      'button, input, workspace-item, [tabindex]:not([tabindex="-1"])',
    );

    // Focus the first focusable element, if any
    if (focusableElements.length > 0) {
      if (focusableElements[0] instanceof HTMLElement) {
        if (focusableElements[0] instanceof Workspace) {
          const firstWkspace = focusableElements[0];
          const firstButton =
            firstWkspace.shadowRoot?.querySelector(".workspace");
          if (firstButton instanceof HTMLButtonElement) {
            firstButton.focus();
          }
        } else {
          focusableElements[0].focus();
        }
      }
    }
  }

  /**
   * Closes the workspaces modal dialog.
   */
  private closeWorkspacesModal() {
    const nameIpt = document.querySelector("#workspace-input");
    if (!(nameIpt instanceof HTMLInputElement)) {
      console.error("username input not found");
      return;
    }
    nameIpt.value = "";
    document.getElementById("workspaces-modal")?.classList.add("hide");
  }

  /**
   * Handles the creation of a new workspace when the form is submitted.
   * @param event - The form submission event.
   */
  private createWorkspace(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    var formData = new FormData(this.workspaceForm);
    var name = formData.get("workspace");
    if (!name) {
      console.error("workspace name is null");
      return;
    }

    // Create new instance of custom login event
    const createWorkspaceEvent = new CustomEvent("createWorkspaceEvent", {
      detail: { name: name.toString() },
    });

    // Notifies the document to create the new workspace
    this.closeWorkspacesModal();
    document.dispatchEvent(createWorkspaceEvent);
  }

  /**
   * Refreshes the list of workspaces by dispatching a custom event.
   */
  private refreshWorkspaces() {
    console.log("User has requested to refresh workspaces");
    const refreshWorkspacesEvent = new CustomEvent(
      "refreshWorkspacesEvent",
      {},
    );

    document.dispatchEvent(refreshWorkspacesEvent);
  }

  /**
   * Toggles the pinned state of a workspace.
   * @param wsName - The name of the workspace to pin or unpin.
   * @param pinned - The current pin state of the channel.
   *                  - `true`: Unpins the channel.
   *                  - `false`: Pins the channel.
   *
   * @throws Error - If the workspace with the specified name is undefined.
   * @throws Error - If the workspace does not have a shadow root.
   * @throws Error - If the workspace does not have a corresponding pin button.
   */
  togglePin(wsName: string, pinned: boolean) {
    var wsElem: Workspace | undefined;
    if (pinned) {
      console.log(this.pinnedWorkspaceMapping.entries());
      wsElem = this.pinnedWorkspaceMapping.get(wsName);
    } else {
      console.log(this.allWorkspaceMapping.entries());
      wsElem = this.allWorkspaceMapping.get(wsName);
    }
    if (wsElem === undefined) {
      throw new Error("The channel with the specified path is undefined");
    } else if (!wsElem.shadowRoot) {
      throw new Error("The channel having its pin updated has no shadow root");
    }
    const pinButton = wsElem.shadowRoot.getElementById(`pin-${wsName}`);
    if (!(pinButton instanceof HTMLButtonElement)) {
      throw new Error("No pin button exists for this channel");
    }

    if (pinned) {
      pinButton.classList.remove("pinned");
    } else {
      pinButton.classList.add("pinned");
    }
    wsElem.enableButton("pin");

    if (pinned) {
      // removing it from pinned
      this.allWorkspaceMapping.set(wsName, wsElem);
      this.pinnedWorkspaceMapping.delete(wsName);
      var temp3 = new Array<string>();
      this.allWorkspaceMapping.forEach((_, workspace: string) => {
        temp3.push(workspace);
      });
      temp3.sort();
      var index: number = -1;
      temp3.forEach((val, i) => {
        if (wsElem === undefined) {
          throw new Error("why are we here?");
        }
        if (val === wsElem.getName()) {
          index = i;
        }
      });
      console.log("index", index);
      const follows = index === -1 ? null : temp3.at(index + 1);
      var followingChan: Workspace | undefined;
      if (follows) {
        followingChan = this.allWorkspaceMapping.get(follows);
      }
      this.workspaceArea.insertBefore(
        wsElem,
        followingChan === undefined ? null : followingChan,
      );
    } else {
      // adding it to pinned
      this.allWorkspaceMapping.delete(wsName);
      this.pinnedWorkspaceMapping.set(wsName, wsElem);
      const firstRegular = this.getFirstUnpinned();
      this.workspaceArea.insertBefore(wsElem, firstRegular);
    }
  }

  /**
   * Retrieves the first unpinned workspace.
   * @returns The first unpinned `Workspace` or `null` if none exist.
   */
  getFirstUnpinned(): Workspace | null {
    var temp3 = new Array<Workspace>();
    this.allWorkspaceMapping.forEach((workspace: Workspace) => {
      temp3.push(workspace);
    });
    temp3.sort((a, b) => {
      return a.getName().localeCompare(b.getName());
    });
    const head = temp3.at(0);
    return head === undefined ? null : head;
  }
}
