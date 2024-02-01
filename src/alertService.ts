// alertService.ts

let showAlertFunction: ((message: string) => void) | null = null;

export const setAlertFunction = (func: ((message: string) => void) | null) => {
  showAlertFunction = func;
};

export const showAlert = (message: string) => {
  if (showAlertFunction) {
    showAlertFunction(message);
  } else {
    console.warn("showAlertFunction is not set.");
  }
};