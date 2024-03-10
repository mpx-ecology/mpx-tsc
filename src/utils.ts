import type * as ts from "typescript";
import * as path from "path-browserify";
import type {
  RawVueCompilerOptions,
  VueCompilerOptions,
  VueLanguagePlugin,
} from "@vue/language-core/lib/types";

export type ParsedCommandLine = ts.ParsedCommandLine & {
  vueOptions: Partial<VueCompilerOptions>;
};

export function createParsedCommandLineByJson(
  ts: typeof import("typescript"),
  parseConfigHost: ts.ParseConfigHost,
  rootDir: string,
  json: any,
  configFileName = rootDir + "/jsconfig.json"
): ParsedCommandLine {
  const proxyHost = proxyParseConfigHostForExtendConfigPaths(parseConfigHost);
  ts.parseJsonConfigFileContent(
    json,
    proxyHost.host,
    rootDir,
    {},
    configFileName
  );

  let vueOptions: Partial<VueCompilerOptions> = {};

  for (const extendPath of proxyHost.extendConfigPaths.reverse()) {
    try {
      vueOptions = {
        ...vueOptions,
        ...getPartialVueCompilerOptions(
          ts,
          ts.readJsonConfigFile(extendPath, proxyHost.host.readFile)
        ),
      };
    } catch (err) {}
  }

  const parsed = ts.parseJsonConfigFileContent(
    json,
    proxyHost.host,
    rootDir,
    {},
    configFileName,
    undefined,
    (vueOptions.extensions ?? [".vue"]).map((extension) => ({
      extension: extension.slice(1),
      isMixedContent: true,
      scriptKind: ts.ScriptKind.Deferred,
    }))
  );

  // fix https://github.com/vuejs/language-tools/issues/1786
  // https://github.com/microsoft/TypeScript/issues/30457
  // patching ts server broke with outDir + rootDir + composite/incremental
  parsed.options.outDir = undefined;

  return {
    ...parsed,
    vueOptions,
  };
}

function proxyParseConfigHostForExtendConfigPaths(
  parseConfigHost: ts.ParseConfigHost
) {
  const extendConfigPaths: string[] = [];
  const host = new Proxy(parseConfigHost, {
    get(target, key) {
      if (key === "readFile") {
        return (fileName: string) => {
          if (
            !fileName.endsWith("/package.json") &&
            !extendConfigPaths.includes(fileName)
          ) {
            extendConfigPaths.push(fileName);
          }
          return target.readFile(fileName);
        };
      }
      return target[key as keyof typeof target];
    },
  });
  return {
    host,
    extendConfigPaths,
  };
}

function getPartialVueCompilerOptions(
  ts: typeof import("typescript"),
  tsConfigSourceFile: ts.TsConfigSourceFile
): Partial<VueCompilerOptions> {
  const folder = path.dirname(tsConfigSourceFile.fileName);
  const obj = ts.convertToObject(tsConfigSourceFile, []);
  const rawOptions: RawVueCompilerOptions = obj?.vueCompilerOptions ?? {};
  const result: Partial<VueCompilerOptions> = {
    ...(rawOptions as any),
  };
  const target = rawOptions.target ?? "auto";

  if (target === "auto") {
    const resolvedPath = resolvePath("vue/package.json");
    if (resolvedPath) {
      const vuePackageJson = require(resolvedPath);
      const versionNumbers = vuePackageJson.version.split(".");
      result.target = Number(versionNumbers[0] + "." + versionNumbers[1]);
    } else {
      // console.warn('Load vue/package.json failed from', folder);
    }
  } else {
    result.target = target;
  }
  if (rawOptions.plugins) {
    const plugins = rawOptions.plugins
      .map<VueLanguagePlugin[] | VueLanguagePlugin>((pluginPath: string) => {
        try {
          const resolvedPath = resolvePath(pluginPath);
          if (resolvedPath) {
            return require(resolvedPath);
          } else {
            console.warn("[Vue] Load plugin failed:", pluginPath);
          }
        } catch (error) {
          console.warn("[Vue] Resolve plugin path failed:", pluginPath, error);
        }
        return [];
      })
      .flat(Infinity as 1);

    result.plugins = plugins;
  }

  return result;

  function resolvePath(scriptPath: string): string | undefined {
    try {
      if (require?.resolve) {
        return require.resolve(scriptPath, { paths: [folder] });
      } else {
        // console.warn('failed to resolve path:', scriptPath, 'require.resolve is not supported in web');
      }
    } catch (error) {
      // console.warn(error);
    }
  }
}
