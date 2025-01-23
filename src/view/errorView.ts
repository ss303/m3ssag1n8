/**
 * This file handles error display functionality for the chat application.
 * It includes the initialization of the error view and the `ErrorView` class,
 * which manages the error modal that displays error messages and handles
 * the closing of the error modal.
 */

/**
 * Represents an event for displaying an error message.
 */
export type DisplayErrorEvent = {
  message: string;
};

/**
 * Initializes the error view by binding the label and button elements.
 * @returns A new instance of the ErrorView class.
 */
export function initErrorView() {
  const errorModal = document.querySelector("#error-modal");
  const errorForm = document.querySelector("#error-form");
  const message = document.querySelector("#error-message");
  const closeButton = document.querySelector("#close-error-button");

  if (!(errorModal instanceof HTMLDialogElement)) {
    console.error("error dialog is not a dialog");
    throw new Error("there is no error dialog");
  }

  if (!(errorForm instanceof HTMLFormElement)) {
    console.error("error form is not a form");
    throw new Error("there is no error form");
  }

  if (!(message instanceof HTMLLabelElement)) {
    console.error("error message is not a label");
    throw new Error("there is no error message label");
  }

  if (!(closeButton instanceof HTMLButtonElement)) {
    console.error("close error button is not a button");
    throw new Error("there is no close error message button");
  }

  return new ErrorView(errorModal, errorForm, message, closeButton);
}

/**
 * A class to manage the error view for the application.
 * Handles the display of error messages and closing of the error modal.
 */
class ErrorView {
  /** Dialog for errors */
  private errorModal: HTMLDialogElement;
  /** Form for displaying and closing errors */
  private errorForm: HTMLFormElement;
  /** Area where the error message is displayed */
  private message: HTMLLabelElement;
  /** Button element for closing the error modal */
  private closeButton: HTMLButtonElement;

  /**
   * Initializes the ErrorView with the provided message label and close button.
   * @param errorModal - The dialog element for displaying the error modal.
   * @param errorForm - The form element for displaying and closing errors.
   * @param message - The label element for displaying the error message.
   * @param closeButton - The button element for closing the error modal.
   */
  constructor(
    errorModal: HTMLDialogElement,
    errorForm: HTMLFormElement,
    message: HTMLLabelElement,
    closeButton: HTMLButtonElement,
  ) {
    this.errorModal = errorModal;
    this.errorForm = errorForm;
    this.message = message;
    this.closeButton = closeButton;

    this.errorModal.addEventListener("click", (event) => {
      this.CloseErrorModal();
    });

    this.errorForm.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    this.closeButton.addEventListener("click", (event) => {
      event.preventDefault(); // Prevent the form from submitting
      this.CloseErrorModal();
    });
  }

  /**
   * Opens the error modal and displays the appropriate error message.
   * @param error - The error code or message to be displayed.
   */
  OpenErrorModal(error: string) {
    console.log("Need to inform user of an error");

    switch (parseInt(error)) {
      case 401:
        this.message.innerText = "Timed out. Please log in again.";
        break;
      case 404:
        this.message.innerText =
          "The channel or workspace you are trying to access does not exist. Please refresh.";
        break;
      case 412:
        this.message.innerText =
          "The channel or workspace you are trying to create already exists. Please refresh.";
        break;
      case 400:
        this.message.innerText =
          "The channel or workspace you are trying to create already exists. Please refresh.";
        break;
      default:
        this.message.innerText = error;
        break;
    }

    document.getElementById("error-modal")?.classList.remove("hide");
    this.closeButton.focus();
  }

  /**
   * Closes the error modal.
   */
  private CloseErrorModal() {
    document.getElementById("error-modal")?.classList.add("hide");
  }
}
