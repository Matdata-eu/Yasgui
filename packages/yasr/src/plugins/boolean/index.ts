/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the publin as standalone build
 */
import Yasr from "../../";
import { Plugin } from "../";
import "./index.scss";
export interface PluginConfig {}

export default class Boolean implements Plugin<PluginConfig> {
  private yasr: Yasr;
  public priority = 10;
  hideFromSelection = true;
  constructor(yasr: Yasr) {
    this.yasr = yasr;
  }
  draw() {
    const el = document.createElement("div");
    el.className = "booleanResult";

    const boolVal = this.yasr.results?.getBoolean();
    const icon = document.createElement("i");
    icon.className = boolVal ? "fas fa-check" : "fas fa-xmark";
    el.appendChild(icon);
    const textEl = document.createElement("span");
    textEl.textContent = boolVal ? "True" : "False";
    el.appendChild(textEl);

    this.yasr.resultsEl.appendChild(el);
  }
  canHandleResults() {
    return (
      !!this.yasr.results?.getBoolean &&
      (this.yasr.results.getBoolean() === true || this.yasr.results.getBoolean() == false)
    );
  }
  getIcon() {
    return document.createElement("");
  }
}
