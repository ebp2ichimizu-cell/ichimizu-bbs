# いちみず会 掲示板

GitHub Pagesで配信する静的掲示板です。Firebase Authentication（メール・パスワード）とCloud Firestoreを使用します。添付の赤・金のBBSロゴを採用し、いちみず会ポータルのフォント・背景・カードの構成に合わせています。

## 実装済み

- 公開投稿一覧、カテゴリー絞り込み、投稿詳細、返信一覧・返信フォーム。
- 投稿一覧20件、返信50件ずつの追加読み込み。
- 共通アカウントでのログイン・ログアウト。ブラウザーのセッション単位でログインを保持。
- 任意のニックネーム。ニックネーム30文字、タイトル100文字、本文5000文字、返信2000文字まで。
- 空白のみの入力、未登録カテゴリー、余分な項目を拒否。投稿日時はFirestoreのサーバー時刻。
- 投稿内容は`textContent`で表示。HTML・Markdown・本文内のURLは実行・自動リンク化しません。
- 投稿・返信の作成だけを許可するルール案。共通アカウントによる更新・削除・カテゴリー変更は拒否。
- スマートフォン対応、フォームラベル、キーボード操作、通信エラーと再試行。

## Firebaseの設定と残作業

1. [Firebase Console](https://console.firebase.google.com/)で`ichimizu-bbs`を開き、プロジェクト設定 → 全般 → Webアプリ`ichimizu-bbs-web`から設定を取得します。このWebアプリとappIdはConsoleで確認できたため設定済みです。
2. `js/config.js`の`apiKey`・`authDomain`はユーザー提供値を反映済みです。`projectId`は`ichimizu-bbs`、appIdも設定済みです。Webアプリの公開設定であり、パスワードやサービスアカウント秘密鍵は一切入れません。参考：[Firebase Web設定](https://firebase.google.com/docs/web/setup)。
3. Authentication → Sign-in methodで「メール／パスワード」を有効にします。ユーザー一覧で共通アカウントのUIDが`7kewpVCwEMeWkxmzXEK6BRUsxXl1`であることを確認してください。メール・パスワードは利用者へ別途案内し、サイトのログイン画面で入力します。
4. Authentication → 設定 → 承認済みドメインに、GitHub Pagesの実際の配信ドメインを登録します。カスタムドメインを使用する場合はそのドメインも登録してください。
5. Firestoreの`(default)`データベースを用意します。現在のルールを保存し、[ルール変更案・管理者削除設計](security/README.md)を確認してから適用してください。**現在のルールはまだ取得できておらず、変更案は未適用です。**
6. Firestore Consoleで`bbsCategories`コレクションにカテゴリーを登録します。名称は会で決めたものを使用してください。ドキュメントIDは英数字・`_`・`-`の1〜80文字、各ドキュメントには`name`（文字列、1〜60文字）、`active`（boolean: true）、`order`（数値）を設定します。カテゴリーは管理者がConsoleで登録します。共通アカウントからは作成・変更できません。取得対象は最大50件です。
7. [インデックス定義](security/firestore.indexes.json)に従い、`bbsPosts`のコレクションスコープに`categoryId`昇順／`createdAt`降順の複合インデックスを追加します。既存インデックスを置き換えず追加してください。
8. 本番で匿名閲覧、共通アカウントの投稿・返信、別UIDからの投稿拒否、共通UIDからの更新・削除拒否を確認します。

設定が揃うまでは準備中画面を表示し、Firebaseへの投稿は行いません。カテゴリーを未登録の場合も投稿できません。新規ユーザー登録やパスワード再設定は画面に用意していません。

## GitHub Pages

`.github/workflows/pages.yml`はmainへのpushでテスト後に静的ファイルだけを配信します。GitHub → Settings → Pages → Build and deployment → Sourceを「GitHub Actions」に設定してください。設定後、Actionsから「Publish bulletin board」を実行するかmainへpushします。参考：[GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

詳細画面のURLはハッシュ形式なので、GitHub Pagesで直接開いてもサーバー側のルーティング設定は不要です。研究HUB・海外EBPナビ・ポータルのファイルには変更を加えていません。

## 確認

`node --test tests/validation.test.js`で入力検証を実行できます。ブラウザー確認結果と未完了項目は[確認結果](VERIFICATION.md)に記載しています。
