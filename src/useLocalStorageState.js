import { useEffect, useState } from 'react'

export function readLocalStorageValue(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key)
    return storedValue === null ? fallback : JSON.parse(storedValue)
  } catch {
    return fallback
  }
}

  const STORAGE_EVENT = 'relay:local-storage-update'

export function writeLocalStorageState(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key, value } }))
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage.`, error)
  }
}

export default function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => readLocalStorageValue(key, initialValue))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Could not save ${key} to localStorage.`, error)
    }
  }, [key, value])

    useEffect(() => {
      const syncValue = (event) => {
        if (event.detail?.key === key) setValue(event.detail.value)
      }
      window.addEventListener(STORAGE_EVENT, syncValue)
      return () => window.removeEventListener(STORAGE_EVENT, syncValue)
    }, [key])

  return [value, setValue]
}