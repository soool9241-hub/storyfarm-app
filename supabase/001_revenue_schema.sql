-- ============================================================
-- 달팽이아지트 펜션 매출 자동 계산 스키마
-- ============================================================

-- 1. bus_fee 컬럼 추가 (팀마다 금액이 다르므로 수동 입력)
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS bus_fee integer DEFAULT 0;

-- 2. 매출 자동 계산 뷰 생성
-- 요금 기준:
--   기본요금: 15인 기준 700,000원
--   추가인원: 1인당 10,000원 (15인 초과분)
--   바베큐: 1세트당 30,000원
--   저녁식사: 1인당 10,000원
--   버스: 팀별 지정 금액 (bus_fee)
DROP VIEW IF EXISTS v_reservation_revenue;

CREATE VIEW v_reservation_revenue AS
SELECT
  r.id,
  r.guest_name,
  r.reservation_date,
  r.checkout_date,
  r.stay_nights,
  r.guest_count,
  r.status,
  r.purpose,
  r.referral_source,
  r.reservation_year,
  r.reservation_month,
  -- 기본 요금 (15인 기준 70만원 x 박수)
  (700000 * COALESCE(r.stay_nights, 1)) AS base_fee,
  -- 추가 인원 요금
  (GREATEST(COALESCE(r.guest_count, 0) - 15, 0) * 10000 * COALESCE(r.stay_nights, 1)) AS extra_guest_fee,
  -- 바베큐 요금
  (COALESCE(r.bbq_count, 0) * 30000) AS bbq_fee,
  -- 저녁식사 요금
  (COALESCE(r.dinner_count, 0) * 10000) AS dinner_fee,
  -- 버스 요금
  COALESCE(r.bus_fee, 0) AS bus_fee,
  -- 총 매출
  (
    (700000 * COALESCE(r.stay_nights, 1))
    + (GREATEST(COALESCE(r.guest_count, 0) - 15, 0) * 10000 * COALESCE(r.stay_nights, 1))
    + (COALESCE(r.bbq_count, 0) * 30000)
    + (COALESCE(r.dinner_count, 0) * 10000)
    + COALESCE(r.bus_fee, 0)
  ) AS total_revenue,
  r.bbq_count,
  r.dinner_count,
  r.extra_guests,
  r.bus_requested,
  r.program_type,
  r.created_at
FROM reservations r;

-- 3. 월별 매출 합산 뷰
DROP VIEW IF EXISTS v_monthly_revenue;

CREATE VIEW v_monthly_revenue AS
SELECT
  reservation_year,
  reservation_month,
  COUNT(*) AS reservation_count,
  SUM(guest_count) AS total_guests,
  SUM(700000 * COALESCE(stay_nights, 1)) AS total_base_fee,
  SUM(GREATEST(COALESCE(guest_count, 0) - 15, 0) * 10000 * COALESCE(stay_nights, 1)) AS total_extra_guest_fee,
  SUM(COALESCE(bbq_count, 0) * 30000) AS total_bbq_fee,
  SUM(COALESCE(dinner_count, 0) * 10000) AS total_dinner_fee,
  SUM(COALESCE(bus_fee, 0)) AS total_bus_fee,
  SUM(
    (700000 * COALESCE(stay_nights, 1))
    + (GREATEST(COALESCE(guest_count, 0) - 15, 0) * 10000 * COALESCE(stay_nights, 1))
    + (COALESCE(bbq_count, 0) * 30000)
    + (COALESCE(dinner_count, 0) * 10000)
    + COALESCE(bus_fee, 0)
  ) AS total_revenue
FROM reservations
WHERE status != 'cancelled'
GROUP BY reservation_year, reservation_month
ORDER BY reservation_year DESC, reservation_month DESC;

-- 4. RLS 정책 - anon 사용자가 뷰를 읽을 수 있도록 설정
-- (뷰는 기본적으로 definer의 권한으로 실행되므로,
--  reservations 테이블에 SELECT 정책이 필요)

-- reservations 테이블에 anon 읽기 권한 추가
DO $$
BEGIN
  -- RLS가 이미 활성화되어 있는지 확인 후 정책 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reservations' AND policyname = 'anon_read_reservations'
  ) THEN
    CREATE POLICY anon_read_reservations ON reservations
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- 뷰에 대한 SELECT 권한 부여
GRANT SELECT ON v_reservation_revenue TO anon;
GRANT SELECT ON v_monthly_revenue TO anon;
