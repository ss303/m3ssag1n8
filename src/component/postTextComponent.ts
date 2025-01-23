/**
 * Defines a web component for creating posts in the messaging application, including support for text formatting and reactions.
 */

/**
 * Retrieves the template from the document associated with the given id
 * @param id The id of the template being retrieved
 * @returns The template element being retrieved
 */
function getTemplate(id: string): HTMLTemplateElement {
  const template = document.querySelector(id);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`Error: ${id} is not a template`);
  }
  return template;
}

/**
 * Generates a unique ID for events that do not arrive via subscription
 * @returns A unique ID for locally generated events
 */
const genUniqueID = () => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  let counter = 0;
  let length = Math.floor(Math.random() * 11);
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

/**
 * A web component representing a text area for creating posts in the messaging application
 */
export class PostTextarea extends HTMLElement {
  /** The template for post textarea items */
  private static template: HTMLTemplateElement;

  /** The shadow DOM for this post textarea item */
  private shadow: ShadowRoot;
  /** The controller used for adding event listeners */
  private controller: AbortController | null = null;

  /** String representing parent of text box */
  private parent: string;
  /** Boolean representing whether the textarea is for a top-level (main) or reply post */
  private isMainTextarea: boolean;
  /** Form element used for create post actions */
  private postForm: HTMLFormElement;
  /** Text area element used for create post */
  private postText: HTMLTextAreaElement;
  /** Button element for bold text */
  private boldButton: HTMLButtonElement;
  /** Button element for italic text */
  private italicButton: HTMLButtonElement;
  /** Button element for linking text */
  private linkButton: HTMLButtonElement;
  /** Button element for smile text */
  private smileButton: HTMLButtonElement;
  /** Button element for frown text */
  private frownButton: HTMLButtonElement;
  /** Button element for like text */
  private likeButton: HTMLButtonElement;
  /** Button element for celebrate text */
  private celebrateButton: HTMLButtonElement;
  /** Button element for sending post */
  private submitButton: HTMLButtonElement;
  /** Button element for closing textarea */
  private closeButton: HTMLButtonElement;
  /** Boolean representing whether shift key is currently active */
  private shiftActive: boolean;

  /**
   * Initializes the post textarea web component before any instances are created
   */
  static initialize(): void {
    PostTextarea.template = getTemplate("#post-textarea-template");
  }

  /**
   * Creates an instance of the PostTextarea web component
   * @param parent The parent element identifier
   * @param isMainTextarea Boolean indicating whether this textarea is for a top-level post
   */
  constructor(parent: string, isMainTextarea: boolean) {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    // Append the template content to the shadow root
    const clone = PostTextarea.template.content.cloneNode(
      true,
    ) as DocumentFragment;

    this.shadow.append(clone);

    // Ensure all elements are present and of the correct types
    const postForm = this.shadow.querySelector("#make-post-form");
    if (!(postForm instanceof HTMLFormElement)) {
      console.error("post form is not a form");
      throw new Error("there is no post form");
    }

    const postText = this.shadow.querySelector("textarea");
    if (!(postText instanceof HTMLTextAreaElement)) {
      console.error("postText is not a textarea");
      throw new Error("there is no post textarea");
    }

    const boldButton = this.shadow.querySelector('[data-button="bold"]');
    if (!(boldButton instanceof HTMLButtonElement)) {
      console.error("boldButton is not a button");
      throw new Error("there is no bold text button");
    }

    const italicButton = this.shadow.querySelector('[data-button="italic"]');
    if (!(italicButton instanceof HTMLButtonElement)) {
      console.error("italicButton is not a button");
      throw new Error("there is no italic text button");
    }

    const linkButton = this.shadow.querySelector('[data-button="link"]');
    if (!(linkButton instanceof HTMLButtonElement)) {
      console.error("linkButton is not a button");
      throw new Error("there is no link text button");
    }

    const smileButton = this.shadow.querySelector('[data-button="smile"]');
    if (!(smileButton instanceof HTMLButtonElement)) {
      console.error("smileButton is not a button");
      throw new Error("there is no smile text button");
    }

    const frownButton = this.shadow.querySelector('[data-button="frown"]');
    if (!(frownButton instanceof HTMLButtonElement)) {
      console.error("frownButton is not a button");
      throw new Error("there is no frown text button");
    }

    const likeButton = this.shadow.querySelector('[data-button="like"]');
    if (!(likeButton instanceof HTMLButtonElement)) {
      console.error("likeButton is not a button");
      throw new Error("there is no like text button");
    }

    const celebrateButton = this.shadow.querySelector(
      '[data-button="celebrate"]',
    );
    if (!(celebrateButton instanceof HTMLButtonElement)) {
      console.error("celebrateButton is not a button");
      throw new Error("there is no celebrate text button");
    }

    const submitButton = this.shadow.getElementById("send-post");
    if (!(submitButton instanceof HTMLButtonElement)) {
      console.error("submitButton is not a button");
      throw new Error("bad submit button");
    }

    const closeButton = this.shadow.getElementById("close-form");
    if (!(closeButton instanceof HTMLButtonElement)) {
      console.error("closeButton is not a button");
      throw new Error("there is no close textarea button");
    }

    // If user is creating a top-level post, don't display the close button.
    if (isMainTextarea) {
      closeButton.style.display = "none";
      document.getElementById("main-post-textarea")?.classList.remove("hide");
    } else {
      document.getElementById("main-post-textarea")?.classList.add("hide");
    }

    this.parent = parent;
    this.isMainTextarea = isMainTextarea;
    this.postForm = postForm;
    this.postText = postText;
    this.boldButton = boldButton;
    this.italicButton = italicButton;
    this.linkButton = linkButton;
    this.smileButton = smileButton;
    this.frownButton = frownButton;
    this.likeButton = likeButton;
    this.celebrateButton = celebrateButton;
    this.submitButton = submitButton;
    this.closeButton = closeButton;
    this.shiftActive = false;
  }

  /**
   * Initializes the controller and adds the click event listeners for formatting and reactions
   */
  connectedCallback(): void {
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };

    this.boldButton.addEventListener(
      "click",
      this.clickTextStyleButton.bind(this),
      options,
    );
    this.italicButton.addEventListener(
      "click",
      this.clickTextStyleButton.bind(this),
      options,
    );
    this.linkButton.addEventListener(
      "click",
      this.clickTextStyleButton.bind(this),
      options,
    );
    this.smileButton.addEventListener(
      "click",
      this.clickTextReactionButton.bind(this),
      options,
    );
    this.frownButton.addEventListener(
      "click",
      this.clickTextReactionButton.bind(this),
      options,
    );
    this.likeButton.addEventListener(
      "click",
      this.clickTextReactionButton.bind(this),
      options,
    );
    this.celebrateButton.addEventListener(
      "click",
      this.clickTextReactionButton.bind(this),
      options,
    );
    this.postForm.addEventListener(
      "submit",
      this.clickSendPost.bind(this),
      options,
    );
    // Track key presses to allow for shift+enter to be a return and enter to send a post
    this.postText.addEventListener("keydown", this.keydown.bind(this), options);
    this.postText.addEventListener("keyup", this.keyup.bind(this), options);
    // Add close button functionality if creating reply post.
    if (!this.isMainTextarea) {
      this.closeButton.addEventListener(
        "click",
        this.clickCloseButton.bind(this),
        options,
      );
    }
  }

  /**
   * Sets the controller to null when the post is removed from the document
   */
  disconnectedCallback(): void {
    // Remove all event listeners
    this.controller?.abort();
    this.controller = null;
  }

  /**
   * Disable post creation until a successful create comes back.
   */
  disableSubmit(): void {
    this.submitButton.disabled = true;
  }

  /**
   * Re-enable post creation when a successful create comes back.
   */
  enableSubmit(): void {
    this.submitButton.disabled = false;
  }

  /**
   * Focuses on the post textbox allowing users to type a post.
   */
  focusText(): void {
    this.postText.focus();
  }

  /**
   * Checks user's key press. Adds a return to the textarea if user presses shift+enter simultaneously.
   * Sends the post if the user presses just enter.
   * @param event keydown event
   */
  private keydown(event: KeyboardEvent): void {
    this.postText.setCustomValidity("");
    // Check if enter was pressed
    if (event.key === "Enter") {
      event.preventDefault();
      // Check if shift is active
      if (this.shiftActive) {
        // Add carriage return
        console.log("Adding return from shift+enter keypress");
        const start = this.postText.selectionStart;
        const end = this.postText.selectionEnd;
        this.postText.setRangeText("\n", start, end, "end");
      } else if (this.postText.value !== "") {
        // Otherwise, send post
        console.log("Sending post from enter keypress");
        this.sendPost();
      } else {
        this.postText.setCustomValidity("Please fill out this field.");
        console.log("Reporting validity to user");
        this.postText.reportValidity();
      }
    } else if (event.shiftKey) {
      this.shiftActive = true;
    }
  }

  /**
   * Tracks which keys are no longer active. Used to see if shift is active for a shift+enter combination.
   * @param event keyup event
   */
  private keyup(event: KeyboardEvent): void {
    // If shift key, mark as inactive.
    if (event.shiftKey) {
      this.shiftActive = false;
    }
  }

  /**
   * Handles stylizing text in the create post text area.
   * @param event The text styling button click event.
   */
  private clickTextStyleButton(event: Event): void {
    event.preventDefault();

    const button = event.currentTarget as HTMLButtonElement;
    const data = button.getAttribute("data-button");
    if (!data) {
      console.error("button data is null");
      return;
    }

    // Add styling to textarea
    let leftStyle = "";
    let rightStyle = "";
    if (data === "bold") {
      leftStyle = "**";
      rightStyle = "**";
    } else if (data === "italic") {
      leftStyle = "*";
      rightStyle = "*";
    } else if (data === "link") {
      leftStyle = "[";
      rightStyle = "]()";
    } else {
      console.log("Invalid stylize text data button");
    }

    // Find user's cursor/selected text.
    const start = this.postText.selectionStart;
    const end = this.postText.selectionEnd;

    if (start !== end) {
      // Add styling around the user's selected text and move cursor to end.
      const selectedText = this.postText.value.substring(start, end);
      const stylizedText = `${leftStyle}${selectedText}${rightStyle}`;
      this.postText.setRangeText(stylizedText, start, end, "end");

      // If link, move cursor so user can type in link.
      if (data === "link") {
        const currentCursor = this.postText.selectionStart;
        this.postText.setSelectionRange(currentCursor - 1, currentCursor - 1);
      }
    } else {
      // Add styling around the user's cursor and keep cursor between styling.
      let currentCursor = this.postText.selectionStart;
      this.postText.setRangeText(leftStyle, start, end, "end");
      currentCursor = this.postText.selectionStart;
      this.postText.setRangeText(
        rightStyle,
        currentCursor,
        currentCursor,
        "start",
      );
    }

    // Refocus on textarea after button click.
    this.postText.focus();
  }

  /**
   * Handles adding reactions in the create post text area.
   * @param event The text reaction button click event.
   */
  private clickTextReactionButton(event: Event): void {
    event.preventDefault();

    const button = event.currentTarget as HTMLButtonElement;
    const reaction = button.getAttribute("data-button");
    if (!reaction) {
      console.error("button data is null");
      return;
    }

    // Add reaction where the user's cursor is, or replace selected text
    const start = this.postText.selectionStart;
    const end = this.postText.selectionEnd;

    this.postText.setRangeText(`:${reaction}:`, start, end, "end");

    // Refocus on textarea after button click.
    this.postText.focus();
  }

  /**
   * Handles closing the post textarea for reply posts.
   * @param event The close button click event.
   */
  private clickCloseButton(event: MouseEvent): void {
    event.preventDefault();

    document.dispatchEvent(new CustomEvent("closeTextareaEvent"));
  }

  /**
   * Sends the post content by creating a custom event with the relevant details.
   */
  private sendPost(): void {
    var formData = new FormData(this.postForm);
    var postContent = formData.get("post");
    if (!postContent) {
      console.error("postContent is null");
      return;
    }

    const workspaceHeader = document.querySelector("#workspace-title");
    if (!(workspaceHeader instanceof HTMLHeadingElement)) {
      console.error("workspace title is not a header");
      throw new Error("there is no workspace title");
    }

    const channelHeader = document.querySelector("#channel-title");
    if (!(channelHeader instanceof HTMLHeadingElement)) {
      console.error("channel title is not a header");
      throw new Error("there is no channel title");
    }
    // Create new instance of custom create post event
    const createPostEvent = new CustomEvent("createPostEvent", {
      detail: {
        msg: postContent.toString(),
        parent: this.parent,
        channelName: channelHeader.innerHTML,
        workspaceName: workspaceHeader.innerHTML,
        eventID: genUniqueID(),
      },
    });

    this.shiftActive = false;
    // Notifies the document to create post
    document.dispatchEvent(createPostEvent);
  }

  /**
   * Handles sending post and triggers send post event.
   * @param event - The send post button click event.
   */
  private clickSendPost(event: Event) {
    event.preventDefault();
    this.disableSubmit();
    this.sendPost();
  }
}

/**
 * Initializes all web components for post text areas before they are created and added to the document
 */
export function initPostTextareaComponent(): void {
  PostTextarea.initialize();
  customElements.define("post-textarea", PostTextarea);
}
