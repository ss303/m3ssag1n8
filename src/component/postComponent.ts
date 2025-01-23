/**
 * Defines a web component for displaying posts in the messaging application, including support for reactions and replies.
 */
import { PostTextarea } from "./postTextComponent";

let mappings = new Map<string, string>([
  [
    "smile",
    `<iconify-icon
      icon="mynaui:smile-circle-solid"
      width="1.25em"
      height="1.25em"
      style="color:#ffd500"
   ></iconify-icon>`,
  ],
  [
    "frown",
    `<iconify-icon
         icon="mynaui:sad-circle-solid"
         width="1.25em"
         height="1.25em"
         style="color:#ffd500"
       ></iconify-icon>`,
  ],
  [
    "like",
    `<iconify-icon
         icon="mynaui:like-solid"
         width="1.25em"
         height="1.25em"
         style="color:#ffd500"
       ></iconify-icon>`,
  ],
  [
    "celebrate",
    `<iconify-icon
         icon="mynaui:confetti-solid"
         width="1.25em"
         height="1.25em"
         style="color:#ffd500"
       ></iconify-icon>`,
  ],
]);

/**
 * Converts markdown texts and emojis to be properly displayed to the user
 * @param input Post content to be converted to markdown supporting
 * @returns Post content with appropriate HTML tags for displaying
 */
const markdownConvert = (input: string) => {
  // Handle links
  input = input.replace(
    /\[(?<innername>[^\]]+)\]\((?<innerlink>[^\)]+)\)/g,
    (_, innername, innerlink) => `<a href="${innerlink}">${innername}</a>`,
  );

  // Handle strong (bold) text
  input = input.replace(
    /\*\*(?<inner>.+?)\*\*/g,
    (_, inner) => `<strong>${inner}</strong>`,
  );

  // Handle italic text
  input = input.replace(
    /\*(?<inner>.+?)\*/g,
    (_, inner) => `<em>${inner}</em>`,
  );

  // Handle line breaks
  input = input.replace(/\n/g, `<br>`);

  // Handle emojis
  input = input.replace(/:(?<emojiName>[A-Za-z0-9-_]+):/g, (_, emojiName) => {
    return mappings.get(emojiName) || `:${emojiName}:`;
  });

  return input;
};

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
 * A web component for all posts currently displayed in the messaging application
 */
export class PostItem extends HTMLElement {
  /** The template for post items */
  private static template: HTMLTemplateElement;

  /** The shadow DOM for this post item */
  private shadow: ShadowRoot;
  /** The controller used for adding event listeners */
  private controller: AbortController | null = null;
  /** The information on the user who created the post and when it was created */
  private metadata: HTMLHeadingElement;
  /** The post's message contents */
  private contents: HTMLParagraphElement;
  /** The reaction button for smile */
  private smileReaction: HTMLButtonElement;
  /** The reaction button for frown */
  private frownReaction: HTMLButtonElement;
  /** The reaction button for like */
  private likeReaction: HTMLButtonElement;
  /** The reaction button for celebrate */
  private celebrateReaction: HTMLButtonElement;
  /** The reply button for a post */
  private replyButton: HTMLButtonElement;
  /** The pin button for a post */
  private pinButton: HTMLButtonElement;
  /** The workspace containing this post */
  private workspace: string;
  /** The channel containing this post */
  private channel: string;
  /** The name of this post */
  private name: string;
  /** The path of this post */
  private postPath: string;
  /** The section containing replies to this post */
  private replies: HTMLElement;
  /** The children of this post */
  private childrenItems: PostItem[];
  /** The reactor of this post */
  private reactors: any;
  /** The time posted of this post */
  private postTime: number;
  /** The parent of this post */
  private parent: string;

  /**
   * Initializes the post web component before any instances are created
   */
  static initialize(): void {
    PostItem.template = getTemplate("#post-template");
  }

  /**
   * Initializes all private fields and the shadow DOM for the post item
   * @param postContent Contents of the post
   * @param poster Creator of the post
   * @param postTime Time the post was created
   * @param postPath Path within the JSON post object
   * @param reactionNumbers Array of reaction counts for each type of reaction
   * @param reactors Information about users who reacted to the post
   * @param workspace Workspace containing this post
   * @param channel Channel containing this post
   * @param children Replies to this post, if any
   * @param parentPost Post this post is a reply to, if applicable
   */
  constructor(
    postContent: string,
    poster: string,
    postTime: number,
    postPath: string,
    reactionNumbers: Array<number>,
    reactors: any,
    workspace: string,
    channel: string,
    children: PostItem[],
    parentPost?: string,
  ) {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    // Append the template content to the shadow root
    const clone = PostItem.template.content.cloneNode(true) as DocumentFragment;

    const aPost = clone.querySelector("#post");
    if (!(aPost instanceof HTMLElement)) {
      throw new Error(`Error: aPost is not an HTML element`);
    }

    aPost.id += `-${postPath}`; // this is the article id
    this.shadow.append(clone);

    // Ensure all elements are present and of the correct types
    const metadata = this.shadow.querySelector("h3");
    if (!(metadata instanceof HTMLHeadingElement)) {
      throw new Error("metadata heading not found");
    }

    const contents = this.shadow.querySelector(".post-content");
    if (!(contents instanceof HTMLParagraphElement)) {
      throw new Error("contents paragraph not found");
    }

    // Reactions
    const smileReaction = this.shadow.querySelector('[data-button="smile"]');
    if (!(smileReaction instanceof HTMLButtonElement)) {
      throw new Error("smile-react button not found");
    }
    smileReaction.id += `-${postPath}`;

    const frownReaction = this.shadow.querySelector('[data-button="frown"]');
    if (!(frownReaction instanceof HTMLButtonElement)) {
      throw new Error("frown-react button not found");
    }
    frownReaction.id += `-${postPath}`;

    const likeReaction = this.shadow.querySelector('[data-button="like"]');
    if (!(likeReaction instanceof HTMLButtonElement)) {
      throw new Error("like-react button not found");
    }
    likeReaction.id += `-${postPath}`;

    const celebrateReaction = this.shadow.querySelector(
      '[data-button="celebrate"]',
    );
    if (!(celebrateReaction instanceof HTMLButtonElement)) {
      throw new Error("celebrate-react button not found");
    }
    celebrateReaction.id += `-${postPath}`;

    this.metadata = metadata;
    this.contents = contents;

    this.smileReaction = smileReaction;
    const smiles = this.shadow.querySelector("#smile-count");
    if (!(smiles instanceof HTMLParagraphElement)) {
      throw new Error("smile counter not found");
    }
    smiles.id += `-${postPath}`;
    this.likeReaction = likeReaction;
    const likes = this.likeReaction.querySelector("#like-count");
    if (!(likes instanceof HTMLParagraphElement)) {
      throw new Error("like counter not found");
    }
    likes.id += `-${postPath}`;
    this.frownReaction = frownReaction;
    const frowns = this.frownReaction.querySelector("#frown-count");
    if (!(frowns instanceof HTMLParagraphElement)) {
      throw new Error("frown counter not found");
    }
    frowns.id += `-${postPath}`;
    this.celebrateReaction = celebrateReaction;
    const celebrates = this.celebrateReaction.querySelector("#celebrate-count");
    if (!(celebrates instanceof HTMLParagraphElement)) {
      throw new Error("celebrate counter not found");
    }
    celebrates.id += `-${postPath}`;

    if (reactionNumbers[0] !== 0) {
      smiles.innerText = reactionNumbers[0].toString();
    }
    if (reactionNumbers[1] !== 0) {
      likes.innerText = reactionNumbers[1].toString();
    }
    if (reactionNumbers[2] !== 0) {
      frowns.innerText = reactionNumbers[2].toString();
    }
    if (reactionNumbers[3] !== 0) {
      celebrates.innerText = reactionNumbers[3].toString();
    }
    var date = new Date(postTime);
    this.metadata.innerText = poster + " - " + date.toString();
    this.contents.innerHTML = markdownConvert(postContent);
    this.reactors = reactors;
    this.workspace = workspace;
    this.channel = channel;
    this.name = postPath.substring(postPath.lastIndexOf("/") + 1);
    this.postPath = postPath;

    // Add reply posts to current post.
    const replies = this.shadow.querySelector(".replies");
    if (!(replies instanceof HTMLElement)) {
      throw new Error("replies section not found");
    }
    this.replies = replies;
    this.childrenItems = children;
    this.postTime = postTime;
    children.forEach((child: PostItem) => {
      this.replies.append(child);
    });

    // Reply button.
    const replyButton = this.shadow.querySelector('[data-button="reply"]');
    if (!(replyButton instanceof HTMLButtonElement)) {
      throw new Error("reply button not found");
    }
    replyButton.id += `-${postPath}`;
    this.replyButton = replyButton;

    // Pin button.
    const pinButton = this.shadow.querySelector('[data-button="pin"]');
    if (!(pinButton instanceof HTMLButtonElement)) {
      throw new Error("pin button not found");
    }
    pinButton.id += `-${postPath}`;
    this.pinButton = pinButton;
    if (parentPost) {
      this.parent = parentPost;
    } else {
      this.parent = "";
    }
  }

  /**
   * Initializes the controller and adds the click event listeners for reactions
   */
  connectedCallback(): void {
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };

    // Reaction handlers
    this.smileReaction.addEventListener(
      "click",
      this.onSmileClick.bind(this),
      options,
    );
    this.frownReaction.addEventListener(
      "click",
      this.onFrownClick.bind(this),
      options,
    );
    this.likeReaction.addEventListener(
      "click",
      this.onLikeClick.bind(this),
      options,
    );
    this.celebrateReaction.addEventListener(
      "click",
      this.onCelebrateClick.bind(this),
      options,
    );
    this.replyButton.addEventListener(
      "click",
      this.onReplyClick.bind(this),
      options,
    );
    this.pinButton.addEventListener(
      "click",
      this.onPinClick.bind(this),
      options,
    );
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
   * Getter for this post's PostItem children, aka replies
   * @returns The children of this post as PostItem objects
   */
  getChildren(): PostItem[] {
    return this.childrenItems;
  }

  /**
   * Getter for usernames of those who have reacted to this post
   * @returns Those who have reacted to this post
   */
  getReactors(): any {
    return this.reactors;
  }

  /**
   * Getter for the metadata created at field
   * @returns The time at which the current post was created
   */
  getPostTime(): number {
    return this.postTime;
  }

  /**
   * Getter for the current post's path
   * @returns The path for the current post in the backend database
   */
  getPath(): string {
    return this.postPath;
  }

  /**
   * Getter for the current post's parent
   * @returns The parent of the current post
   */
  getParent(): string {
    return this.parent;
  }

  /**
   * Adds a reply to the current post item in the view
   * @param replyPost The reply post to add
   */
  addReply(replyPost: PostItem): void {
    console.log("Adding a new reply to a post");
    var childNodes = this.replies.childNodes;
    console.log(childNodes);
    var postItemChildren = new Array<PostItem>();
    childNodes.forEach((node: ChildNode) => {
      if (!(node instanceof PostItem)) {
        console.error("This node is not a post item for replies");
      } else {
        postItemChildren.push(node);
      }
    });
    postItemChildren.push(replyPost);
    postItemChildren.sort((a, b) => a.getPostTime() - b.getPostTime());
    var index: number = -1;
    postItemChildren.forEach((val, i) => {
      if (val.getPostTime() === replyPost.getPostTime()) {
        index = i;
      }
    });
    console.log("index for reply", index);
    const follows = index === -1 ? null : postItemChildren.at(index + 1);
    this.replies.insertBefore(
      replyPost,
      follows === undefined || follows === null ? null : follows,
    );
    console.log(this.childrenItems);
    console.log(postItemChildren);
    this.childrenItems = postItemChildren;
  }

  /**
   * Replaces an existing reply with a new reply
   * @param newChild The new reply post to be added
   * @param oldChild The old reply post to be replaced
   */
  replaceReply(newChild: PostItem, oldChild: PostItem): void {
    this.replies.replaceChild(newChild, oldChild);
  }

  /**
   * Dispatches reaction event for a smile reaction
   * @param event Event that triggered this function
   */
  onSmileClick(event: MouseEvent): void {
    event.stopPropagation();
    this.smileReaction.disabled = true;

    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var reacted: boolean;
    if (this.smileReaction.classList.contains("reacted")) {
      reacted = true; // has already been reacted to and this is to remove the reaction
    } else {
      reacted = false; // has not been reacted to and this is to add the reaction
    }
    const reactEvent = new CustomEvent("reactEvent", {
      detail: {
        emoji: "smile",
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.channel,
        name: this.name,
        path: this.postPath,
        reacted: reacted,
      },
    });

    document.dispatchEvent(reactEvent);
  }

  /**
   * Dispatches reaction event for a frown reaction
   * @param event Event that triggered this function
   */
  onFrownClick(event: MouseEvent): void {
    event.stopPropagation();
    this.frownReaction.disabled = true;

    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var reacted: boolean;
    if (this.frownReaction.classList.contains("reacted")) {
      reacted = true; // has already been reacted to and this is to remove the reaction
    } else {
      reacted = false; // has not been reacted to and this is to add the reaction
    }
    const reactEvent = new CustomEvent("reactEvent", {
      detail: {
        emoji: "frown",
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.channel,
        name: this.name,
        path: this.postPath,
        reacted: reacted,
      },
    });

    document.dispatchEvent(reactEvent);
  }

  /**
   * Dispatches reaction event for a like reaction
   * @param event Event that triggered this function
   */
  onLikeClick(event: MouseEvent): void {
    event.stopPropagation();
    this.likeReaction.disabled = true;

    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var reacted: boolean;
    if (this.likeReaction.classList.contains("reacted")) {
      reacted = true; // has already been reacted to and this is to remove the reaction
    } else {
      reacted = false; // has not been reacted to and this is to add the reaction
    }

    const reactEvent = new CustomEvent("reactEvent", {
      detail: {
        emoji: "like",
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.channel,
        name: this.name,
        path: this.postPath,
        reacted: reacted,
      },
    });

    document.dispatchEvent(reactEvent);
  }

  /**
   * Dispatches reaction event for a celebrate reaction
   * @param event Event that triggered this function
   */
  onCelebrateClick(event: MouseEvent): void {
    event.stopPropagation();
    this.celebrateReaction.disabled = true;

    // add to class list if it has already been clicked and then check that for a boolean that it's been reacted to
    // then if it has already been clicked, it will be an arrayadd
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var reacted: boolean;
    if (this.celebrateReaction.classList.contains("reacted")) {
      reacted = true; // has already been reacted to and this is to remove the reaction
    } else {
      reacted = false; // has not been reacted to and this is to add the reaction
    }
    const reactEvent = new CustomEvent("reactEvent", {
      detail: {
        emoji: "celebrate",
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.channel,
        name: this.name,
        path: this.postPath,
        reacted: reacted,
      },
    });

    document.dispatchEvent(reactEvent);
  }

  /**
   * Displays a textarea for replying to the post
   * @param event Event that triggered this function
   */
  onReplyClick(event: MouseEvent): void {
    event.stopPropagation();

    // Display current textarea
    document.getElementById("main-post-textarea")?.classList.add("hide");
    const replySection = this.shadowRoot?.querySelector(".replies");
    if (!(replySection instanceof HTMLElement)) {
      throw new Error("post reply area was not found");
    }
    const newTextarea = new PostTextarea(this.postPath, false);
    const replyButtonEvent = new CustomEvent("replyButtonEvent", {
      detail: {
        newTextarea: newTextarea,
      },
    });
    document.dispatchEvent(replyButtonEvent);

    replySection.append(newTextarea);
    console.log("Added post text area to the page");
    newTextarea.focusText();

    // Expand post content size to fill page
    console.log("Expanding post content area");
    const postArea = document.getElementById("post-area");
    if (!(postArea instanceof HTMLElement)) {
      throw new Error("didn't find post area");
    }
    postArea.style.height = "calc(100vh - 95px)";
  }

  /**
   * Dispatches pin event for a pinned post action
   * @param event Event that triggered this function
   */
  onPinClick(event: MouseEvent): void {
    event.stopPropagation();
    this.pinButton.disabled = true;

    // add to class list if it has already been clicked and then check that for a boolean that it's been reacted to
    // then if it has already been clicked, it will be an arrayadd
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }

    var pinned: boolean;
    if (this.pinButton.classList.contains("pinned")) {
      // has already been favorited and this is to remove from favorites
      pinned = true;
    } else {
      // has not been favorited and this is to add to favorites
      pinned = false;
    }

    const pinPostEvent = new CustomEvent("pinPostEvent", {
      detail: {
        clicker: userHeader.innerText,
        workspace: this.workspace,
        channel: this.channel,
        postName: this.name,
        path: this.postPath,
        pinned: pinned,
      },
    });

    document.dispatchEvent(pinPostEvent);
  }

  /**
   * Enables a reaction button for a given reaction type
   * @param reaction The type of reaction to enable the button for
   */
  enablePostButton(reaction: string): void {
    switch (reaction) {
      case "smile":
        this.smileReaction.disabled = false;
        break;
      case "like":
        this.likeReaction.disabled = false;
        break;
      case "frown":
        this.frownReaction.disabled = false;
        break;
      case "celebrate":
        this.celebrateReaction.disabled = false;
        break;
      case "pin":
        this.pinButton.disabled = false;
        break;
      default:
        break;
    }
  }
}

/**
 * Initializes all web components for posts before they are created and added to the document
 */
export function initPostComponent(): void {
  PostItem.initialize();
  customElements.define("post-item", PostItem);
}
