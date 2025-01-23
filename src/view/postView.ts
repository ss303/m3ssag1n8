/**
 * This file contains the implementation of the `PostView` class,
 * which is responsible for managing the display and interaction
 * with posts and comments within a workspace and channel.
 * It also initializes the view for handling posts.
 */

import { PostBody } from "../model/model";
import { PostItem } from "../component/postComponent";
import { PostTextarea } from "../component/postTextComponent";

/**
 * Represents a view post with path, document, and metadata.
 */
type ViewPost = {
  path: string;
  doc: PostBody;
  meta: Metadata;
};

/**
 * Represents a tree of posts rooted in a first level post. Represents each post's replies
 * as the post's children.
 */
type ViewPostTree = {
  post: ViewPost;
  children: ViewPostTree[];
};

/**
 * Represents metadata information, including creation and modification details.
 */
type Metadata = {
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
};

/**
 * Initializes the post view.
 * @returns A new instance of the PostView class
 */
export function initPostView() {
  const postArea = document.getElementById("post-area");
  if (!(postArea instanceof HTMLElement)) {
    console.error("post-area section not found");
    throw new Error("there is no post-area section");
  }

  const mainTextarea = document.getElementById("main-post-textarea");
  if (!(mainTextarea instanceof HTMLElement)) {
    console.error("main-post-textarea section not found");
    throw new Error("there is no main-post-textarea section");
  }

  return new PostView(postArea, mainTextarea);
}

/**
 * A class for managing the post view, including displaying and interacting with posts
 * within a specific workspace and channel.
 */
class PostView {
  /** Section where posts are displayed */
  private postArea: HTMLElement;

  /** Section containing textarea where top-level posts (no parents) are created */
  private mainTextarea: HTMLElement;

  /** Current post textarea on the page */
  private postTextarea: PostTextarea | null = null;

  /** Whether the reply box is open. */
  private replyBoxOpen: boolean;

  /** Mapping of all posts paths to their post item */
  private allPostMapping: Map<string, PostItem>;

  /** Mapping of pinned posts paths to their post item */
  private pinnedPostMapping: Map<string, PostItem>;

  /** The ID of the last processed event */
  private lastEventID: string = "";

  /**
   * Initializes the PostView instance with elements for the post area and main textarea.
   * @param postArea - The HTML element where posts are displayed.
   * @param mainTextarea - The HTML element containing the main textarea for new posts.
   */
  constructor(postArea: HTMLElement, mainTextarea: HTMLElement) {
    this.postArea = postArea;
    this.mainTextarea = mainTextarea;
    this.postTextarea = null;
    this.replyBoxOpen = false;
    this.allPostMapping = new Map<string, PostItem>();
    this.pinnedPostMapping = new Map<string, PostItem>();
  }

  /**
   * Constructs a PostItem from a ViewPostTree. Recursively creates reply posts and nests them in
   * the primary/root post. Returns the constructed PostItem for the primary/root post.
   * @param workspace - A string of the primary/root post's workspace.
   * @param channel - A string of the primary/root post's channel.
   * @param rootNode - A ViewPostTree representing the root of the tree, i.e. the node to make a post of.
   * @returns PostItem representing the primary post
   */
  private makePostFromTree(
    workspace: string,
    channel: string,
    rootNode: ViewPostTree,
    pins: boolean,
  ): PostItem {
    // Recursively construct PostItems for the children of the primary/root node.
    // This can be thought of as a postorder tree walk.
    const children: PostItem[] = [];
    rootNode.children.forEach((childNode: ViewPostTree) => {
      const childPost = this.makePostFromTree(
        workspace,
        channel,
        childNode,
        pins,
      );
      children.push(childPost);
    });

    // Collect information for the primary/root node.
    const currPost = rootNode.post;
    const doc = JSON.parse(JSON.stringify(currPost.doc));
    const msg = doc["msg"];
    const meta = JSON.parse(JSON.stringify(currPost.meta));
    const poster = meta["createdBy"];
    const postTime = meta["createdAt"];
    const reactions = doc["reactions"];
    const reactionNum = this.getReactions(reactions);
    let parent = JSON.parse(JSON.stringify(currPost.doc))["parent"];
    if (!parent) {
      parent = "";
    }
    console.log(children);
    // Construct the PostItem for the root node.
    const post = new PostItem(
      msg,
      poster,
      postTime,
      currPost.path,
      reactionNum,
      reactions,
      workspace,
      channel,
      children,
      parent,
    );
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    const currUser = userHeader.innerText;
    if (!post.shadowRoot) {
      throw new Error("bad shadow");
    }
    var reactionElems: Array<HTMLButtonElement> = [];
    const smileElem = post.shadowRoot.getElementById(`smile-${currPost.path}`);
    if (!(smileElem instanceof HTMLButtonElement)) {
      throw new Error("no smile reaction elem");
    }
    const likeElem = post.shadowRoot.getElementById(`like-${currPost.path}`);
    if (!(likeElem instanceof HTMLButtonElement)) {
      throw new Error("no like reaction elem");
    }
    const frownElem = post.shadowRoot.getElementById(`frown-${currPost.path}`);
    if (!(frownElem instanceof HTMLButtonElement)) {
      throw new Error("no frown reaction elem");
    }
    const celebrateElem = post.shadowRoot.getElementById(
      `celebrate-${currPost.path}`,
    );
    if (!(celebrateElem instanceof HTMLButtonElement)) {
      throw new Error("no celebrate reaction elem");
    }
    reactionElems.push(smileElem, likeElem, frownElem, celebrateElem);
    var ind = 0;
    this.getReacted(reactions, currUser).forEach((reacted) => {
      if (reacted) {
        reactionElems.at(ind)?.classList.add("reacted");
      }
      ind++;
    });
    post.id += `${currPost.path}`;
    if (pins) {
      this.pinnedPostMapping = this.pinnedPostMapping.set(currPost.path, post);
    } else {
      this.allPostMapping = this.allPostMapping.set(currPost.path, post);
    }

    return post;
  }

  /**
   * Displays all posts for a given channel.
   * @param workspace - The name of the workspace.
   * @param channel - The name of the channel.
   * @param posts - An array of posts to display.
   */
  displayAllPosts(
    workspace: string,
    channel: string,
    posts: Array<ViewPost>,
  ): void {
    console.log(
      "Displaying all posts in current channel to the current user, # of posts: ",
      posts.length,
    );
    this.postArea.innerHTML = "";
    var pinnedPosts = new Array<ViewPost>();
    var generalPosts = new Array<ViewPost>();

    // Separate posts into pinned by current user and not pinned by current user
    this.getPinnedPosts(posts, pinnedPosts, generalPosts);
    pinnedPosts.sort((a, b) => a.meta.lastModifiedAt - b.meta.lastModifiedAt);

    // Construct a mapping of post path to ViewPostTree so we can access each tree by post path.
    const pinnedPathToTree = new Map<string, ViewPostTree>();
    pinnedPosts.forEach((currPost: ViewPost) => {
      pinnedPathToTree.set(currPost.path, { post: currPost, children: [] });
    });

    // Construct the trees and keep track of roots (top level posts).
    const pinnedRoots: ViewPostTree[] = [];
    pinnedPosts.forEach((currPost: ViewPost) => {
      // Get the tree representation of this post.
      const currNode = pinnedPathToTree.get(currPost.path);
      if (currNode) {
        const parent = JSON.parse(JSON.stringify(currPost.doc))["parent"];
        if (
          parent !== undefined &&
          parent !== "" &&
          typeof parent === "string"
        ) {
          // This post is a reply, we need to find its parent
          const parentTree = pinnedPathToTree.get(parent);
          if (parentTree) {
            // Add reply post as child to parent post in tree.
            parentTree.children.push(currNode);
          } else {
            console.error("parent post tree not found in map");
            return;
          }
        } else {
          // This is a root node, or a top level post.
          pinnedRoots.push(currNode);
        }
      } else {
        console.error("current node tree not found in map");
        return;
      }
    });

    // Now, display posts, one tree at a time.
    // Since posts were initially sorted, this will display the root nodes in chronological order.
    pinnedRoots.forEach((rootNode: ViewPostTree) => {
      const rootPost = this.makePostFromTree(
        workspace,
        channel,
        rootNode,
        true,
      );
      // Add the posts from this tree to the page's post area.
      this.postArea.append(rootPost);
    });

    // Sort posts array by 'created at' datetime in metadata.
    generalPosts.sort((a, b) => a.meta.createdAt - b.meta.createdAt);

    // Construct a mapping of post path to ViewPostTree so we can access each tree by post path.
    const postPathToTree = new Map<string, ViewPostTree>();
    generalPosts.forEach((currPost: ViewPost) => {
      postPathToTree.set(currPost.path, { post: currPost, children: [] });
    });

    // Construct the trees and keep track of roots (top level posts).
    const roots: ViewPostTree[] = [];
    generalPosts.forEach((currPost: ViewPost) => {
      // Get the tree representation of this post.
      const currNode = postPathToTree.get(currPost.path);
      if (currNode) {
        const parent = JSON.parse(JSON.stringify(currPost.doc))["parent"];
        if (
          parent !== undefined &&
          parent !== "" &&
          typeof parent === "string"
        ) {
          // This post is a reply, we need to find its parent
          const parentTree = postPathToTree.get(parent);
          if (parentTree) {
            // Add reply post as child to parent post in tree.
            parentTree.children.push(currNode);
          } else {
            console.error("parent post tree not found in map");
            return;
          }
        } else {
          // This is a root node, or a top level post.
          roots.push(currNode);
        }
      } else {
        console.error("current node tree not found in map");
        return;
      }
    });

    // Now, display posts, one tree at a time.
    // Since posts were initially sorted, this will display the root nodes in chronological order.
    roots.forEach((rootNode: ViewPostTree) => {
      const rootPost = this.makePostFromTree(
        workspace,
        channel,
        rootNode,
        false,
      );
      // Add the posts from this tree to the page's post area.
      this.postArea.append(rootPost);
    });
  }

  /**
   * Modifies post arrays in place to distinguish pinned posts from non-pinned posts
   * @param allPosts Array of post objects currently in the channel
   * @param pinnedPosts Array of post objects to contain pinned posts by current user
   * @param generalPosts Array of post objects to contain posts not pinned by current user
   */
  getPinnedPosts(
    allPosts: Array<ViewPost>,
    pinnedPosts: Array<ViewPost>,
    generalPosts: Array<ViewPost>,
  ) {
    const userHeader = document.getElementById("username-header");
    if (!(userHeader instanceof HTMLParagraphElement)) {
      throw new Error("username header was not found");
    }
    const currUser = userHeader.innerText;
    allPosts.sort((a, b) => a.meta.createdAt - b.meta.createdAt);
    allPosts.forEach((post: ViewPost) => {
      let pins = post.doc.extensions?.pins;
      if (Array.isArray(pins)) {
        if (pins.find((s) => s === currUser)) {
          // the post itself is pinned
          pinnedPosts.push(post);
        } else {
          generalPosts.push(post);
        }
      } else if (pinnedPosts.find((s) => s.path === post.doc.parent)) {
        // the post's parent is pinned or ancestor is pinned
        console.log("parent or ancestor is pinned");
        pinnedPosts.push(post);
      } else {
        generalPosts.push(post);
      }
    });
  }

  /**
   * Clears the post area.
   */
  clearPostArea() {
    this.postArea.innerHTML = "";
    this.replaceTextarea(null, false);
  }

  /**
   * Displays main textarea fixed at bottom of page.
   */
  displayMainTextarea() {
    // Reduce post content size to fit main text area
    console.log("Shrinking post content area to fit post text area");
    const postArea = document.getElementById("post-area");
    if (!(postArea instanceof HTMLElement)) {
      throw new Error("didn't find post area");
    }
    postArea.style.height = "calc(100vh - 185px)";

    // Set up main textarea
    const newTextarea = new PostTextarea("", true);
    this.replaceTextarea(newTextarea, true);

    // Focus on the textbox.
    newTextarea.focusText();
  }

  /**
   * Removes the main textarea fixed at bottom of page.
   * @param newTextarea - The new PostTextarea to replace the existing one, if any.
   */
  replaceTextarea(newTextarea: PostTextarea | null = null, isMain: boolean) {
    // Remove existing text area, if exists.
    if (this.postTextarea) {
      // remove
      this.postTextarea.remove();
    }
    if (newTextarea) {
      this.postTextarea = newTextarea;
      if (isMain) {
        // Set up create post textbox for top-level post
        this.mainTextarea.append(newTextarea);
        this.mainTextarea.classList.remove("hide");
        this.replyBoxOpen = false;
      } else {
        // Set up reply box
        this.mainTextarea.classList.add("hide");
        this.replyBoxOpen = true;
      }
    } else {
      this.mainTextarea.classList.add("hide");
      this.postTextarea = newTextarea;
    }
  }

  /**
   * Extracts reaction counts from a reactions object.
   * @param reactions - The reactions object containing different types of reactions.
   * @returns - An array of reaction counts for smile, like, frown, and celebrate reactions.
   */
  private getReactions(reactions: any): number[] {
    var reactionNum: Array<number> = [];
    if (reactions !== undefined) {
      const smiles = reactions[":smile:"];
      if (Array.isArray(smiles)) {
        reactionNum.push(smiles.length);
      } else {
        reactionNum.push(0);
      }
      const likes = reactions[":like:"];
      if (Array.isArray(likes)) {
        reactionNum.push(likes.length);
      } else {
        reactionNum.push(0);
      }
      const frowns = reactions[":frown:"];
      if (Array.isArray(frowns)) {
        reactionNum.push(frowns.length);
      } else {
        reactionNum.push(0);
      }
      const celebrates = reactions[":celebrate:"];
      if (Array.isArray(celebrates)) {
        reactionNum.push(celebrates.length);
      } else {
        reactionNum.push(0);
      }
    } else {
      var empty = new Array<number>(4);
      empty = empty.fill(0);
      reactionNum = reactionNum.concat(empty);
    }
    return reactionNum;
  }

  /**
   * Determines if the current user has reacted to specific reactions.
   * @param reactions - The reactions object containing different types of reactions.
   * @param username - The username to check against.
   * @returns - An array indicating whether the user reacted to smile, like, frown, and celebrate reactions.
   */
  private getReacted(reactions: any, username: string): boolean[] {
    var reacted: boolean[] = [];
    if (reactions !== undefined) {
      const smiles = reactions[":smile:"];
      if (Array.isArray(smiles)) {
        reacted.push(smiles.includes(username));
      } else {
        reacted.push(false);
      }
      const likes = reactions[":like:"];
      if (Array.isArray(likes)) {
        reacted.push(likes.includes(username));
      } else {
        reacted.push(false);
      }
      const frowns = reactions[":frown:"];
      if (Array.isArray(frowns)) {
        reacted.push(frowns.includes(username));
      } else {
        reacted.push(false);
      }
      const celebrates = reactions[":celebrate:"];
      if (Array.isArray(celebrates)) {
        reacted.push(celebrates.includes(username));
      } else {
        reacted.push(false);
      }
    } else {
      var empty = new Array<boolean>(4);
      empty = empty.fill(false);
      reacted = reacted.concat(empty);
    }
    return reacted;
  }

  /**
   * Re-enables submitting new posts upon successful creation of a post.
   * @param id The id of the event that just occurred
   */
  successCreate(id: string) {
    if (id !== this.lastEventID) {
      console.error("unsuccessful creation");
      return;
    }
    console.log("Re-enabling creation of posts");
    const textArea = document.querySelector("post-textarea");
    if (!(textArea instanceof PostTextarea)) {
      throw new Error("no text area upon successful creation");
    }

    textArea.enableSubmit();
  }

  /**
   * Updates posts that arrive via subscription or locally
   * @param post The post to add to the display
   * @param id The id of the event which this post arrived on
   * @param currentUser The currently logged in user
   */
  updatePosts(post: ViewPost, id: string, currentUser: string) {
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

    const workspaceName = workspaceHeader.innerText;
    const channelName = channelHeader.innerText;
    const reactions = this.getReactions(post.doc.reactions);
    if (!Number.isNaN(parseInt(id))) {
      // new item from outside
      var replace: PostItem | undefined = this.allPostMapping.get(post.path);
      if (replace !== undefined) {
        const reactor = this.findReactor(
          reactions,
          this.getReactions(replace.getReactors()),
          post.doc.reactions,
          replace.getReactors(),
        );
        if (currentUser === reactor || reactor === "same") {
          return;
        }
        const newPost = new PostItem(
          post.doc.msg,
          post.meta.createdBy,
          post.meta.createdAt,
          post.path,
          reactions,
          post.doc.reactions,
          workspaceName,
          channelName,
          replace.getChildren(),
          post.doc.parent,
        );
        this.allPostMapping.set(post.path, newPost);
        if (post.doc.parent !== undefined && post.doc.parent !== "") {
          const parentPost = this.allPostMapping.get(post.doc.parent);
          if (parentPost !== undefined) {
            // adding reactions to reply post
            parentPost.replaceReply(newPost, replace);
          }
        } else {
          // adding reactions to top-level post
          this.postArea.replaceChild(newPost, replace);
        }
      } else {
        const newPost = new PostItem(
          post.doc.msg,
          post.meta.createdBy,
          post.meta.createdAt,
          post.path,
          reactions,
          post.doc.reactions,
          workspaceName,
          channelName,
          [],
          post.doc.parent,
        );
        this.allPostMapping.set(post.path, newPost);
        if (post.doc.parent !== undefined && post.doc.parent != "") {
          if (this.replyBoxOpen && this.postTextarea) {
            // Check if we need to move the page to compensate for a new post
            const postAreaTop = this.postArea.getBoundingClientRect().top;
            const originalTopOffset =
              this.postTextarea.getBoundingClientRect().top - postAreaTop;

            const parentPost = this.allPostMapping.get(post.doc.parent);
            if (parentPost !== undefined) {
              parentPost.addReply(newPost);
            }

            const newTopOffset =
              this.postTextarea.getBoundingClientRect().top - postAreaTop;
            // Move the page if needed
            if (originalTopOffset !== newTopOffset) {
              console.log("moving!!!");
              console.log(newTopOffset - originalTopOffset);
              this.postArea.scrollTop =
                this.postArea.scrollTop +
                (newTopOffset - originalTopOffset + 15.999);
            }
          } else {
            const parentPost = this.allPostMapping.get(post.doc.parent);
            if (parentPost !== undefined) {
              parentPost.addReply(newPost);
            }
          }
        } else {
          this.postArea.append(newPost);
        }
      }
    } else if (Number.isNaN(parseInt(id.charAt(id.length - 1)))) {
      // from inside
      var replace: PostItem | undefined = this.allPostMapping.get(post.path);
      if (replace !== undefined) {
        const reactor = this.findReactor(
          reactions,
          this.getReactions(replace.getReactors()),
          post.doc.reactions,
          replace.getReactors(),
        );
        if (currentUser === reactor || reactor === "same") {
          return;
        }
        const newPost = new PostItem(
          post.doc.msg,
          post.meta.createdBy,
          post.meta.createdAt,
          post.path,
          reactions,
          post.doc.reactions,
          workspaceName,
          channelName,
          replace.getChildren(),
          post.doc.parent,
        );
        this.allPostMapping.set(post.path, newPost);
        if (post.doc.parent !== undefined && post.doc.parent !== "") {
          const parentPost = this.allPostMapping.get(post.doc.parent);
          if (parentPost !== undefined) {
            // adding reactions to reply post
            parentPost.replaceReply(newPost, replace);
          }
        } else {
          // adding reactions to top-level post
          this.postArea.replaceChild(newPost, replace);
        }
      } else {
        const newPost = new PostItem(
          post.doc.msg,
          post.meta.createdBy,
          post.meta.createdAt,
          post.path,
          reactions,
          post.doc.reactions,
          workspaceName,
          channelName,
          [],
          post.doc.parent,
        );
        this.allPostMapping.set(post.path, newPost);
        if (post.doc.parent !== undefined && post.doc.parent != "") {
          const parentPost = this.allPostMapping.get(post.doc.parent);
          if (parentPost !== undefined) {
            parentPost.addReply(newPost);
          }
        } else {
          var temp = this.postArea.childNodes;
          var temp3 = new Array<PostItem>();
          temp.forEach((node: ChildNode) => {
            if (!(node instanceof PostItem)) {
              console.error("node is not a post item");
            } else {
              temp3.push(node);
            }
          });
          temp3.push(newPost);
          temp3.sort((a, b) => a.getPostTime() - b.getPostTime());
          const index = temp3.findIndex((val) => {
            val.getPostTime() === newPost.getPostTime();
          });
          const follows = index === -1 ? null : temp3.at(index + 1);
          this.postArea.insertBefore(
            newPost,
            follows === undefined || follows === null ? null : follows,
          );
        }
      }
      this.lastEventID = id;
    }
  }

  /**
   * Finds the user who just reacted or the user who just removed a reaction
   * @param newReactions New counts of reactions on current post
   * @param oldReactions Old counts of reactions on current post
   * @param newReactors New names of reactors on current post
   * @param oldReactors Old names of reactors on current post
   * @returns the name of the changed reactor
   */
  private findReactor(
    newReactions: number[],
    oldReactions: number[],
    newReactors: any,
    oldReactors: any,
  ): string {
    var username: string = "";
    newReactions.forEach((index: number) => {
      if (
        (newReactions.at(index) as number) > (oldReactions.at(index) as number)
      ) {
        if (newReactors !== undefined) {
          switch (index) {
            case 0: // smile
              const smiles = newReactors[":smile:"];
              if (Array.isArray(smiles)) {
                username = smiles.at(smiles.length - 1);
              }
              break;
            case 1: // like
              const likes = newReactors[":like:"];
              if (Array.isArray(likes)) {
                username = likes.at(likes.length - 1);
              }
              break;
            case 2: // frown
              const frowns = newReactors[":frown:"];
              if (Array.isArray(frowns)) {
                username = frowns.at(frowns.length - 1);
              }
              break;
            case 3: // celebrate
              const celebrates = newReactors[":celebrate:"];
              if (Array.isArray(celebrates)) {
                username = celebrates.at(celebrates.length - 1);
              }
              break;
            default:
              break;
          }
        }
      } else if (
        (newReactions.at(index) as number) < (oldReactions.at(index) as number)
      ) {
        if (oldReactors !== undefined) {
          switch (index) {
            case 0: // smile
              const smiles = oldReactors[":smile:"];
              if (Array.isArray(smiles)) {
                username = smiles.at(smiles.length - 1);
              }
              break;
            case 1: // like
              const likes = oldReactors[":like:"];
              if (Array.isArray(likes)) {
                username = likes.at(likes.length - 1);
              }
              break;
            case 2: // frown
              const frowns = oldReactors[":frown:"];
              if (Array.isArray(frowns)) {
                username = frowns.at(frowns.length - 1);
              }
              break;
            case 3: // celebrate
              const celebrates = oldReactors[":celebrate:"];
              if (Array.isArray(celebrates)) {
                username = celebrates.at(celebrates.length - 1);
              }
              break;
            default:
              break;
          }
        }
      } else {
        username = "same";
      }
    });
    return username;
  }

  /**
   * Updates the specified reaction on the current post based on current user's actions
   * @param postPath The path of the post whose reactions are being updated
   * @param reaction The reaction being updated
   * @param reacted Indicator of if this reaction has already been triggered by current user
   */
  updateReactions(postPath: string, reaction: string, reacted: boolean) {
    var postElem: PostItem | undefined = this.allPostMapping.get(postPath);
    if (postElem === undefined) {
      postElem = this.pinnedPostMapping.get(postPath);
      if (postElem === undefined) {
        throw new Error("The post with the specified path is undefined");
      }
    }
    if (!postElem.shadowRoot) {
      throw new Error(
        "The post having its reactions updated has no shadow root",
      );
    }
    const reactionElem = postElem.shadowRoot.getElementById(
      `${reaction}-${postPath}`,
    );
    if (!(reactionElem instanceof HTMLButtonElement)) {
      throw new Error("No reaction element exists for this post");
    }

    const reactionElemText = postElem.shadowRoot.getElementById(
      `${reaction}-count-${postPath}`,
    );
    if (!(reactionElemText instanceof HTMLParagraphElement)) {
      // refers to the text
      throw new Error("didn't find reaction text");
    }

    var currCount =
      reactionElemText.innerText !== ""
        ? parseInt(reactionElemText.innerText)
        : 0;
    if (reacted) {
      reactionElem.classList.remove("reacted");
      currCount--;
    } else {
      reactionElem.classList.add("reacted");
      currCount++;
    }
    reactionElemText.innerText = currCount !== 0 ? currCount.toString() : "";
    postElem.enablePostButton(reaction);
  }

  /**
   * Toggles the pinned state of a post.
   * @param postPath - The name of the post to pin or unpin.
   * @param pinned - The current pin state of the channel.
   *                  - `true`: Unpins the channel.
   *                  - `false`: Pins the channel.
   *
   * @throws Error - If the post with the specified name is undefined.
   * @throws Error - If the post does not have a shadow root.
   * @throws Error - If the post does not have a corresponding pin button.
   */
  togglePin(postPath: string, pinned: boolean) {
    var postElem: PostItem | undefined;
    console.log(pinned);
    console.log(postPath);
    if (pinned) {
      console.log(this.pinnedPostMapping.entries());
      postElem = this.pinnedPostMapping.get(postPath);
    } else {
      console.log(this.allPostMapping.entries());
      postElem = this.allPostMapping.get(postPath);
    }
    if (postElem === undefined) {
      throw new Error("The post with the specified path is undefined");
    } else if (!postElem.shadowRoot) {
      throw new Error("The post having its pin updated has no shadow root");
    }
    const pinButton = postElem.shadowRoot.getElementById(`pin-${postPath}`);
    if (!(pinButton instanceof HTMLButtonElement)) {
      throw new Error("No pin button exists for this post");
    }

    if (pinned) {
      pinButton.classList.remove("pinned");
    } else {
      pinButton.classList.add("pinned");
    }
    postElem.enablePostButton("pin");

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
    if (pinned) {
      // removing it from pinned
      console.log("unpinning");
      console.log(postElem.getPath());
      this.allPostMapping.set(postElem.getPath(), postElem);
      this.pinnedPostMapping.delete(postElem.getPath());
      postElem.getChildren().forEach((child: PostItem) => {
        this.pinnedPostMapping.delete(child.getPath());
        this.allPostMapping.set(child.getPath(), child);
      });
      var temp3 = new Array<PostItem>();
      this.allPostMapping.forEach((node: PostItem) => {
        temp3.push(node);
      });
      temp3.sort((a, b) => a.getPostTime() - b.getPostTime());
      // adding reactions to top-level post
      var index: number = -1;
      temp3.forEach((val, i) => {
        if (postElem === undefined) {
          throw new Error("why are we here?");
        }
        if (val.getPostTime() === postElem.getPostTime()) {
          index = i;
        }
      });
      console.log("index", index);
      const follows = index === -1 ? null : temp3.at(index + 1);
      this.postArea.insertBefore(
        postElem,
        follows === undefined ||
          follows === null ||
          !this.postArea.contains(follows)
          ? null
          : follows,
      );
    } else {
      // adding it to pinned
      this.allPostMapping.delete(postElem.getPath());
      this.pinnedPostMapping.set(postElem.getPath(), postElem);
      postElem.getChildren().forEach((child: PostItem) => {
        const workedChild = this.allPostMapping.delete(child.getPath());
        console.log(workedChild);
        this.pinnedPostMapping.set(child.getPath(), child);
      });
      const firstPost = this.getFirstUnpinned();
      console.log(firstPost);
      this.postArea.insertBefore(postElem, firstPost);
    }
  }

  /**
   * Retrieves the first unpinned post.
   * @returns The first unpinned `PostItem` or `null` if none exist.
   */
  getFirstUnpinned(): PostItem | null {
    var temp3 = new Array<PostItem>();
    console.log(this.allPostMapping.entries());
    this.allPostMapping.forEach((post: PostItem) => {
      temp3.push(post);
    });

    temp3.sort((a, b) => a.getPostTime() - b.getPostTime());
    const head = temp3.at(0);
    return head === undefined ? null : head;
  }
}
