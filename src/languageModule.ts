import type * as ts from "typescript";
import type { VueCompilerOptions, VueLanguagePlugin } from "@vue/language-core";
import { forEachEmbeddedCode, type LanguagePlugin } from "@volar/language-core";
import { VueGeneratedCode } from "@vue/language-core/lib/virtualFile/vueFile";
import * as CompilerDOM from "@vue/compiler-dom";
import * as CompilerVue2 from "@vue/language-core/lib/utils/vue2TemplateCompiler";
import { getDefaultVueLanguagePlugins } from "./plugins";

const normalFileRegistries: {
  key: string;
  plugins: VueLanguagePlugin[];
  files: Map<string, VueGeneratedCode>;
}[] = [];
const holderFileRegistries: typeof normalFileRegistries = [];

function getVueFileRegistry(
  isGlobalTypesHolder: boolean,
  key: string,
  plugins: VueLanguagePlugin[]
) {
  const fileRegistries = isGlobalTypesHolder
    ? holderFileRegistries
    : normalFileRegistries;
  let fileRegistry = fileRegistries.find(
    (r) =>
      r.key === key &&
      r.plugins.length === plugins.length &&
      r.plugins.every((plugin) => plugins.includes(plugin))
  )?.files;
  if (!fileRegistry) {
    fileRegistry = new Map();
    fileRegistries.push({
      key: key,
      plugins: plugins,
      files: fileRegistry,
    });
  }
  return fileRegistry;
}

function getFileRegistryKey(
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  plugins: ReturnType<VueLanguagePlugin>[]
) {
  const values = [
    ...Object.keys(vueCompilerOptions)
      .sort()
      .filter((key) => key !== "plugins")
      .map((key) => [key, vueCompilerOptions[key as keyof VueCompilerOptions]]),
    [
      ...new Set(
        plugins.map((plugin) => plugin.requiredCompilerOptions ?? []).flat()
      ),
    ]
      .sort()
      .map((key) => [key, compilerOptions[key as keyof ts.CompilerOptions]]),
  ];
  return JSON.stringify(values);
}

interface _Plugin extends LanguagePlugin<VueGeneratedCode> {
  getCanonicalFileName: (fileName: string) => string;
  pluginContext: Parameters<VueLanguagePlugin>[0];
}

export function createVueLanguagePlugin(
  ts: typeof import("typescript"),
  getFileName: (fileId: string) => string,
  useCaseSensitiveFileNames: boolean,
  getProjectVersion: () => string,
  getScriptFileNames: () => string[] | Set<string>,
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  codegenStack: boolean = false
): _Plugin {
  const allowLanguageIds = new Set(["mpx"]);
  const pluginContext: Parameters<VueLanguagePlugin>[0] = {
    modules: {
      "@vue/compiler-dom":
        vueCompilerOptions.target < 3
          ? {
              ...CompilerDOM,
              compile: CompilerVue2.compile,
            }
          : CompilerDOM,
      typescript: ts,
    },
    compilerOptions,
    vueCompilerOptions,
    codegenStack,
    globalTypesHolder: undefined,
  };
  const plugins = getDefaultVueLanguagePlugins(pluginContext);

  if (vueCompilerOptions.extensions.includes(".md")) {
    allowLanguageIds.add("markdown");
  }
  if (vueCompilerOptions.extensions.includes(".html")) {
    allowLanguageIds.add("html");
  }

  const getCanonicalFileName = useCaseSensitiveFileNames
    ? (fileName: string) => fileName
    : (fileName: string) => fileName.toLowerCase();
  let canonicalRootFileNames = new Set<string>();
  let canonicalRootFileNamesVersion: string | undefined;

  return {
    getCanonicalFileName,
    pluginContext,
    createVirtualCode(fileId, languageId, snapshot) {
      if (allowLanguageIds.has(languageId)) {
        const fileName = getFileName(fileId);
        const projectVersion = getProjectVersion();
        if (projectVersion !== canonicalRootFileNamesVersion) {
          canonicalRootFileNames = new Set(
            [...getScriptFileNames()].map(getCanonicalFileName)
          );
          canonicalRootFileNamesVersion = projectVersion;
        }
        if (
          !pluginContext.globalTypesHolder &&
          canonicalRootFileNames.has(getCanonicalFileName(fileName))
        ) {
          pluginContext.globalTypesHolder = fileName;
        }
        const fileRegistry = getFileRegistry(
          pluginContext.globalTypesHolder === fileName
        );
        const code = fileRegistry.get(fileId);
        if (code) {
          code.update(snapshot);
          return code;
        } else {
          const code = new VueGeneratedCode(
            fileName,
            languageId,
            snapshot,
            vueCompilerOptions,
            plugins,
            ts,
            codegenStack
          );
          fileRegistry.set(fileId, code);
          return code;
        }
      }
    },
    updateVirtualCode(_fileId, code, snapshot) {
      code.update(snapshot);
      return code;
    },
    typescript: {
      extraFileExtensions:
        vueCompilerOptions.extensions.map<ts.FileExtensionInfo>((ext) => ({
          extension: ext.slice(1),
          isMixedContent: true,
          scriptKind: 7 satisfies ts.ScriptKind.Deferred,
        })),
      getServiceScript(root) {
        for (const code of forEachEmbeddedCode(root)) {
          if (code.id.startsWith("script_")) {
            const lang = code.id.substring("script_".length);
            return {
              code,
              extension: "." + lang,
              scriptKind: lang === "js" ? ts.ScriptKind.JS : ts.ScriptKind.TS,
            };
          }
        }
      },
    },
  };

  function getFileRegistry(isGlobalTypesHolder: boolean) {
    return getVueFileRegistry(
      isGlobalTypesHolder,
      getFileRegistryKey(compilerOptions, vueCompilerOptions, plugins),
      vueCompilerOptions.plugins
    );
  }
}
