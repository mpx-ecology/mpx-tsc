import * as vue from "@vue/language-core";
import { runTsc } from "@volar/typescript/lib/quickstart/runTsc";
import { createVueLanguagePlugin } from "./languageModule";

const windowsPathReg = /\\/g;

export function run() {
  let runExtensions = [".mpx"];
  const main = () =>
    runTsc(
      require.resolve("typescript/lib/tsc"),
      runExtensions,
      (ts, options) => {
        const { configFilePath } = options.options;
        const vueOptions =
          typeof configFilePath === "string"
            ? vue.createParsedCommandLine(
                ts,
                ts.sys,
                configFilePath.replace(windowsPathReg, "/")
              ).vueOptions
            : vue.resolveVueCompilerOptions({});
        vueOptions.extensions = runExtensions;

        const writeFile = options.host!.writeFile.bind(options.host);
        options.host!.writeFile = (fileName, contents, ...args) => {
          if (
            fileName.endsWith(".d.ts") &&
            vueLanguagePlugin
              .getCanonicalFileName(fileName.replace(windowsPathReg, "/"))
              .slice(0, -5) ===
              vueLanguagePlugin.pluginContext.globalTypesHolder
          ) {
            contents = removeEmitGlobalTypes(contents);
          }
          return writeFile(fileName, contents, ...args);
        };

        const vueLanguagePlugin = createVueLanguagePlugin(
          ts,
          (id) => id,
          options.host?.useCaseSensitiveFileNames?.() ?? false,
          () => "",
          () =>
            options.rootNames.map((rootName) =>
              rootName.replace(windowsPathReg, "/")
            ),
          options.options,
          vueOptions,
          false
        );
        return [vueLanguagePlugin];
      },
      (fileName) => {
        if (runExtensions.some((ext) => fileName.endsWith(ext))) {
          return "mpx";
        }
        return resolveCommonLanguageId(fileName);
      }
    );

  try {
    main();
  } catch (err) {
    console.error(err);
  }
}

export function removeEmitGlobalTypes(dts: string) {
  return dts.replace(
    /[^\n]*__VLS_globalTypesStart[\w\W]*__VLS_globalTypesEnd[^\n]*\n/,
    ""
  );
}

export function resolveCommonLanguageId(fileNameOrUri: string) {
  const ext = fileNameOrUri.split(".").pop()!;
  switch (ext) {
    case "js":
      return "javascript";
    case "cjs":
      return "javascript";
    case "mjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "cts":
      return "typescript";
    case "mts":
      return "typescript";
    case "jsx":
      return "javascriptreact";
    case "tsx":
      return "typescriptreact";
    case "pug":
      return "jade";
    case "md":
      return "markdown";
  }
  return ext;
}
