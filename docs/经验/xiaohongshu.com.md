# 小红书（xiaohongshu.com）

实测 2026-08-25，本机会话实抓（创作后台导数据）。

签名网关级，**任何自造请求一律 406**。别逆向，点它自己的按钮，
让页面发带签名的请求，你只负责用 `network` 读响应。

数据入口选「数据看板→内容分析」，不要用「笔记管理」——后者不分页，
前者指标还更全（曝光、封面点击率、涨粉、人均观看时长）。

⚠️ DOM 里五个指标糊成一串（`123.68万214560420187309160`），
按常识猜顺序会串位。接口里是
`{view_count, comments_count, likes, collected_count, shared_count}`，
真实顺序是「观看、**评论**、**点赞**、收藏、分享」。

## 创作平台发图文笔记（2026-09-07 实测打通，含定时发布）

入口 `creator.xiaohongshu.com/publish/publish?source=official`，默认停在「上传视频」，
先 `eval` 点文字为「上传图文」的 span 切 tab。

- **传图**：第一张投 `input.upload-input`；之后编辑器出现，那个 input 就没了，
  改投 `input[type=file][multiple]`（隐藏的，`upload` 工具照样能投）。
  **必须一张一张按顺序投**，顺序即笔记顺序，最多 18 张；每张投完 `eval` 读
  `innerText.match(/(\d+)\/18/)` 确认计数。**不收 GIF。**
- **标题**：`input[placeholder*=标题]`，20 字上限。
  ⚠️ 用 `fill` 填正文 ref 时曾把正文灌进了标题框——**填完必核标题 value**。
  改标题用原生 setter + `input` 事件。
- **正文**：`.tiptap.ProseMirror`，`fill` 进不去；用 `eval`：focus →
  `execCommand('selectAll')` + `delete` → 按行 `insertText` + `insertParagraph`。
  空行也要 `insertParagraph` 一次，结果是段落间恰好一个空段。
- **话题**：纯文本 `#xxx` 不算话题。正确做法：光标在末尾 `insertText(' #词')` →
  等约 1–3 秒候选框（`div.item` 里的 `.name`）出现 → `eval` 点文本完全等于 `#词` 的那个
  `div.item`（或第一个）→ 生成 `a.tiptap-topic`。**Enter 键有时有效有时不动，别依赖。**
  候选框加载期间页面脚本会卡 7–20 秒，`act wait` 会报 `DIALOG_BLOCKING`，
  不是真弹框，直接下一轮 eval 即可。用 `[...ed.querySelectorAll('a.tiptap-topic')]` 验收话题数。
- **定时发布**：「更多设置」里 `.custom-switch-wrapper`（含文本「定时发布」）→
  点里面的 `.d-switch`。时间框 `.d-datepicker-input-filter input`，
  用 `act click selector` 打开（JS `click()` 打不开）；弹层 `.d-popover` 里两根
  `.d-timepicker-timebar`，第一根小时第二根分钟，`eval` 点里面文本等于 `07`/`30` 的 span
  即生效，input value 立刻变。
- **🔑 发布按钮在封闭 shadow DOM 里**：`<xhs-publish-btn submit-text="定时发布" save-text="暂存离开">`，
  DOM 搜不到「发布」两个字，a11y click 和坐标 real click 全部无效（网络零请求）。
  宿主元素自带 `_sr`（shadow root），用
  `host._sr.querySelectorAll('button')` 找到文本为「定时发布」的 `button.ce-btn.bg-red`
  直接 `.click()` 就发出去了。成功跳 `/publish/success`，4 秒后回发布页。
- 后台标签页也能填，但最后发布前建议 `tabs select focus:true` 切前台一次。
- **发布前自检清单**：`N/18` 图数、标题 value、`/1000` 计数、`a.tiptap-topic` 数、时间框 value。

## 🔑 笔记详情页必须有 xsec_token（2026-09-15 实测）

直接导航 `https://www.xiaohongshu.com/explore/<note_id>` → **300031「当前笔记暂时无法浏览」+ 滑块验证**。
正确姿势：token 就藏在主页卡片的 href 里，取出来导航即可：

```js
// 在用户主页跑
const it=[...document.querySelectorAll('section.note-item')].find(s=>s.innerText.includes('关键词'));
it.querySelector('a.cover').getAttribute('href');
// → /user/profile/<uid>/<note_id>?xsec_token=XXX=&xsec_source=pc_user
```

导航这个 URL 会自动 302 到 `/explore/<note_id>?xsec_token=...` 并正常打开。
`section.note-item` 上自带 `data-note-id` / `data-index`。**别用 `a[href*="/explore/"]` 匹配**——
主页那批 href 是**不带 token** 的，点它必 404。置顶笔记的顺序每次渲染会变，别按 DOM 下标硬编码。

## ⚠️ 后台标签页：点不动 UI，但导航和 eval 照常

`document.hidden=true` 时布局/命中测试不可靠：所有元素 rect 会算成同一个值，
`act`/`click` 一律报「被其它元素遮挡」；**`innerText` 也返回空**（依赖渲染），找元素要改用 `textContent`。
**先查 `document.hidden`**，别去追不存在的浮层。`navigate`、`eval`、`network`、`snapshot` 在后台照常可用——
**能用导航和 eval 解决的就别用点击**。（`tabs select focus:true` 不一定能把它变成前台。）

## 评论点赞（2026-09-15 实测）

- DOM：`div.comment-item#comment-<comment_id>`，内含 `.author .name` / `.note-text` / `.like-wrapper`。
- **`.like-wrapper.like-active` 是默认类名，不代表已赞**。判已赞只认接口 `comment/page` 返回的 `liked` 字段。
- 点赞：`commentItem.querySelector('.like-wrapper').click()` —— **JS 合成点击就生效**，不用真实鼠标事件。
  一次 eval 循环点 9 条全部成功。
- 验收：`navigate action:reload` 后重读 `comment/page` 接口，`liked:true` + `like_count:"0"→"1"`。
  **别拿 DOM 类名当验收**——那是你自己点出来的。

## 私信（2026-09-15 实测打通）

入口 `https://www.xiaohongshu.com/chat?openUid=<user_id>`，**可直接导航，不需要 xsec_token**。
（主页上的「发消息」按钮是 `button.xhs-user-im-btn`，`aria-label="发消息"`，点它会开新标签页到这个 URL。）

- **输入框是 contenteditable，不是 textarea**：`.xhs-im-input-bar-editor`。
  没有「发送」按钮——**回车即发**。
- 发消息：focus → 选中全部 → `execCommand('insertText', ...)` → 派发 Enter
  （`keydown`/`keypress`/`keyup`，带 `keyCode:13`、`bubbles:true`）。发完输入框自清空。
- 会话标题在 `.xhs-im-chat-window__header-name`，**发送前先核这个名字**再发，防止发错人。
- 🔴 **陌生人（对方没关注、也没回复过你）24 小时内只能发 1 条文字消息**，页面上明写这句提示。
  **一条就是一次机会，发前想清楚。**
- **普通文案里的站外链接不会被静默拦**——实测把 `https://…` 直接放进第一条私信，正常送达。
  不需要拆字/谐音，也**不要**去做伪装链接（绕审核不可取，且被静默拦截时对方根本收不到）。

## 通知中心不是评论全集

`/notification?tab=comment` 只显示**极少数**最近通知（实测 7 万粉账号只有 3 条），
「查看更多历史消息」也加载不出更多。**要拿某条笔记的全部评论，进笔记详情读 `comment/page` 接口。**

## 用户主页

`/user/profile/<user_id>?xsec_token=...&xsec_source=pc_comment` 可正常打开
（token 从评论区的 `a[data-user-id]` 上取，属性 `data-xsec-token` 里就有）。

## 视频封面编辑的保存层级（2026-09-22补充）

- 本轮视频笔记编辑页的封面上传位为`.upload-btn input[type=file]`；另有视频上传位，不指定目标可能传错。类名需在当前页面确认。
- 封面浮层可能有两层「完成」；以回到主编辑页后缩略图已更新为准。弹层完成仍不等于服务器保存。
- 重新提交前核对标题、正文、定时时间、话题及关联项；提交后查服务端状态。本轮仅修改封面也会重新进入审核，不能当作没有发布影响的操作。

## 小工具包的WASM依赖（2026-09-24订正）

本轮小工具在本地可运行、平台模拟器却加载不出模型，最终定位到容器CSP不允许所用解码器执行WebAssembly。先前归因为中文文件名的结论未得到修复后复验支持，不应作为根因传播。

- 检查全部JS，包括`vendor/`；只扫描入口文件会漏掉依赖中的WASM调用。
- 本轮meshopt压缩模型依赖的解码器被CSP阻止。应按目标容器能力提前处理资源，并在匹配当前容器CSP的环境里自测，不能只以本地页面能打开为准。
- 资源加载失败时记录实际错误；错误提示能辅助定位，但撤掉加载遮罩不等于资源已正确显示。
- 包版本、模型加载、按钮交互都需核对。不要把包地址中的签名、应用ID或具体审核材料上传到共享经验。
