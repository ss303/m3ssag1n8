/**
 * A web component for channels in the side navigation bar.
 */
export class ChannelItem extends HTMLElement {
  /** The template for channel items */
  private static template: HTMLTemplateElement;
  /** The shadow DOM for this channel item */
  private shadow: ShadowRoot;
  /** The controller used for adding event listeners */
  private controller: AbortController | null = null;
  /** The HTML representation of the channel */
  private channelBtn: HTMLButtonElement;
  /** The name of the current channel */
  private name: string;
  /** The name of the containing workspace */
  private workspace: string;
  /** The button for deleting the current channel */
  private deleteBtn: HTMLButtonElement;
  /** The button for pinning the current channel */
  private pinBtn: HTMLButtonElement;

  /**
   * Initializes the channel web component before any instances are created
   */
  static initialize(): void {
    var temp = document.querySelector("#channel-template");
    if (!(temp instanceof HTMLTemplateElement)) {
      throw new Error("Channel template is not a template");
    }
    ChannelItem.template = temp;
  }

  /**
   * Initializes all private fields and the shadow DOM
   * @param workspace The containing workspace's name
   * @param name The name of the current channel
   */
  constructor(workspace: string, name: string) {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    const clone = ChannelItem.template.content.cloneNode(
      true,
    ) as DocumentFragment;

    const aChannel = clone.querySelector("#channel");
    if (!(aChannel instanceof HTMLElement)) {
      throw new Error(`Error: aPost is not an HTML element`);
    }

    aChannel.id += `-${workspace}`;
    this.shadow.append(clone);

    const channelBtn = this.shadow.querySelector(".channel");
    if (!(channelBtn instanceof HTMLButtonElement)) {
      throw new Error("Channel is not a button in side bar");
    }

    const deleteBtn = this.shadow.querySelector(".delete-channel");
    if (!(deleteBtn instanceof HTMLButtonElement)) {
      throw new Error("Channel does not have a delete button");
    }

    const pinBtn = this.shadow.querySelector(".pin-channel");
    if (!(pinBtn instanceof HTMLButtonElement)) {
      throw new Error("Channel does not have a pin button");
    }
    pinBtn.id += `-${name}`;

    this.name = name;
    channelBtn.innerText = name;
    this.channelBtn = channelBtn;
    this.workspace = workspace;
    this.deleteBtn = deleteBtn;
    this.pinBtn = pinBtn;
  }

  /**
   * Initializes the controller and adds the click event listener for the channel
   */
  connectedCallback(): void {
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };

    this.channelBtn.addEventListener(
      "click",
      this.viewChannel.bind(this),
      options,
    );

    this.deleteBtn.addEventListener(
      "click",
      this.deleteChannel.bind(this),
      options,
    );

    this.pinBtn.addEventListener("click", this.pinChannel.bind(this), options);
  }

  /**
   * Sets the controller to null when the channel is removed from the document
   */
  disconnectedCallback(): void {
    this.controller?.abort();
    this.controller = null;
  }

  /**
   * Dispatches a displayChannelEvent to the document
   * @param event The event that triggered this function call
   */
  viewChannel(event: MouseEvent): void {
    event.stopPropagation();
    const displayChannelEvent = new CustomEvent("displayChannelEvent", {
      detail: { workspace: this.workspace, name: this.name },
    });

    document.dispatchEvent(displayChannelEvent);
  }

  /**
   * Dispatches a deleteChannelEvent to the document to delete the channel
   */
  deleteChannel(): void {
    const deleteChannelEvent = new CustomEvent("deleteChannelEvent", {
      detail: { workspace: this.workspace, name: this.name },
    });

    document.dispatchEvent(deleteChannelEvent);
  }

  /**
   * Handles the pinning of a channel.
   * @param event - The mouse event triggered by clicking the pin button.
   * @throws Error - If the username header element is not found in the DOM.
   */
  pinChannel(event: MouseEvent): void {
    event.stopPropagation();
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

    const pinChannelEvent = new CustomEvent("pinChannelEvent", {
      detail: {
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.name,
        pinned: pinned,
      },
    });

    document.dispatchEvent(pinChannelEvent);
  }

  /**
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
}

/**
 * Initializes all web components before they are created and added to the document
 */
export function initChannelComponent(): void {
  ChannelItem.initialize();
  customElements.define("channel-item", ChannelItem);
}
