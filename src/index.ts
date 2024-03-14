import * as vue from "@vue/language-core";
import { runTsc } from "@volar/typescript/lib/quickstart/runTsc";
import type * as TypeTS from "typescript";
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
            : {};
        const resolvedVueOptions = vue.resolveVueCompilerOptions(vueOptions);
        // const { extensions } = resolvedVueOptions;
        resolvedVueOptions.extensions = runExtensions;
        const fakeGlobalTypesHolder = createFakeGlobalTypesHolder(options);

        const vueLanguagePlugin = createVueLanguagePlugin(
          ts,
          (id) => id,
          (fileName) => fileName === fakeGlobalTypesHolder,
          options.options,
          resolvedVueOptions,
          false
        );
        return [vueLanguagePlugin];
      }
    );

  try {
    main();
  } catch (err) {
    console.error(err);
  }
}

export function createFakeGlobalTypesHolder(
  options: TypeTS.CreateProgramOptions
) {
  const firstVueFile = options.rootNames.find((fileName) =>
    fileName.endsWith(".mpx")
  );
  if (firstVueFile) {
    const fakeFileName = firstVueFile + "__VLS_globalTypes.mpx";

    (options.rootNames as string[]).push(fakeFileName);

    const fileExists = options.host!.fileExists.bind(options.host);
    const readFile = options.host!.readFile.bind(options.host);
    const writeFile = options.host!.writeFile.bind(options.host);

    options.host!.fileExists = (fileName) => {
      if (fileName.endsWith("__VLS_globalTypes.mpx")) {
        return true;
      }
      return fileExists(fileName);
    };
    options.host!.readFile = (fileName) => {
      if (fileName.endsWith("__VLS_globalTypes.mpx")) {
        return '<script setup lang="ts"></script>';
      }
      return readFile(fileName);
    };
    options.host!.writeFile = (fileName, ...args) => {
      if (fileName.endsWith("__VLS_globalTypes.mpx.d.ts")) {
        return;
      }
      return writeFile(fileName, ...args);
    };

    return fakeFileName.replace(windowsPathReg, "/");
  }
}
