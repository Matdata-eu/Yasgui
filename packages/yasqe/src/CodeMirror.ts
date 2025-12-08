//Do not want to import this using typescript. Somehow, we get a tangled mess when transpiling to es6 with ts,
//and applying babel.
import {
  Editor as CmEditor,
  Doc as CmDoc,
  Token as CmToken,
  Position as CmPosition,
  EditorConfiguration as CmEditorConfiguration,
} from "codemirror";

import _CodeMirror from "codemirror";

import * as sparql11Mode from "../grammar/tokenizer";
import * as sparql12Mode from "../grammar/tokenizer12";
import { default as prefixFold } from "./prefixFold";
import { TokenizerState } from "./index";

import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/xml-fold.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/match-highlighter.js";
import "codemirror/addon/edit/matchbrackets.js";
import "codemirror/addon/runmode/runmode.js";
import "codemirror/lib/codemirror.css";
import "codemirror/addon/fold/foldgutter.css";
import "./scss/codemirrorMods.scss";

_CodeMirror.registerHelper("fold", "prefix", prefixFold);
_CodeMirror.defineMode("sparql11", sparql11Mode.default);
_CodeMirror.defineMode("sparql12", sparql12Mode.default);

namespace CodeMirror {
  export type Doc = CmDoc;
  export type Position = CmPosition;
  export type EditorConfiguration = CmEditorConfiguration;
  export interface Token extends CmToken {
    state: sparql11Mode.State;
  }
}
interface CodeMirror extends Omit<CmEditor, "getOption" | "setOption" | "on" | "off"> {
  /**
   * Added some more specific typings for `getOption`
   * For some functions (called from keyboard combinations like ctrl-enter) we cannot use member props of our object
   * as these are lost when we are receiving the native CM object as argument
   * Only way to persistently store these options is by using getOption and setOption
   */
  getOption(opt: "queryType"): TokenizerState["queryType"];
  setOption(opt: "queryType", val: TokenizerState["queryType"]): void;

  foldCode(firstPrefixLine: number, prefix: string, collapse: "fold" | "unfold"): void;
}
const CodeMirror: any = _CodeMirror;
export default CodeMirror;
