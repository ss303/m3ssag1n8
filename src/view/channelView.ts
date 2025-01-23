/**
 * This file manages the channel view for the chat application. It contains
 * interfaces to represent metadata and channel views, an initialization function
 * for the channel view, and a class (`ChannelView`) that manages the display and
 * interaction of channels, including creating and refreshing channels.
 */

import { ChannelItem } from "../component/channelComponent";

/**
 * Represents a view channel with path, document, and metadata.
 */
interface ViewChannel {
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
 * Initializes the channel view.
 * @returns A new instance of the ChannelView class.
 */
export function initChannelView() {
  const refreshChannelsButton = document.querySelector(
    "#refresh-channels-button",
  );
  const channelForm = document.querySelector("#modify-channel-form");
  const channelFormWrapper = document.querySelector("#modify-channel");
  const channelArea = document.querySelector("#channels");
  const channelHeader = document.querySelector("#channel-title");

  if (!(refreshChannelsButton instanceof HTMLButtonElement)) {
    console.error("refresh channels is not a button");
    throw new Error("there is no add workspace ");
  }

  if (!(channelForm instanceof HTMLFormElement)) {
    console.error("channel form is not a form");
    throw new Error("there is no channel form");
  }

  if (!(channelFormWrapper instanceof HTMLElement)) {
    console.error("channel form wrapper is not an HTML element");
    throw new Error("there is no channel form wrapper");
  }

  if (!(channelArea instanceof HTMLElement)) {
    console.error("channel area is not an unordered list");
    throw new Error("there is no channel area");
  }

  if (!(channelHeader instanceof HTMLHeadingElement)) {
    console.error("channel title is not a header");
    throw new Error("there is no channel title");
  }

  return new ChannelView(
    refreshChannelsButton,
    channelForm,
    channelFormWrapper,
    channelArea,
    channelHeader,
  );
}

/**
 * A class which handles all references to the channels in the whole view.
 */
class ChannelView {
  /** Area where channels are displayed */
  private channelArea: HTMLElement;
  /** Header element for the channel display area */
  private channelHeader: HTMLHeadingElement;
  /** Button element for refreshing channels */
  private refreshChannelsButton: HTMLButtonElement;
  /** Form element used for creating channel */
  private channelForm: HTMLFormElement;
  /** Wrapper around form for creating/refreshing channels */
  private channelFormWrapper: HTMLElement;
  /** Mapping of all channel names to their Channel items */
  private allChannelMapping: Map<string, ChannelItem>;
  /** Mapping of pinned channel names to their Channel items */
  private pinnedChannelMapping: Map<string, ChannelItem>;

  /**
   * Initializes the ChannelView with the required elements, such as buttons, form,
   * and areas where channels are displayed. Sets up event listeners for channel-related actions.
   *
   * @param refreshChannelsButton - The button to refresh the list of channels.
   * @param channelForm - The form element for creating channels.
   * @param channelFormWrapper - The wrapper element for the channel form.
   * @param channelArea - The area where channels are displayed.
   * @param channelHeader - The header for the channel display area.
   */
  constructor(
    refreshChannelsButton: HTMLButtonElement,
    channelForm: HTMLFormElement,
    channelFormWrapper: HTMLElement,
    channelArea: HTMLElement,
    channelHeader: HTMLHeadingElement,
  ) {
    this.refreshChannelsButton = refreshChannelsButton;
    this.channelForm = channelForm;
    this.channelFormWrapper = channelFormWrapper;
    this.channelArea = channelArea;
    this.channelHeader = channelHeader;
    this.allChannelMapping = new Map<string, ChannelItem>();
    this.pinnedChannelMapping = new Map<string, ChannelItem>();

    this.channelForm.addEventListener("submit", this.createChannel.bind(this));
    this.refreshChannelsButton.addEventListener(
      "click",
      this.refreshChannels.bind(this),
    );
  }

  /**
   * Clears and hides the channel header.
   */
  clearChannelHeader() {
    this.channelHeader.innerHTML = "";
    this.channelHeader.classList.add("hide");
  }

  /**
   * Clears and hides the channel header, clears channels side bar, and hides add/refresh channels options.
   */
  clearChannelDisplay() {
    this.clearChannelHeader();

    // Clear sidebar area
    this.channelArea.innerHTML = "";

    // Clear and hide channel modification options
    this.channelForm.classList.add("hide");
    this.refreshChannelsButton.classList.add("hide");
    this.channelFormWrapper.classList.add("hide");
  }

  /**
   * Displays all channels for a given workspace.
   * @param workspace - The name of the workspace.
   * @param channels - An array of channels to display.
   */
  displayAllChannels(workspace: string, channels: Array<ViewChannel>): void {
    console.log(
      "Displaying all channels to the current user, # of channels: ",
      channels.length,
    );

    // Unhide channel modification options
    this.channelForm.classList.remove("hide");
    this.refreshChannelsButton.classList.remove("hide");
    this.channelFormWrapper.classList.remove("hide");
    this.channelArea.innerHTML = ""; // sidebar area

    var pinnedChannels = new Array<ViewChannel>();
    var generalChannels = new Array<ViewChannel>();

    // Separate posts into pinned by current user and not pinned by current user
    this.getPinnedChannels(channels, pinnedChannels, generalChannels);

    pinnedChannels.forEach((currChannel: ViewChannel) => {
      const splitPath = currChannel.path.split("/");
      var name = splitPath[splitPath.length - 1];
      const channel = new ChannelItem(workspace, name); // need to escape current post's path as well
      this.pinnedChannelMapping.set(name, channel);
      if (channel.shadowRoot) {
        const pinButton = channel.shadowRoot.getElementById(`pin-${name}`);
        if (!(pinButton instanceof HTMLButtonElement)) {
          throw new Error("no pin button");
        }
        pinButton.classList.add("pinned");
      }
      this.channelArea.append(channel);
    });
    console.log("added pinned channels");
    generalChannels.forEach((currChannel: ViewChannel) => {
      const splitPath = currChannel.path.split("/");
      var name = splitPath[splitPath.length - 1];
      const channel = new ChannelItem(workspace, name); // need to escape current post's path as well
      this.allChannelMapping.set(name, channel);
      this.channelArea.append(channel);
    });
    console.log("added unpinned channels");
  }

  /**
   * Modifies channel arrays in place to distinguish pinned channels from non-pinned channels
   * @param allChannels Array of channel objects currently in the channel
   * @param pinnedChannels Array of channel objects to contain pinned channels by current user
   * @param generalChannels Array of channel objects to contain channels not pinned by current user
   */
  private getPinnedChannels(
    allChannels: Array<ViewChannel>,
    pinnedChannels: Array<ViewChannel>,
    generalChannels: Array<ViewChannel>,
  ) {
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    const currUser = userHeader.innerText;
    allChannels.forEach((channel: ViewChannel) => {
      let pins = channel.doc.extensions?.pins;
      if (Array.isArray(pins)) {
        if (pins.find((s) => s === currUser)) {
          pinnedChannels.push(channel);
        } else {
          generalChannels.push(channel);
        }
      } else {
        generalChannels.push(channel);
      }
    });
  }

  /**
   * Get the name of the current channel that is open.
   * @returns The name of the current channel.
   */
  getCurrentChannel(): string {
    return this.channelHeader.innerText;
  }

  /**
   * Displays all posts for a specific channel and sets the channel header.
   * @param name - The name of the channel.
   */
  displayChannel(name: string): void {
    this.channelHeader.classList.remove("hide");
    this.channelHeader.innerText = name;
    const postArea = document.querySelector("#post-area");
    if (!(postArea instanceof HTMLElement)) {
      console.error("post area is not a html element");
      throw new Error("there is no post html element");
    }
    postArea.innerHTML = "";
  }

  /**
   * Dispatches the more specific create channel event to the document.
   * @param event - The general event that triggered this function.
   */
  private createChannel(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    var formData = new FormData(this.channelForm);
    var name = formData.get("channel");
    if (!name) {
      console.error("channel name is null");
      return;
    }

    const workspaceHeader = document.querySelector("#workspace-title");
    if (!(workspaceHeader instanceof HTMLHeadingElement)) {
      console.error("workspace title is not a header");
      throw new Error("there is no workspace title");
    }

    const createChannelEvent = new CustomEvent("createChannelEvent", {
      detail: { name: name.toString(), workspace: workspaceHeader.innerText },
    });

    const nameIpt = document.querySelector("#channel-input");
    if (!(nameIpt instanceof HTMLInputElement)) {
      console.error("channel name input not found");
      return;
    }
    nameIpt.value = "";
    document.dispatchEvent(createChannelEvent);
  }

  /**
   * Dispatches an event to refresh the list of channels.
   */
  private refreshChannels() {
    console.log("User has requested to refresh channels");
    const workspaceHeader = document.querySelector("#workspace-title");
    if (!(workspaceHeader instanceof HTMLHeadingElement)) {
      console.error("workspace title is not a header");
      throw new Error("there is no workspace title");
    }

    const refreshChannelsEvent = new CustomEvent("refreshChannelsEvent", {
      detail: { name: workspaceHeader.innerText },
    });

    document.dispatchEvent(refreshChannelsEvent);
  }

  /**
   * Toggles the pinned state of a channel.
   * @param chanName - The name of the channel to pin or unpin.
   * @param pinned - The current pin state of the channel.
   *                  - `true`: Unpins the channel.
   *                  - `false`: Pins the channel.
   *
   * @throws Error - If the channel with the specified name is undefined.
   * @throws Error - If the channel does not have a shadow root.
   * @throws Error - If the channel does not have a corresponding pin button.
   */
  togglePin(chanName: string, pinned: boolean) {
    var channelElem: ChannelItem | undefined;
    if (pinned) {
      console.log(this.pinnedChannelMapping.entries());
      channelElem = this.pinnedChannelMapping.get(chanName);
    } else {
      console.log(this.allChannelMapping.entries());
      channelElem = this.allChannelMapping.get(chanName);
    }
    if (channelElem === undefined) {
      throw new Error("The channel with the specified path is undefined");
    } else if (!channelElem.shadowRoot) {
      throw new Error("The channel having its pin updated has no shadow root");
    }
    const pinButton = channelElem.shadowRoot.getElementById(`pin-${chanName}`);
    if (!(pinButton instanceof HTMLButtonElement)) {
      throw new Error("No pin button exists for this channel");
    }

    if (pinned) {
      pinButton.classList.remove("pinned");
    } else {
      pinButton.classList.add("pinned");
    }
    channelElem.enableButton("pin");

    if (pinned) {
      // removing it from pinned
      this.allChannelMapping.set(chanName, channelElem);
      this.pinnedChannelMapping.delete(chanName);
      var temp3 = new Array<string>();
      this.allChannelMapping.forEach((_, channel: string) => {
        temp3.push(channel);
      });
      temp3.sort();
      var index: number = -1;
      temp3.forEach((val, i) => {
        if (channelElem === undefined) {
          throw new Error("why are we here?");
        }
        if (val === channelElem.getName()) {
          index = i;
        }
      });
      console.log("index", index);
      const follows = index === -1 ? null : temp3.at(index + 1);
      var followingChan: ChannelItem | undefined;
      if (follows) {
        followingChan = this.allChannelMapping.get(follows);
      }
      this.channelArea.insertBefore(
        channelElem,
        followingChan === undefined ? null : followingChan,
      );
    } else {
      // adding it to pinned
      this.allChannelMapping.delete(chanName);
      this.pinnedChannelMapping.set(chanName, channelElem);
      this.channelArea.insertBefore(channelElem, this.getFirstUnpinned());
    }
  }

  /**
   * Retrieves the first unpinned channel.
   * @returns The first unpinned `ChannelItem` or `null` if none exist.
   */
  getFirstUnpinned(): ChannelItem | null {
    var temp3 = new Array<ChannelItem>();
    this.allChannelMapping.forEach((channel: ChannelItem) => {
      temp3.push(channel);
    });

    temp3.sort((a, b) => {
      return a.getName().localeCompare(b.getName());
    });
    const head = temp3.at(0);
    return head === undefined ? null : head;
  }
}
