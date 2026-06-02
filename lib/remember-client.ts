/** Whether the user opted into «تذكرني» on the device (non-HttpOnly cookie). */
export function isRememberMeEnabled(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie.split(";").some((part) => part.trim() === "br_remember=1");
}
