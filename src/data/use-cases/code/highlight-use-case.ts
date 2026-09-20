import bash from "highlight.js/lib/languages/bash"
import c from "highlight.js/lib/languages/c"
import cpp from "highlight.js/lib/languages/cpp"
import csharp from "highlight.js/lib/languages/csharp"
import css from "highlight.js/lib/languages/css"
import diff from "highlight.js/lib/languages/diff"
import dockerfile from "highlight.js/lib/languages/dockerfile"
import go from "highlight.js/lib/languages/go"
import ini from "highlight.js/lib/languages/ini"
import java from "highlight.js/lib/languages/java"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import php from "highlight.js/lib/languages/php"
import python from "highlight.js/lib/languages/python"
import ruby from "highlight.js/lib/languages/ruby"
import rust from "highlight.js/lib/languages/rust"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"
import { createLowlight } from "lowlight"
import { EXT_LANG } from "../../../shared/constants/codeHighlight"
import type { ICodeHighlightUseCase } from "../../../domain/entities/code/highlight"

const lowlight = createLowlight()

lowlight.register("bash", bash)
lowlight.register("c", c)
lowlight.register("cpp", cpp)
lowlight.register("csharp", csharp)
lowlight.register("css", css)
lowlight.register("diff", diff)
lowlight.register("dockerfile", dockerfile)
lowlight.register("go", go)
lowlight.register("ini", ini)
lowlight.register("java", java)
lowlight.register("javascript", javascript)
lowlight.register("json", json)
lowlight.register("markdown", markdown)
lowlight.register("php", php)
lowlight.register("python", python)
lowlight.register("ruby", ruby)
lowlight.register("rust", rust)
lowlight.register("typescript", typescript)
lowlight.register("xml", xml)
lowlight.register("yaml", yaml)

export class CodeHighlightUseCase implements ICodeHighlightUseCase {
  languageForFile(path: string): string | null {
    const base = path.split("/").pop() ?? path
    if (/^dockerfile/i.test(base)) return "dockerfile"
    const dot = base.lastIndexOf(".")
    if (dot < 0) return null
    return EXT_LANG[base.slice(dot + 1).toLowerCase()] ?? null
  }

  highlightLineHast(text: string, path: string) {
    const lang = this.languageForFile(path)
    if (lang === null || !lowlight.registered(lang)) return null
    try {
      return lowlight.highlight(lang, text)
    } catch {
      return null
    }
  }
}
