# 不具合データ管理Webアプリ 要件定義書 v1.0

## 1. 目的
社内で発生する不具合情報を一元管理し、迅速な是正対応と分析を可能にする。

## 2. スコープ
- 不具合データの登録・更新・検索・閲覧
- 異常処置報告書PDFの添付・参照
- 日付範囲指定でのCSV出力（分析用）

## 3. 想定ユーザー
- 一般ユーザー: 不具合登録/閲覧
- リーダー: 全件閲覧・編集・CSV出力
- 管理者: ユーザー管理/権限管理

## 4. 機能要件
### 4.1 不具合データ管理
- 新規登録
- 一覧表示（ページング、検索、ソート）
- 詳細表示
- 編集
- 論理削除（管理者のみ）

### 4.2 必須入力項目
- 発生日
- 部品番号
- 対象缶
- 対象数
- 流動数
- 廃却数
- 確認項目
- 測定値
- 顧客への影響

### 4.3 添付ファイル
- 対象: PDFのみ
- 添付先: 不具合レコードごと
- 複数添付: 可
- サイズ上限: 1ファイル20MB（初期値）
- 監査: アップロード/削除操作ログを保存

### 4.4 検索/絞り込み
- 発生日（From/To）
- 部品番号
- 顧客への影響（あり/なし）
- ステータス
- 登録者

### 4.5 CSV出力
- 対象: 検索結果に一致したデータ
- 必須条件: 発生日の開始日・終了日
- 文字コード: UTF-8(BOM付き)
- 改行コード: CRLF
- ファイル名例: defects_YYYYMMDD_YYYYMMDD.csv

### 4.6 監査ログ
- 記録対象: 登録/更新/削除/添付追加/添付削除/CSV出力
- 保存情報: 実行者、日時、操作種別、変更前後データ

## 5. 非機能要件
- 可用性: 平日業務時間帯での安定稼働
- 性能: 1万件規模で一覧初期表示3秒以内目標
- セキュリティ: 社内認証、ロールベースアクセス制御
- 保全: 日次バックアップ（DB/添付ファイル）

## 6. 入力バリデーション
- 対象数/流動数/廃却数は0以上の整数
- 廃却数 <= 対象数
- 発生日は未来日不可（管理者は設定で許可可）
- 必須項目の未入力禁止
- 添付ファイルはPDFのみ

## 7. 推奨技術構成
- フロントエンド: Next.js (TypeScript)
- バックエンド: Next.js Route Handlers
- DB: PostgreSQL
- ORM: Prisma
- 認証: NextAuth（将来SSO連携可能）
- ファイルストレージ: S3互換（AWS S3またはMinIO）

## 8. データモデル（論理）
### defects
- id (UUID)
- occurrence_date (date)
- part_number (varchar)
- target_can (varchar)
- target_count (integer)
- in_process_count (integer)
- discard_count (integer)
- check_item (text)
- measurement_value (varchar)
- customer_impact (text)
- status (varchar)
- created_by (varchar)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp, nullable)

### defect_attachments
- id (UUID)
- defect_id (UUID, FK)
- file_name (varchar)
- object_key (varchar)
- mime_type (varchar)
- file_size (integer)
- uploaded_by (varchar)
- uploaded_at (timestamp)
- deleted_at (timestamp, nullable)

### defect_audit_logs
- id (UUID)
- defect_id (UUID, nullable)
- action (varchar)
- before_json (jsonb)
- after_json (jsonb)
- acted_by (varchar)
- acted_at (timestamp)

## 9. 画面一覧
1. ログイン
2. 不具合一覧
3. 不具合登録
4. 不具合詳細
5. 不具合編集
6. 管理者設定（ユーザー/権限）

## 10. API一覧（MVP）
- GET /api/defects
- POST /api/defects
- GET /api/defects/:id
- PATCH /api/defects/:id
- DELETE /api/defects/:id
- POST /api/defects/:id/attachments
- GET /api/defects/:id/attachments/:attachmentId
- DELETE /api/defects/:id/attachments/:attachmentId
- GET /api/defects/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD

## 11. 開発ロードマップ
### Phase 1（2〜4週間）
- 認証
- 不具合CRUD
- PDF添付
- 一覧検索
- 日付範囲CSV出力

### Phase 2
- 監査ログUI
- 集計ダッシュボード
- 通知機能

### Phase 3
- BI連携
- 承認フロー
- モバイル最適化

## 12. 未確定事項（次回確認）
- 測定値の単位/フォーマット（数値固定か文字列許容か）
- 対象缶のマスタ化要否
- 顧客影響の分類（自由記述/選択式）
- ステータス遷移ルール

## 13. 画面構成詳細（実装開始版）
### 13.1 不具合一覧画面
- ヘッダー: ログインユーザー表示、CSV出力
- 検索条件: 発生日From/To、部品番号、ステータス、顧客影響
- 結果一覧: ソート可能（発生日、部品番号、廃却数）
- 行アクション: 詳細、編集、添付一覧

### 13.2 不具合登録/編集画面
- 基本情報ブロック: 発生日、部品番号、対象缶
- 数量情報ブロック: 対象数、流動数、廃却数
- 品質情報ブロック: 確認項目、測定値、顧客への影響
- 添付ブロック: 異常処置報告書PDF（複数）
- 保存時バリデーション: 必須、数値整合、ファイル形式

### 13.3 不具合詳細画面
- 不具合情報サマリ
- 添付PDFリスト（ダウンロード）
- 監査ログタイムライン

## 14. 実装開始タスク（着手順）
1. プロジェクト初期化（Next.js + TypeScript + Prisma）
2. DBスキーマ作成（defects, defect_attachments, defect_audit_logs）
3. API実装（一覧、登録、更新、CSV出力）
4. 画面実装（一覧、登録、詳細）
5. PDF添付実装（S3互換保存）
6. 監査ログ保存
7. 権限制御（一般/リーダー/管理者）
