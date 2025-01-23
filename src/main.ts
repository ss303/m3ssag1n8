/**
 * Initializes and manages the chat view, including workspace, channel, and post views.
 * This file represents the entry point of the chat application, handling events like login, logout, and displaying channels/workspaces.
 */

import { slog } from "./slog";
import { initAuthModel } from "./model/authModel";
import { initModel, PostUpdate } from "./model/model";
import { initChannelView } from "./view/channelView";
import { initChannelComponent } from "./component/channelComponent";
import { initPostView } from "./view/postView";
import { initPostComponent } from "./component/postComponent";
import {
  initPostTextareaComponent,
  PostTextarea,
} from "./component/postTextComponent";
import { initWorkspaceView } from "./view/workspaceView";
import { initWorkspaceComponent } from "./component/workspaceComponent";
import { initAuthView } from "./view/authView";
import { initErrorView } from "./view/errorView";

/**
 * Declare names and types of environment variables.
 */
declare const process: {
  env: {
    DATABASE_HOST: string;
    DATABASE_PATH: string;
    AUTH_PATH: string;
  };
};

/**
 * Represents a login event with a username.
 */
interface LoginEvent {
  username: string;
}

/**
 * Represents an event for creating a post.
 */
interface CreatePostEvent {
  msg: string;
  parent: string;
  channelName: string;
  workspaceName: string;
  eventID: string;
}

/**
 * Represents an event for updating a post.
 */
interface UpdatePostEvent {
  id: string;
  post: PostUpdate;
}

/**
 * Represents an event for reacting to a post.
 */
interface ReactEvent {
  emoji: string;
  clicker: string;
  workspace: string;
  channel: string;
  name: string;
  path: string;
  reacted: boolean;
}

/**
 * Represents an event for pinning a post.
 */
interface PinPostEvent {
  clicker: string;
  workspace: string;
  channel: string;
  postName: string;
  path: string;
  pinned: boolean;
}

/**
 * Represents an event for pinning a channel.
 */
interface PinChannelEvent {
  clicker: string;
  workspace: string;
  channel: string;
  path: string;
  pinned: boolean;
}

/**
 * Represents an event for pinning a Workspace.
 */
interface PinWorkspaceEvent {
  clicker: string;
  workspace: string;
  path: string;
  pinned: boolean;
}

/**
 * Represents an event for a reply button interaction.
 */
interface ReplyButtonEvent {
  newTextarea: PostTextarea;
}

/**
 * Represents an empty event.
 */
interface EmptyEvent {}

/**
 * Represents an event for displaying a workspace with its name.
 */
interface WorkspaceEvent {
  name: string; // workspace's name
}

/**
 * Represents an event for displaying a channel with its name and associated workspace.
 */
interface ChannelEvent {
  name: string; // channel's name
  workspace: string;
}

/**
 * Global custom event mappings for DocumentEventMap and WindowEventMap.
 */
declare global {
  // Events from the DOM.
  interface DocumentEventMap {
    loginEvent: CustomEvent<LoginEvent>;
    displayChannelEvent: CustomEvent<ChannelEvent>;
    displayWorkspaceEvent: CustomEvent<WorkspaceEvent>;
    logoutEvent: CustomEvent<EmptyEvent>;
    createPostEvent: CustomEvent<CreatePostEvent>;
    createWorkspaceEvent: CustomEvent<WorkspaceEvent>;
    createChannelEvent: CustomEvent<ChannelEvent>;
    reactEvent: CustomEvent<ReactEvent>;
    pinPostEvent: CustomEvent<PinPostEvent>;
    pinChannelEvent: CustomEvent<PinChannelEvent>;
    pinWorkspaceEvent: CustomEvent<PinWorkspaceEvent>;
    replyButtonEvent: CustomEvent<ReplyButtonEvent>;
    closeTextareaEvent: CustomEvent<EmptyEvent>;
    deleteWorkspaceEvent: CustomEvent<WorkspaceEvent>;
    deleteChannelEvent: CustomEvent<ChannelEvent>;
    refreshWorkspacesEvent: CustomEvent<EmptyEvent>;
    refreshChannelsEvent: CustomEvent<WorkspaceEvent>;
  }

  // Events from the window.
  interface WindowEventMap {
    updatePostEvent: CustomEvent<UpdatePostEvent>;
  }
}

/**
 * Initial entry point of the chat application.
 * Initializes views, components, models, and event listeners.
 */
function main(): void {
  slog.info("Using database", [
    "database",
    `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}`,
  ]);

  // Initialize all web components
  initPostComponent();
  initPostTextareaComponent();
  initChannelComponent();
  initWorkspaceComponent();

  // Initialize all views.
  const authView = initAuthView();
  const channelView = initChannelView();
  const postView = initPostView();
  const workspaceView = initWorkspaceView();
  const errorView = initErrorView();

  // Initialize models.
  const authModel = initAuthModel(
    process.env.DATABASE_HOST,
    process.env.AUTH_PATH,
  );
  const model = initModel(process.env.DATABASE_HOST, process.env.DATABASE_PATH);

  /**
   * Displays the initial view.
   */
  function showView(): void {
    const path = process.env.DATABASE_HOST + process.env.DATABASE_PATH;
    model
      .getAll(path, authModel.getToken()) // gets all workspaces
      .then((response) => {
        workspaceView.displayAllWorkspaces(response);
      })
      .catch((error) => {
        console.log(error);
        errorView.OpenErrorModal(`${error}`);
      });
  }

  // Login event listener.
  document.addEventListener(
    "loginEvent",
    function (evt: CustomEvent<LoginEvent>) {
      console.log("Entered loginEvent");
      authModel
        .authorize(evt.detail.username)
        .then((response) => {
          const stringed = JSON.stringify(response);
          const token = JSON.parse(stringed);
          authModel.addUserToken(evt.detail.username, token["token"]);
          if (authModel.getToken() !== "") {
            showView();
            authView.SuccessLogin(evt.detail.username);
          } else {
            errorView.OpenErrorModal("should have a token");
          }
        })
        .catch((error) => {
          console.log(error);
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Logout event listener.
  document.addEventListener(
    "logoutEvent",
    function (evt: CustomEvent<EmptyEvent>) {
      console.log("Entered logout event");
      authModel
        .logout()
        .then(() => {
          authModel.removeUserToken();
          if (authModel.getToken() === "") {
            model.unsubscribe();
            authView.SuccessLogout();
            channelView.clearChannelDisplay();
          }
        })
        .catch((error) => {
          authModel.removeUserToken();
          if (authModel.getToken() === "") {
            model.unsubscribe();
            authView.SuccessLogout();
          }
          errorView.OpenErrorModal(error);
        });
    },
  );

  // Display channel event listener.
  document.addEventListener(
    "displayChannelEvent",
    function (evt: CustomEvent<ChannelEvent>) {
      try {
        console.log("Entered display channel event");
        const path = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.workspace}/channels/${evt.detail.name}/posts/?mode=subscribe`;
        model.unsubscribe();
        channelView.displayChannel(evt.detail.name);
        const path2 = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.workspace}/channels/${evt.detail.name}/posts/`;
        model
          .getAll(path2, authModel.getToken())
          .then((response) => {
            postView.displayAllPosts(
              evt.detail.workspace,
              evt.detail.name,
              response,
            );
          })
          .catch((error) => {
            if (parseInt(`${error}`) === 401) {
              authModel.removeUserToken();
              if (authModel.getToken() === "") {
                model.unsubscribe();
                authView.SuccessLogout();
              }
            }
            errorView.OpenErrorModal(error);
          });
        postView.displayMainTextarea();
        model.subscribe(path, authModel.getToken()); // get all posts
        // display to user that we are waiting on the posts to show up?
      } catch (error: unknown) {
        console.log(error);
        if (parseInt(`${error}`) === 401) {
          authModel.removeUserToken();
          if (authModel.getToken() === "") {
            model.unsubscribe();
            authView.SuccessLogout();
          }
        }
        errorView.OpenErrorModal(`${error}`);
      }
    },
  );

  // Display Workspace event listener.
  document.addEventListener(
    "displayWorkspaceEvent",
    function (evt: CustomEvent<WorkspaceEvent>) {
      const path = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.name}/channels/`;
      model.unsubscribe();
      model
        .getAll(path, authModel.getToken()) // gets all channels
        .then((response) => {
          workspaceView.displayWorkSpace(evt.detail.name);
          channelView.displayAllChannels(evt.detail.name, response);
          channelView.clearChannelHeader();
          postView.clearPostArea();
        })
        .catch((error: Error) => {
          slog.error("couldn't get workspaces from database", ["error", error]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Refresh channels event listener.
  document.addEventListener(
    "refreshChannelsEvent",
    function (evt: CustomEvent<WorkspaceEvent>) {
      const path = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.name}/channels/`;
      model
        .getAll(path, authModel.getToken()) // gets all channels
        .then((response) => {
          workspaceView.displayWorkSpace(evt.detail.name);
          channelView.displayAllChannels(evt.detail.name, response);
        })
        .catch((error: Error) => {
          slog.error("couldn't get workspaces from database", ["error", error]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Refresh workspaces event listener.
  document.addEventListener(
    "refreshWorkspacesEvent",
    function (evt: CustomEvent<EmptyEvent>) {
      const path = process.env.DATABASE_HOST + process.env.DATABASE_PATH;
      model
        .getAll(path, authModel.getToken()) // gets all workspaces
        .then((response) => {
          workspaceView.displayAllWorkspaces(response);
        })
        .catch((error) => {
          console.log(error);
          if (parseInt(error) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Create Workspace event listener.
  document.addEventListener(
    "createWorkspaceEvent",
    function (evt: CustomEvent<WorkspaceEvent>) {
      model.unsubscribe();
      model
        .createWorkspace(evt.detail.name, authModel.getToken())
        .then((response) => {
          workspaceView.displayWorkSpace(evt.detail.name);
          const path = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}`;
          model
            .getAll(path, authModel.getToken())
            .then((response) => {
              workspaceView.displayAllWorkspaces(response);
            })
            .catch((error: Error) => {
              slog.error("couldn't display all workspaces", ["error", error]);
              if (parseInt(`${error}`) === 401) {
                authModel.removeUserToken();
                if (authModel.getToken() === "") {
                  model.unsubscribe();
                  authView.SuccessLogout();
                }
              }
            });
          channelView.displayAllChannels(evt.detail.name, response);
          channelView.clearChannelHeader();
          postView.clearPostArea();
        })
        .catch((error: Error) => {
          slog.error("couldn't create workspaces in database", [
            "error",
            error,
          ]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Create channel event listener.
  document.addEventListener(
    "createChannelEvent",
    function (evt: CustomEvent<ChannelEvent>) {
      model.unsubscribe();
      model
        .createChannel(
          evt.detail.workspace,
          evt.detail.name,
          authModel.getToken(),
        )
        .then((response) => {
          channelView.displayAllChannels(evt.detail.workspace, response);
          channelView.displayChannel(evt.detail.name);
          const path = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.workspace}/channels/${evt.detail.name}/posts/?mode=subscribe`;
          const path2 = `${process.env.DATABASE_HOST}${process.env.DATABASE_PATH}${evt.detail.workspace}/channels/${evt.detail.name}/posts/`;
          model.getAll(path2, authModel.getToken()).then((response) => {
            postView.displayAllPosts(
              evt.detail.workspace,
              evt.detail.name,
              response,
            );
          });
          postView.displayMainTextarea();
          model.subscribe(path, authModel.getToken());
        })
        .catch((error: Error) => {
          slog.error("couldn't create channel in database", ["error", error]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Delete Workspace event listener.
  document.addEventListener(
    "deleteWorkspaceEvent",
    function (evt: CustomEvent<WorkspaceEvent>) {
      model
        .deleteWorkspace(evt.detail.name, authModel.getToken())
        .then((response) => {
          workspaceView.displayAllWorkspaces(response);
          workspaceView.clearWorkspaceDisplay();
          channelView.clearChannelDisplay();
          postView.clearPostArea();
        })
        .catch((error: Error) => {
          slog.error("couldn't delete workspaces from database", [
            "error",
            error,
          ]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Delete channel event listener.
  document.addEventListener(
    "deleteChannelEvent",
    function (evt: CustomEvent<ChannelEvent>) {
      model
        .deleteChannel(
          evt.detail.workspace,
          evt.detail.name,
          authModel.getToken(),
        )
        .then((response) => {
          if (channelView.getCurrentChannel() == evt.detail.name) {
            channelView.clearChannelHeader();
            postView.clearPostArea();
            model.unsubscribe();
          }
          channelView.displayAllChannels(evt.detail.workspace, response);
        })
        .catch((error: Error) => {
          slog.error("couldn't delete channel from database", ["error", error]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Create post event listener.
  document.addEventListener(
    "createPostEvent",
    function (evt: CustomEvent<CreatePostEvent>) {
      model
        .createPost(
          evt.detail.msg,
          evt.detail.workspaceName,
          evt.detail.channelName,
          authModel.getToken(),
          evt.detail.parent,
        )
        .then((response) => {
          postView.updatePosts(
            response,
            evt.detail.eventID,
            authModel.getUsername(),
          );
          postView.displayMainTextarea();
          postView.successCreate(evt.detail.eventID);
        })
        .catch((error: Error) => {
          slog.error("couldn't get posts from database", ["error", error]);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // React event listener.
  document.addEventListener(
    "reactEvent",
    function (evt: CustomEvent<ReactEvent>) {
      const reacted = evt.detail.reacted;
      model
        .triggerReaction(
          evt.detail.workspace,
          evt.detail.channel,
          evt.detail.name,
          evt.detail.emoji,
          evt.detail.clicker,
          reacted,
          authModel.getToken(),
        )
        .then(() => {
          postView.updateReactions(evt.detail.path, evt.detail.emoji, reacted);
        })
        .catch((error: Error) => {
          console.log(error);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Pin post event listener.
  document.addEventListener(
    "pinPostEvent",
    function (evt: CustomEvent<PinPostEvent>) {
      const pinned = evt.detail.pinned;
      console.log("inside pin event, it was already pinned", pinned);
      model
        .triggerPin(
          evt.detail.workspace,
          evt.detail.channel,
          evt.detail.postName,
          evt.detail.clicker,
          pinned,
          authModel.getToken(),
        )
        .then(() => {
          postView.togglePin(evt.detail.path, pinned);
        })
        .catch((error: Error) => {
          console.log(error);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Pin channel event listener.
  document.addEventListener(
    "pinChannelEvent",
    function (evt: CustomEvent<PinChannelEvent>) {
      const pinned = evt.detail.pinned;
      console.log("inside pin event, it was already pinned", pinned);
      model
        .triggerChannelPin(
          evt.detail.workspace,
          evt.detail.channel,
          evt.detail.clicker,
          pinned,
          authModel.getToken(),
        )
        .then(() => {
          channelView.togglePin(evt.detail.channel, pinned);
        })
        .catch((error: Error) => {
          console.log(error);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Pin workspace event listener.
  document.addEventListener(
    "pinWorkspaceEvent",
    function (evt: CustomEvent<PinWorkspaceEvent>) {
      const pinned = evt.detail.pinned;
      console.log("inside pin event, it was already pinned", pinned);
      model
        .triggerWorkspacePin(
          evt.detail.workspace,
          evt.detail.clicker,
          pinned,
          authModel.getToken(),
        )
        .then(() => {
          workspaceView.togglePin(evt.detail.workspace, pinned);
        })
        .catch((error: Error) => {
          console.log(error);
          if (parseInt(`${error}`) === 401) {
            authModel.removeUserToken();
            if (authModel.getToken() === "") {
              model.unsubscribe();
              authView.SuccessLogout();
            }
          }
          errorView.OpenErrorModal(`${error}`);
        });
    },
  );

  // Server-sent event listener for post updates.
  window.addEventListener(
    "updatePostEvent",
    function (evt: CustomEvent<UpdatePostEvent>) {
      try {
        if (evt.detail.id.endsWith(authModel.getUsername())) {
          console.log("Ignoring SSE for this local interaction");
        } else {
          const newID = evt.detail.id.substring(
            0,
            evt.detail.id.length - evt.detail.post.meta.lastModifiedBy.length,
          );
          postView.updatePosts(evt.detail.post, newID, authModel.getUsername());
        }
      } catch (error: unknown) {
        console.log(error);
        if (parseInt(`${error}`) === 401) {
          authModel.removeUserToken();
          if (authModel.getToken() === "") {
            model.unsubscribe();
            authView.SuccessLogout();
          }
        }
        errorView.OpenErrorModal(`${error}`);
      }
    },
  );

  // Reply button event listener.
  document.addEventListener(
    "replyButtonEvent",
    function (evt: CustomEvent<ReplyButtonEvent>) {
      try {
        postView.replaceTextarea(evt.detail.newTextarea, false);
      } catch (error) {
        console.log(error);
        errorView.OpenErrorModal(`${error}`);
      }
    },
  );

  // Close textarea event listener.
  document.addEventListener(
    "closeTextareaEvent",
    function (evt: CustomEvent<EmptyEvent>) {
      try {
        postView.displayMainTextarea();
      } catch (error: unknown) {
        console.log(error);
        errorView.OpenErrorModal(`${error}`);
      }
    },
  );
}

/* Register event handler to run after the page is fully loaded. */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM triggered");
  main();
});
