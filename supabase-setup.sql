-- ============================================
-- StoryFarm 데이터 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================

-- 1. 수입 테이블
CREATE TABLE IF NOT EXISTS income (
  id text PRIMARY KEY,
  "createdAt" text,
  date text,
  "desc" text DEFAULT '',
  biz text DEFAULT '',
  type text DEFAULT '',
  amount bigint DEFAULT 0,
  confirmed boolean DEFAULT false,
  counterparty text DEFAULT ''
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "income_public" ON income;
CREATE POLICY "income_public" ON income FOR ALL USING (true) WITH CHECK (true);

-- 2. 지출 테이블
CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  date text,
  category text DEFAULT '',
  "desc" text DEFAULT '',
  amount bigint DEFAULT 0,
  method text DEFAULT '',
  biz text DEFAULT ''
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_public" ON expenses;
CREATE POLICY "expenses_public" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- 3. 채무 테이블
CREATE TABLE IF NOT EXISTS debts (
  id text PRIMARY KEY,
  name text DEFAULT '',
  "totalLoan" bigint DEFAULT 0,
  "paidAmount" bigint DEFAULT 0,
  balance bigint DEFAULT 0,
  rate real DEFAULT 0,
  monthly bigint DEFAULT 0,
  "payDay" int DEFAULT 1,
  "dueDate" text DEFAULT '',
  "lastPaid" text DEFAULT '',
  "lastAmount" bigint DEFAULT 0,
  type text DEFAULT ''
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_public" ON debts;
CREATE POLICY "debts_public" ON debts FOR ALL USING (true) WITH CHECK (true);
