import * as semver from "semver"
import * as vue from "@vue/language-core"
import { runTsc } from "@volar/typescript/lib/quickstart/runTsc"
import { createVueLanguagePlugin } from "./languageModule"

const windowsPathReg = /\\/g

function getTscPath() {
    const version = require("typescript/package.json").version as string

    if (semver.gte(version, "5.7.0")) {
        // 兼容 ts>=5.7 开始的 breaking change
        return require.resolve("typescript/lib/_tsc")
    } else if (semver.gte(version, "5.0.0")) {
        return require.resolve("typescript/lib/tsc")
    } else {
        // 不支持 ts<5
        throw new Error("mpx-tsc 仅支持 ts>=5, 请更新 typescript 版本!")
    }
}

export function run(tscPath = getTscPath()) {
    let runExtensions = [".mpx"]
    const main = () =>
        runTsc(
            tscPath,
            runExtensions,
            (ts, options) => {
                const { configFilePath } = options.options
                const vueOptions =
                    typeof configFilePath === "string"
                        ? vue.createParsedCommandLine(
                              ts,
                              ts.sys,
                              configFilePath.replace(windowsPathReg, "/")
                          ).vueOptions
                        : vue.resolveVueCompilerOptions({})
                vueOptions.extensions = runExtensions

                const writeFile = options.host!.writeFile.bind(options.host)
                options.host!.writeFile = (fileName, contents, ...args) => {
                    if (
                        fileName.endsWith(".d.ts") &&
                        vueLanguagePlugin
                            .getCanonicalFileName(
                                fileName.replace(windowsPathReg, "/")
                            )
                            .slice(0, -5) ===
                            vueLanguagePlugin.pluginContext.globalTypesHolder
                    ) {
                        contents = removeEmitGlobalTypes(contents)
                    }
                    return writeFile(fileName, contents, ...args)
                }

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
                )
                return [vueLanguagePlugin]
            },
            (fileName) => {
                if (runExtensions.some((ext) => fileName.endsWith(ext))) {
                    return "mpx"
                }
                return resolveCommonLanguageId(fileName)
            }
        )

    try {
        main()
    } catch (err) {
        console.error(err)
    }
}

export function removeEmitGlobalTypes(dts: string) {
    return dts.replace(
        /[^\n]*__VLS_globalTypesStart[\w\W]*__VLS_globalTypesEnd[^\n]*\n/,
        ""
    )
}

export function resolveCommonLanguageId(fileNameOrUri: string) {
    const ext = fileNameOrUri.split(".").pop()!
    switch (ext) {
        case "js":
            return "javascript"
        case "cjs":
            return "javascript"
        case "mjs":
            return "javascript"
        case "ts":
            return "typescript"
        case "cts":
            return "typescript"
        case "mts":
            return "typescript"
        case "jsx":
            return "javascriptreact"
        case "tsx":
            return "typescriptreact"
        case "pug":
            return "jade"
        case "md":
            return "markdown"
    }
    return ext
}
