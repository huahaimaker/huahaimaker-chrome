// 首装欢迎页：实时探测本地端，连上就变绿。
// 从商店装好扩展的人，以前落地后什么引导都看不到——终端那条路的引导页他根本没见过。

const copy = (btnId, srcId) => {
  const btn = document.getElementById(btnId);
  btn.onclick = async () => {
    try { await navigator.clipboard.writeText(document.getElementById(srcId).textContent); btn.textContent = '已复制'; } catch { btn.textContent = '请手动复制'; }
    setTimeout(() => { btn.textContent = '复制'; }, 1600);
  };
};
copy('copy', 'cmd');
copy('copy2', 'say');

async function poll() {
  const r = await chrome.runtime.sendMessage({ __hcPopup: 'status' }).catch(() => null);
  if (r?.connected) {
    document.getElementById('step2').classList.add('done');
    document.querySelector('#step2 .n').textContent = '✓';
    document.getElementById('live').classList.add('ok');
    document.getElementById('livetxt').textContent = `本地端已连上（v${r.bridge || '?'}）。可以去和 agent 说话了。`;
    return;
  }
  setTimeout(poll, 2000);
}
poll();
