-- =====================================================
-- StoryFarm 재무관리 앱 — 전체 데이터베이스 스키마
-- Supabase Dashboard > SQL Editor 에서 실행
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 0. 기존 정책 충돌 방지 (이미 있으면 삭제)
-- ─────────────────────────────────────────────────────
DO $$ BEGIN
  -- income
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'income_public') THEN
    DROP POLICY "income_public" ON income;
  END IF;
  -- expenses
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_public') THEN
    DROP POLICY "expenses_public" ON expenses;
  END IF;
  -- debts
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'debts_public') THEN
    DROP POLICY "debts_public" ON debts;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────
-- 1. 수입 (Income)
--    공방 매출 + 펜션 수기 매출 + 기타 수입
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income (
  id            text PRIMARY KEY,
  "createdAt"   text,                          -- 작성일 (YYYY-MM-DD)
  date          text,                          -- 거래일
  "desc"        text DEFAULT '',               -- 내용
  biz           text DEFAULT '',               -- 사업구분: 공방/펜션/기타
  type          text DEFAULT '',               -- 유형: CNC가공/레이저/수업·강의/장비대여/객실/공간대여
  amount        bigint DEFAULT 0,              -- 금액 (원)
  confirmed     boolean DEFAULT false,         -- 입금 확인
  counterparty  text DEFAULT '',               -- 거래처
  tax_invoice   boolean DEFAULT false,         -- 세금계산서 발행 여부
  tax_amount    bigint DEFAULT 0,              -- 부가세액
  receipt_url   text DEFAULT '',               -- 증빙 이미지 URL
  note          text DEFAULT ''                -- 비고
);

CREATE INDEX IF NOT EXISTS idx_income_date ON income (date DESC);
CREATE INDEX IF NOT EXISTS idx_income_biz ON income (biz);
CREATE INDEX IF NOT EXISTS idx_income_created ON income ("createdAt" DESC);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_public" ON income FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 2. 지출 (Expenses)
--    사업 경비, 대출상환, 생활비 등
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id            text PRIMARY KEY,
  date          text,                          -- 지출일
  category      text DEFAULT '',               -- 카테고리: 재료비/인건비/임대료/공과금/장비/마케팅/세금/식대·교통/대출상환/운영비/기타
  "desc"        text DEFAULT '',               -- 내용
  amount        bigint DEFAULT 0,              -- 금액 (원)
  method        text DEFAULT '',               -- 결제수단: 국민카드/신한카드/계좌이체/현금
  biz           text DEFAULT '',               -- 사업구분: 공방/펜션/개인/공통
  tax_deductible boolean DEFAULT true,         -- 경비 인정 여부
  tax_invoice   boolean DEFAULT false,         -- 세금계산서 수취
  receipt_url   text DEFAULT '',               -- 증빙 이미지 URL
  note          text DEFAULT ''                -- 비고
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_biz ON expenses (biz);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_public" ON expenses FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 3. 채무·대출 (Debts)
--    은행대출, 카드론, 개인차입 등
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id            text PRIMARY KEY,
  name          text DEFAULT '',               -- 채무명 (예: OK저축은행)
  type          text DEFAULT '',               -- 유형: 대출/카드론/개인/기타
  "totalLoan"   bigint DEFAULT 0,              -- 총 대출 원금
  "paidAmount"  bigint DEFAULT 0,              -- 상환 누계
  balance       bigint DEFAULT 0,              -- 잔액 (자동계산: totalLoan - paidAmount)
  rate          real DEFAULT 0,                -- 연이율 (%)
  monthly       bigint DEFAULT 0,              -- 월 상환액
  "payDay"      int DEFAULT 1,                 -- 납부일 (1~31)
  "dueDate"     text DEFAULT '',               -- 만기일
  "lastPaid"    text DEFAULT '',               -- 최근 납부일
  "lastAmount"  bigint DEFAULT 0,              -- 최근 납부액
  creditor      text DEFAULT '',               -- 채권자/금융기관
  collateral    text DEFAULT '',               -- 담보 정보
  is_active     boolean DEFAULT true,          -- 활성 여부
  note          text DEFAULT ''                -- 비고
);

CREATE INDEX IF NOT EXISTS idx_debts_type ON debts (type);
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts (is_active);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debts_public" ON debts FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 4. 상환 이력 (Debt Payments)
--    채무별 상환 기록 추적
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debt_payments (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  debt_id       text NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  date          text NOT NULL,                 -- 납부일
  amount        bigint DEFAULT 0,              -- 납부액
  principal     bigint DEFAULT 0,              -- 원금 상환분
  interest      bigint DEFAULT 0,              -- 이자분
  method        text DEFAULT '',               -- 납부방법
  note          text DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments (date DESC);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_payments_public" ON debt_payments FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 5. 자산·장비 (Assets)
--    CNC머신, 레이저커터 등 감가상각 추적
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id            text PRIMARY KEY,
  name          text NOT NULL,                 -- 자산명
  model         text DEFAULT '',               -- 모델명
  category      text DEFAULT '장비',            -- 분류: 장비/차량/부동산/기타
  acquired      text,                          -- 취득일 (YYYY-MM-DD)
  cost          bigint DEFAULT 0,              -- 취득원가
  life          int DEFAULT 60,                -- 내용연수 (개월)
  method        text DEFAULT '정액법',          -- 감가상각: 정액법/정률법
  salvage_rate  real DEFAULT 0.1,              -- 잔존가치율 (0.1 = 10%)
  "accDep"      bigint DEFAULT 0,              -- 감가상각 누계
  location      text DEFAULT '',               -- 설치 위치
  serial_number text DEFAULT '',               -- 시리얼 번호
  is_active     boolean DEFAULT true,
  note          text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (category);
CREATE INDEX IF NOT EXISTS idx_assets_active ON assets (is_active);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_public" ON assets FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 6. 유지보수 이력 (Maintenance)
--    장비 수리·점검 기록
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_id      text REFERENCES assets(id) ON DELETE SET NULL,
  asset_name    text DEFAULT '',               -- 장비명 (조회 편의)
  date          text NOT NULL,                 -- 정비일
  "desc"        text DEFAULT '',               -- 정비 내용
  cost          bigint DEFAULT 0,              -- 비용
  vendor        text DEFAULT '',               -- 업체
  type          text DEFAULT '정기점검',        -- 유형: 정기점검/수리/부품교체/기타
  next_date     text DEFAULT '',               -- 다음 점검 예정일
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance (asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance (date DESC);

ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_public" ON maintenance FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 7. 예산 (Budgets)
--    카테고리별 월 예산 관리
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year          int NOT NULL,                  -- 연도
  month         int NOT NULL,                  -- 월 (1~12), 0=연간
  category      text NOT NULL,                 -- 카테고리 (지출 카테고리와 동일)
  biz           text DEFAULT '공통',            -- 사업구분
  amount        bigint DEFAULT 0,              -- 예산액
  note          text DEFAULT '',
  UNIQUE(year, month, category, biz)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_public" ON budgets FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 8. 수주·주문 (Orders)
--    BEP 분석용 개별 수주 원가·마진 관리
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            text PRIMARY KEY,
  order_no      text DEFAULT '',               -- 주문번호 (예: CNC-031)
  date          text,                          -- 수주일
  customer      text DEFAULT '',               -- 거래처
  "desc"        text DEFAULT '',               -- 품명·내용
  biz           text DEFAULT '공방',            -- 사업구분
  revenue       bigint DEFAULT 0,              -- 매출액
  material_cost bigint DEFAULT 0,              -- 재료비
  labor_cost    bigint DEFAULT 0,              -- 인건비
  overhead_cost bigint DEFAULT 0,              -- 경비
  total_cost    bigint DEFAULT 0,              -- 총 원가
  margin_rate   real DEFAULT 0,                -- 마진율 (%)
  status        text DEFAULT '진행중',          -- 상태: 견적/진행중/완료/취소
  due_date      text DEFAULT '',               -- 납기일
  completed_at  text DEFAULT '',               -- 완료일
  note          text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_public" ON orders FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 9. 현금흐름 예정 (Cash Flow Schedule)
--    고정 수입/지출 스케줄 (급여, 임대료, 대출 등)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cashflow_schedule (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          text NOT NULL,                 -- 항목명 (예: 공방 월세, 급여)
  type          text NOT NULL,                 -- income / expense
  amount        bigint DEFAULT 0,              -- 금액
  day_of_month  int DEFAULT 1,                 -- 매월 발생일 (1~31)
  category      text DEFAULT '',               -- 카테고리
  biz           text DEFAULT '공통',            -- 사업구분
  is_recurring  boolean DEFAULT true,          -- 반복 여부
  start_date    text DEFAULT '',               -- 시작일
  end_date      text DEFAULT '',               -- 종료일 (비어있으면 무기한)
  note          text DEFAULT ''
);

ALTER TABLE cashflow_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashflow_schedule_public" ON cashflow_schedule FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 10. BEP 설정 (Break-Even Point Config)
--     사업부별 고정비·변동비율 설정
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bep_config (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  biz           text NOT NULL UNIQUE,          -- 사업구분: 공방/펜션
  fixed_rent    bigint DEFAULT 0,              -- 고정비: 임대료
  fixed_labor   bigint DEFAULT 0,              -- 고정비: 인건비
  fixed_interest bigint DEFAULT 0,             -- 고정비: 이자
  fixed_depreciation bigint DEFAULT 0,         -- 고정비: 감가상각
  fixed_other   bigint DEFAULT 0,              -- 고정비: 기타
  variable_rate real DEFAULT 0,                -- 변동비율 (0~1, 예: 0.307 = 30.7%)
  note          text DEFAULT ''
);

ALTER TABLE bep_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bep_config_public" ON bep_config FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 11. 세금 기록 (Tax Records)
--     부가세·종합소득세 신고 기록
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_records (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year          int NOT NULL,                  -- 귀속 연도
  period        text DEFAULT '',               -- 기간 (예: '1기', '2기', '연간')
  type          text NOT NULL,                 -- 세금 종류: 부가세/종합소득세/원천세/4대보험
  sales_tax     bigint DEFAULT 0,              -- 매출세액
  purchase_tax  bigint DEFAULT 0,              -- 매입세액
  taxable_income bigint DEFAULT 0,             -- 과세표준
  tax_rate      real DEFAULT 0,                -- 세율 (%)
  tax_amount    bigint DEFAULT 0,              -- 납부세액
  filed_at      text DEFAULT '',               -- 신고일
  due_date      text DEFAULT '',               -- 납부기한
  status        text DEFAULT '미신고',          -- 상태: 미신고/신고완료/납부완료
  note          text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tax_year ON tax_records (year DESC);

ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_records_public" ON tax_records FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 12. 앱 설정 (Settings)
--     API 키, 앱 환경설정 등 키-값 저장소
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key           text PRIMARY KEY,
  value         text DEFAULT '',
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_public" ON app_settings FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────
-- 13. AI 대화 이력 (AI Chat History)
--     인사이트 대화 기록 (디바이스 간 공유)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chats (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role          text NOT NULL,                 -- user / assistant
  content       text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chats_time ON ai_chats (created_at DESC);

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_chats_public" ON ai_chats FOR ALL USING (true) WITH CHECK (true);


-- ═════════════════════════════════════════════════════
-- 뷰 (Views) — 대시보드·보고서용 집계
-- ═════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- V1. 월별 수입 요약
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_income_monthly AS
SELECT
  EXTRACT(YEAR FROM date::date)::int   AS year,
  EXTRACT(MONTH FROM date::date)::int  AS month,
  biz,
  COUNT(*)::int                        AS count,
  SUM(amount)                          AS total_amount,
  SUM(CASE WHEN confirmed THEN amount ELSE 0 END) AS confirmed_amount
FROM income
WHERE date IS NOT NULL AND date != ''
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2 DESC;

-- ─────────────────────────────────────────────────────
-- V2. 월별 지출 요약
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_expense_monthly AS
SELECT
  EXTRACT(YEAR FROM date::date)::int   AS year,
  EXTRACT(MONTH FROM date::date)::int  AS month,
  category,
  biz,
  COUNT(*)::int                        AS count,
  SUM(amount)                          AS total_amount
FROM expenses
WHERE date IS NOT NULL AND date != ''
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 2 DESC;

-- ─────────────────────────────────────────────────────
-- V3. 카테고리별 지출 vs 예산 (당월)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  b.category,
  b.biz,
  b.amount AS budget,
  COALESCE(e.spent, 0) AS spent,
  CASE WHEN b.amount > 0
    THEN ROUND(COALESCE(e.spent, 0)::numeric / b.amount * 100, 1)
    ELSE 0
  END AS usage_pct
FROM budgets b
LEFT JOIN (
  SELECT category, biz, SUM(amount) AS spent
  FROM expenses
  WHERE EXTRACT(YEAR FROM date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM date::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  GROUP BY category, biz
) e ON b.category = e.category AND b.biz = e.biz
WHERE b.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
  AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- ─────────────────────────────────────────────────────
-- V4. 채무 요약
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_debt_summary AS
SELECT
  COUNT(*)::int                                      AS total_count,
  SUM("totalLoan")                                   AS total_loan,
  SUM("paidAmount")                                  AS total_paid,
  SUM(balance)                                       AS total_balance,
  SUM(monthly)                                       AS monthly_payment,
  ROUND(
    SUM(balance * rate / 100 / 12)::numeric, 0
  )                                                  AS monthly_interest,
  CASE WHEN SUM("totalLoan") > 0
    THEN ROUND(SUM("paidAmount")::numeric / SUM("totalLoan") * 100, 1)
    ELSE 0
  END                                                AS repayment_rate
FROM debts
WHERE is_active = true;

-- ─────────────────────────────────────────────────────
-- V5. 자산 감가상각 현황
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_asset_summary AS
SELECT
  id,
  name,
  model,
  category,
  cost,
  "accDep",
  cost - "accDep"                                    AS book_value,
  life,
  CASE WHEN acquired IS NOT NULL AND acquired != '' THEN
    LEAST(
      ROUND(
        EXTRACT(EPOCH FROM (CURRENT_DATE - acquired::date)) / 86400 / 30
      )::int,
      life
    )
  ELSE 0 END                                        AS months_used,
  CASE WHEN life > 0 THEN
    ROUND(
      LEAST(
        EXTRACT(EPOCH FROM (CURRENT_DATE - acquired::date)) / 86400 / 30,
        life
      )::numeric / life * 100, 1
    )
  ELSE 0 END                                        AS life_pct
FROM assets
WHERE is_active = true;

-- ─────────────────────────────────────────────────────
-- V6. 대시보드 KPI (핵심 지표)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_kpi AS
SELECT
  -- 당월 수입
  (SELECT COALESCE(SUM(amount), 0) FROM income
   WHERE EXTRACT(YEAR FROM date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
     AND EXTRACT(MONTH FROM date::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  ) AS monthly_income,

  -- 당월 펜션 매출
  (SELECT COALESCE(SUM(total_revenue), 0) FROM v_reservation_revenue
   WHERE EXTRACT(YEAR FROM reservation_date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
     AND EXTRACT(MONTH FROM reservation_date::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  ) AS monthly_pension,

  -- 당월 지출
  (SELECT COALESCE(SUM(amount), 0) FROM expenses
   WHERE EXTRACT(YEAR FROM date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
     AND EXTRACT(MONTH FROM date::date) = EXTRACT(MONTH FROM CURRENT_DATE)
  ) AS monthly_expense,

  -- 총 채무 잔액
  (SELECT COALESCE(SUM(balance), 0) FROM debts WHERE is_active = true
  ) AS total_debt,

  -- 총 자산 장부가
  (SELECT COALESCE(SUM(cost - "accDep"), 0) FROM assets WHERE is_active = true
  ) AS total_asset_book_value,

  -- 월 이자 부담
  (SELECT COALESCE(ROUND(SUM(balance * rate / 100 / 12)::numeric, 0), 0)
   FROM debts WHERE is_active = true
  ) AS monthly_interest;

-- ─────────────────────────────────────────────────────
-- V7. 연간 월별 손익 추이 (연간보고서용)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_yearly_pnl AS
SELECT
  m.year,
  m.month,
  COALESCE(i.income, 0)   AS income,
  COALESCE(e.expense, 0)  AS expense,
  COALESCE(i.income, 0) - COALESCE(e.expense, 0) AS net_profit
FROM (
  SELECT DISTINCT
    EXTRACT(YEAR FROM date::date)::int AS year,
    EXTRACT(MONTH FROM date::date)::int AS month
  FROM income WHERE date IS NOT NULL AND date != ''
  UNION
  SELECT DISTINCT
    EXTRACT(YEAR FROM date::date)::int,
    EXTRACT(MONTH FROM date::date)::int
  FROM expenses WHERE date IS NOT NULL AND date != ''
) m
LEFT JOIN (
  SELECT EXTRACT(YEAR FROM date::date)::int AS year,
         EXTRACT(MONTH FROM date::date)::int AS month,
         SUM(amount) AS income
  FROM income WHERE date IS NOT NULL AND date != ''
  GROUP BY 1, 2
) i ON m.year = i.year AND m.month = i.month
LEFT JOIN (
  SELECT EXTRACT(YEAR FROM date::date)::int AS year,
         EXTRACT(MONTH FROM date::date)::int AS month,
         SUM(amount) AS expense
  FROM expenses WHERE date IS NOT NULL AND date != ''
  GROUP BY 1, 2
) e ON m.year = e.year AND m.month = e.month
ORDER BY m.year DESC, m.month DESC;

-- ─────────────────────────────────────────────────────
-- V8. TOP 거래처 매출 랭킹
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_top_customers AS
SELECT
  counterparty,
  biz,
  COUNT(*)::int AS order_count,
  SUM(amount) AS total_revenue,
  ROUND(AVG(amount)::numeric, 0) AS avg_revenue
FROM income
WHERE counterparty IS NOT NULL AND counterparty != ''
GROUP BY counterparty, biz
ORDER BY total_revenue DESC;


-- ═════════════════════════════════════════════════════
-- 초기 데이터 삽입 (BEP 설정, 예산 등)
-- ═════════════════════════════════════════════════════

-- BEP 기본 설정
INSERT INTO bep_config (id, biz, fixed_rent, fixed_labor, fixed_interest, fixed_depreciation, fixed_other, variable_rate)
VALUES
  ('bep_workshop', '공방', 800000, 2000000, 500000, 431250, 0, 0.307),
  ('bep_pension',  '펜션', 0, 0, 200000, 0, 0, 0.10)
ON CONFLICT (biz) DO NOTHING;

-- 2026년 3월 예산 (샘플)
INSERT INTO budgets (year, month, category, biz, amount) VALUES
  (2026, 3, '재료비',     '공방', 2000000),
  (2026, 3, '인건비',     '공방', 2000000),
  (2026, 3, '임대료',     '공방', 800000),
  (2026, 3, '공과금',     '공통', 400000),
  (2026, 3, '식대·교통',  '공통', 300000),
  (2026, 3, '마케팅',     '공통', 200000),
  (2026, 3, '운영비',     '공통', 200000)
ON CONFLICT (year, month, category, biz) DO NOTHING;

-- 고정 현금흐름 스케줄
INSERT INTO cashflow_schedule (id, name, type, amount, day_of_month, category, biz) VALUES
  ('cf_rent',      '공방 월세',       'expense', 800000,  1,  '임대료',   '공방'),
  ('cf_utility',   '공과금 (전기·수도)', 'expense', 300000, 10, '공과금',   '공통'),
  ('cf_internet',  '인터넷·전화',      'expense', 55000,   3,  '운영비',   '공통'),
  ('cf_salary',    '급여',            'expense', 2000000, 25, '인건비',   '공방'),
  ('cf_insurance', '4대보험',          'expense', 250000,  10, '세금',     '공통')
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════
-- 함수: 대시보드 요약 새로고침
-- ═════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_financial_summary(p_year int, p_month int)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'income',  (SELECT COALESCE(SUM(amount), 0) FROM income
                WHERE EXTRACT(YEAR FROM date::date) = p_year
                  AND EXTRACT(MONTH FROM date::date) = p_month),
    'pension', (SELECT COALESCE(SUM(total_revenue), 0) FROM v_reservation_revenue
                WHERE EXTRACT(YEAR FROM reservation_date::date) = p_year
                  AND EXTRACT(MONTH FROM reservation_date::date) = p_month),
    'expense', (SELECT COALESCE(SUM(amount), 0) FROM expenses
                WHERE EXTRACT(YEAR FROM date::date) = p_year
                  AND EXTRACT(MONTH FROM date::date) = p_month),
    'debt_balance',   (SELECT COALESCE(SUM(balance), 0) FROM debts WHERE is_active = true),
    'monthly_payment',(SELECT COALESCE(SUM(monthly), 0) FROM debts WHERE is_active = true),
    'repayment_rate', (SELECT CASE WHEN SUM("totalLoan") > 0
                        THEN ROUND(SUM("paidAmount")::numeric / SUM("totalLoan") * 100, 1)
                        ELSE 0 END FROM debts WHERE is_active = true)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ═════════════════════════════════════════════════════
-- 완료!
-- ═════════════════════════════════════════════════════
-- 생성된 테이블 (13개):
--   income, expenses, debts, debt_payments,
--   assets, maintenance, budgets, orders,
--   cashflow_schedule, bep_config, tax_records,
--   app_settings, ai_chats
--
-- 생성된 뷰 (8개):
--   v_income_monthly, v_expense_monthly,
--   v_budget_vs_actual, v_debt_summary,
--   v_asset_summary, v_dashboard_kpi,
--   v_yearly_pnl, v_top_customers
--
-- 생성된 함수 (1개):
--   get_financial_summary(year, month)
-- ═════════════════════════════════════════════════════
