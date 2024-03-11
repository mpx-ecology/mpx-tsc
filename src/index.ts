import * as vue from "@vue/language-core";
import { runTsc } from "@volar/typescript/lib/quickstart/runTsc";
import type * as TypeTS from "typescript";

const windowsPathReg = /\\/g;

export function run() {
  let runExtensions = [".mpx", ".vue"];

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
        console.log("[shun]-0", options.options);
        console.log("[shun]-1", resolvedVueOptions);
        const fakeGlobalTypesHolder = createFakeGlobalTypesHolder(options);
        console.log("[shun]-2", fakeGlobalTypesHolder);

        const vueLanguagePlugin = vue.createVueLanguagePlugin(
          ts,
          (id) => id,
          (fileName) => fileName === fakeGlobalTypesHolder,
          options.options,
          resolvedVueOptions,
          false
        );
				console.log('[shun] vueLanguagePlugin:', vueLanguagePlugin);
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
    fileName.endsWith(".vue")
  );
  if (firstVueFile) {
    const fakeFileName = firstVueFile + "__VLS_globalTypes.vue";

    (options.rootNames as string[]).push(fakeFileName);

    const fileExists = options.host!.fileExists.bind(options.host);
    const readFile = options.host!.readFile.bind(options.host);
    const writeFile = options.host!.writeFile.bind(options.host);

    options.host!.fileExists = (fileName) => {
      if (fileName.endsWith("__VLS_globalTypes.vue")) {
        return true;
      }
      return fileExists(fileName);
    };
    options.host!.readFile = (fileName) => {
      if (fileName.endsWith("__VLS_globalTypes.vue")) {
        return '<script setup lang="ts"></script>';
      }
      return readFile(fileName);
    };
    options.host!.writeFile = (fileName, ...args) => {
      if (fileName.endsWith("__VLS_globalTypes.vue.d.ts")) {
        return;
      }
      return writeFile(fileName, ...args);
    };

    return fakeFileName.replace(windowsPathReg, "/");
  }
}
