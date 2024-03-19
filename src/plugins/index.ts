import type { VueLanguagePlugin } from "@vue/language-core";
import useHtmlTemplatePlugin from "@vue/language-core/lib/plugins/vue-template-html";
import useVueSfcScriptsFormat from "@vue/language-core/lib/plugins/vue-sfc-scripts";
import useVueSfcTemplate from "@vue/language-core/lib/plugins/vue-sfc-template";
import useMpxFilePlugin from "./mpx-file";
import useMpxTsxPlugin from "./mpx-tsx";

export function getDefaultVueLanguagePlugins(
  pluginContext: Parameters<VueLanguagePlugin>[0]
) {
  const plugins: VueLanguagePlugin[] = [
    /** 检查模板 */
    useHtmlTemplatePlugin,
		useMpxFilePlugin,
    useMpxTsxPlugin,
    useVueSfcTemplate,
    useVueSfcScriptsFormat,
    ...pluginContext.vueCompilerOptions.plugins,
  ];

  const pluginInstances = plugins
    .map((plugin) => {
      try {
        return plugin(pluginContext);
      } catch (err) {
        console.warn("[Vue] Failed to create plugin", err);
      }
    })
    .filter((plugin): plugin is ReturnType<VueLanguagePlugin> => !!plugin)
    .sort((a, b) => {
      const aOrder = a.order ?? 0;
      const bOrder = b.order ?? 0;
      return aOrder - bOrder;
    });

  return pluginInstances;
}
