import DOMPurify from "dompurify";
export { default as Storage } from "./Storage";

const { sanitize } = DOMPurify;

export function hasClass(el: Element | undefined, className: string) {
  if (!el) return;
  if (el.classList) return el.classList.contains(className);
  else return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));
}

export function addClass(el: Element | undefined | null, ...classNames: string[]) {
  if (!el) return;
  for (const className of classNames) {
    if (el.classList) el.classList.add(className);
    else if (!hasClass(el, className)) el.className += " " + className;
  }
}

export function removeClass(el: Element | undefined | null, className: string) {
  if (!el) return;
  if (el.classList) el.classList.remove(className);
  else if (hasClass(el, className)) {
    var reg = new RegExp("(\\s|^)" + className + "(\\s|$)");
    el.className = el.className.replace(reg, " ");
  }
}

export function getAsValue<E, A>(valueOrFn: E | ((arg: A) => E), arg: A): E {
  if (typeof valueOrFn === "function") return (valueOrFn as any)(arg);
  if (typeof valueOrFn === "string") return sanitize(valueOrFn) as any;
  return valueOrFn;
}
