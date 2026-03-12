import { useState, useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../lib/supabase'

export function useCloudList<T extends { id: string }>(
  table: string,
  localKey: string,
  loadLocal: () => T[]
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [list, setList] = useState<T[]>(loadLocal)
  const [syncing, setSyncing] = useState(false)
  const syncRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const skipSync = useRef(false)

  // Supabase에서 로드 (마운트 시)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from(table).select('*')
        if (cancelled) return
        if (!error && data) {
          if (data.length > 0) {
            skipSync.current = true
            setList(data as T[])
          } else {
            // Supabase 비어있음 → localStorage 데이터 마이그레이션
            const saved = localStorage.getItem(localKey)
            if (saved) {
              const items = JSON.parse(saved) as T[]
              if (items.length > 0) {
                await supabase.from(table).upsert(items)
              }
            }
          }
        }
      } catch {
        // 오프라인 → localStorage 데이터 사용
      }
    })()
    return () => { cancelled = true }
  }, [table, localKey])

  // 변경 감지 → localStorage + Supabase 동기화
  useEffect(() => {
    localStorage.setItem(localKey, JSON.stringify(list))

    if (skipSync.current) {
      skipSync.current = false
      return
    }

    clearTimeout(syncRef.current)
    syncRef.current = setTimeout(async () => {
      setSyncing(true)
      try {
        if (list.length > 0) {
          for (let i = 0; i < list.length; i += 50) {
            await supabase.from(table).upsert(list.slice(i, i + 50))
          }
        }
        // 삭제된 항목 정리
        const { data } = await supabase.from(table).select('id')
        if (data) {
          const currentIds = new Set(list.map(i => i.id))
          const toDelete = data
            .filter((r: { id: string }) => !currentIds.has(r.id))
            .map(r => r.id)
          if (toDelete.length > 0) {
            await supabase.from(table).delete().in('id', toDelete)
          }
        }
      } catch {
        // 동기화 실패 — localStorage에는 이미 저장됨
      }
      setSyncing(false)
    }, 1500)

    return () => clearTimeout(syncRef.current)
  }, [list, table, localKey])

  return [list, setList, syncing]
}
