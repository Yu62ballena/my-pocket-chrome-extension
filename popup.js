// popup.js - 自動保存版

document.addEventListener("DOMContentLoaded", async function () {
  const status = document.getElementById("status");
  const pageTitle = document.getElementById("pageTitle");

  // 現在のタブ情報を取得して即座に保存
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // ページタイトルを表示
    pageTitle.textContent = tab.title || "タイトルなし";

    // 即座に保存処理を開始
    await saveCurrentPage(tab);
  } catch (error) {
    console.error("タブ情報取得エラー:", error);
    showStatus("記事の保存に失敗しました", "error");
  }
});

// 現在のページを保存する関数
async function saveCurrentPage(tab) {
  try {
    // Next.jsアプリのAPIエンドポイントに送信
    const response = await fetch("http://localhost:3000/api/save-article", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showStatus("保存しました！", "success");
    } else {
      throw new Error(result.error || "保存に失敗しました");
    }
  } catch (error) {
    console.error("保存エラー:", error);
    showStatus(error.message || "保存に失敗しました", "error");
  }
}

// ステータスメッセージを表示する関数
function showStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`;
}
