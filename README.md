命令行中执行 Mpx 文件与 ts 文件类型检查

## 使用

```shell
npm i @mpxjs/mpx-tsc -D

mpx-tsc --noEmit

mpx-tsc --noEmit --skipLibCheck
```

## 开发

```shell
# 安装依赖
pnpm i
# tsc watch 模式
pnpm watch
# 清除 node_modules 和 tsc 缓存
pnpm clean
```

## 发布前先本地构建

```shell
pnpm build
```

## Thanks

- [vue-tsc](https://github.com/vuejs/language-tools/tree/master/packages/tsc)
- [volar](https://github.com/volarjs/volar.js)
