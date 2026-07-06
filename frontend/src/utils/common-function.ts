const truncateText = (text: string, length: number) => {
  if (text.split("").length > length) {
    return text.substring(0, length) + "...";
  } else {
    return text;
  }
};

const copyToClipboard = (text: string): void => {
  // Check if the Clipboard API is supported
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err: any) => {
      throw new Error("Failed to copy text to clipboard: " + err);
    });
  } else {
    // Fallback method for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed"; // Prevents scrolling to the textarea
    textarea.style.opacity = "0"; // Makes it invisible
    document.body.appendChild(textarea);
    textarea.select();
    try {
      if (!document.execCommand("copy")) {
        throw new Error("Fallback: Unable to copy text to clipboard.");
      }
    } catch (err) {
      const error = err as Error;
      throw new Error("Fallback: Failed to copy text to clipboard: " + error);
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

// return undefined if value is null or value === ""
const isNull = (value: any) => {
  return value === null || value === "" || value === undefined ? null : value;
};
const isUndefined = (value: any) => {
  return value === null || value === "" || value === undefined
    ? undefined
    : value;
};

export { copyToClipboard, isNull, isUndefined, truncateText };
