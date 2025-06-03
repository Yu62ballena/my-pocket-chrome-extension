// popup.js - シンプル認証版

document.addEventListener("DOMContentLoaded", async function () {
  const status = document.getElementById("status");
  const pageTitle = document.getElementById("pageTitle");

  try {
    // 現在のタブ情報を取得
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // ページタイトルを表示
    pageTitle.textContent = tab.title || "タイトルなし";

    // 認証状態をチェック
    const isAuthenticated = await checkAuthStatus();

    if (!isAuthenticated) {
      // 未認証の場合はログインを促す
      showLoginRequired();
      return;
    }

    // 認証済みの場合は保存処理を開始
    await saveCurrentPage(tab);
  } catch (error) {
    console.error("初期化エラー:", error);
    showStatus("エラーが発生しました", "error");
  }
});

// 認証状態をチェックする関数
async function checkAuthStatus() {
  try {
    // Webアプリのドメインからクッキーを取得
    const cookies = await chrome.cookies.getAll({
      url: API_BASE_URL,
    });

    // セッションクッキーを文字列に変換
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // WebアプリのAPIを叩いて認証状態を確認
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: "GET",
      headers: {
        Cookie: cookieString,
      },
      credentials: "include",
    });

    return response.ok;
  } catch (error) {
    console.error("認証状態チェックエラー:", error);
    return false;
  }
}

// ログインが必要な場合の表示
function showLoginRequired() {
  const status = document.getElementById("status");
  status.innerHTML = `
    <div class="login-required">
      <p>記事を保存するにはログインが必要です</p>
      <button id="loginBtn" class="login-btn">ログインする</button>
    </div>
  `;
  status.className = "status login";

  // ログインボタンのイベントリスナー
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
}

// ログイン処理
async function handleLogin() {
  try {
    showStatus("ログインページを開いています...", "loading");

    // Webアプリのログインページを新しいタブで開く
    const loginUrl = `${API_BASE_URL}/signin?from=extension`;
    const loginTab = await chrome.tabs.create({ url: loginUrl });

    // ログイン完了を待つためのポーリング
    await waitForLogin(loginTab.id);
  } catch (error) {
    console.error("ログインエラー:", error);
    showStatus("ログインに失敗しました", "error");
  }
}

// ログイン完了を待つ関数
async function waitForLogin(loginTabId) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 120; // 最大2分待機

    const checkInterval = setInterval(async () => {
      attempts++;

      try {
        // 認証状態をチェック
        const isAuthenticated = await checkAuthStatus();

        if (isAuthenticated) {
          clearInterval(checkInterval);

          // ログインタブを閉じる
          try {
            await chrome.tabs.remove(loginTabId);
          } catch (e) {
            // タブが既に閉じられている場合は無視
          }

          showStatus("ログインが完了しました！", "success");

          // 現在のページを保存
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          await saveCurrentPage(tab);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          showStatus("ログインがタイムアウトしました", "error");
          reject(new Error("Login timeout"));
        }
      } catch (error) {
        clearInterval(checkInterval);
        reject(error);
      }
    }, 1000); // 1秒ごとにチェック
  });
}

// 現在のページを保存する関数
async function saveCurrentPage(tab) {
  try {
    showStatus("記事を保存中...", "loading");

    // Webアプリのドメインからクッキーを取得
    const cookies = await chrome.cookies.getAll({
      url: API_BASE_URL,
    });

    // セッションクッキーを文字列に変換
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // 既存のAPIエンドポイントに送信（セッション認証）
    const response = await fetch(`${API_BASE_URL}/api/save-article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieString,
      },
      credentials: "include",
      body: JSON.stringify({
        url: tab.url,
        title: tab.title,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showStatus("保存しました！", "success");

      // 3秒後にポップアップを閉じる
      setTimeout(() => {
        window.close();
      }, 3000);
    } else {
      // 認証エラーの場合
      if (response.status === 401) {
        showLoginRequired();
      } else {
        throw new Error(result.error || "保存に失敗しました");
      }
    }
  } catch (error) {
    console.error("保存エラー:", error);
    showStatus(error.message || "保存に失敗しました", "error");
  }
}

// ステータスメッセージを表示する関数
function showStatus(message, type) {
  const status = document.getElementById("status");
  status.innerHTML = message;
  status.className = `status ${type}`;
}
