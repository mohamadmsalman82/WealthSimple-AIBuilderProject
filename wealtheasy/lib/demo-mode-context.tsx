'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ClientOption {
  id: string
  name: string
}

interface DemoModeContextType {
  demoMode: boolean
  toggleDemoMode: () => void
  selectedClientId: string
  selectedClientName: string
  setSelectedClient: (id: string, name: string) => void
  clientOptions: ClientOption[]
}

const DemoModeContext = createContext<DemoModeContextType>({
  demoMode: true,
  toggleDemoMode: () => {},
  selectedClientId: '',
  selectedClientName: '',
  setSelectedClient: () => {},
  clientOptions: [],
})

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedClientName, setSelectedClientName] = useState('')
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')
      if (data && data.length > 0) {
        setClientOptions(data)
        setSelectedClientId(data[0].id)
        setSelectedClientName(data[0].name)
      }
    }
    load()
  }, [])

  const setSelectedClient = (id: string, name: string) => {
    setSelectedClientId(id)
    setSelectedClientName(name)
  }

  return (
    <DemoModeContext.Provider value={{
      demoMode,
      toggleDemoMode: () => setDemoMode(p => !p),
      selectedClientId,
      selectedClientName,
      setSelectedClient,
      clientOptions,
    }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoModeContext)
