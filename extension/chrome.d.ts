declare namespace chrome {
  namespace storage {
    const local: {
      get(keys?: string | string[] | null): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
      remove(keys: string | string[]): Promise<void>
    }
  }

  namespace tabs {
    type Tab = { id?: number }
    const query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<Tab[]>
    const sendMessage: (tabId: number, message: unknown) => Promise<unknown>
  }

  namespace runtime {
    const onMessage: {
      addListener: (listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void) => void
    }
    const onInstalled: { addListener: (listener: () => void) => void }
    const onStartup: { addListener: (listener: () => void) => void }
  }
}
