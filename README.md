命令行中执行 Mpx 文件与 ts 文件类型检查

## 使用

```shell
# 安装
npm i @mpxjs/mpx-tsc -D
# 类型检查
mpx-tsc --noEmit
# 增量模式加速
mpx-tsc --noEmit --incremental
```

## 开发

```shell
# 安装依赖
pnpm i
# 构建
pnpm build
# watch 模式
pnpm watch
# 清除缓存重新构建
pnpm resetup
```

## 发布前先本地构建

```shell
pnpm build
```

## Credits

The @mpxjs/mpx-tsc project is heavily inspired by:

- [vue-tsc](https://github.com/vuejs/language-tools/tree/master/packages/tsc)

And supported by:

- [Volar.js](https://github.com/volarjs/volar.js)
