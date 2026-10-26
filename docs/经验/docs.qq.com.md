# 腾讯文档（docs.qq.com）

2026-09-17只读实测更新：部分DOCX页面可从页面状态提取正文与批注。旧经验「正文在canvas里，所以只能截图」不再普遍成立；不同文档类型与页面版本先探测。

## 正文、批注与图片

- 本轮正文入口为`window.pad.editor._state._dataEngine.dataStream.textPool`，`size()`取字符数，`subText(0,size())`取文本。属于内部实现，不存在时停止沿用该路径。
- 文本池可能混有主文档、批注、文本框与控制字符。清洗时标明图片占位，不把原始流当作排版后的完整正文。
- 本轮从`.comment-external-group-wrapper`的React内部属性向父级查找`memoizedProps.commentEngine`，通过`getCommentInfoState()`读取当前及归档批注映射。讨论串数与批注数不是同一口径。
- 锚点调用`engine.getAnchorText(anchorId)`、`engine.getAnchorRange(anchorId)`时保留方法所属对象；解构成裸函数可能丢失`this`。
- 图片原图地址本轮可从`dataStream.drawingStream.drawingPropList`迭代读取；`picturePropList`为空不代表没有图片。不要打印整个对象或把真实图片地址加入共享笔记。
- 修订列表为空不能证明没有普通编辑，也不能据此把差异归因给某位作者。

## 失败时的退路

- 页面状态不存在或`eval`失败时，回到文档已有的导出入口或逐屏截图。滚动容器、类名和屏幕步长按当前布局确认，不能用固定步长保证无遗漏。
- canvas编辑、虚拟滚动可能依赖前台渲染；需切前台时先告知用户。
- 本轮部分docimg图片在扩展侧fetch返回403，`via:"page"`可下载；这只是已验证的路径，不代表所有图片都允许相同请求。
- 上述内部状态提取仅限读取，不调用名称含set、modify、requestAdd的写入方法。文档正文、批注作者、文档token和签名链接属于任务数据，不是可公开经验。
