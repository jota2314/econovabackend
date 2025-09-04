'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { UIStore } from './types'

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        modals: {
          addLead: false,
          importLeads: false,
          smsDialog: false,
          communicationHistory: false,
          editLead: false,
        },
        dialogData: {
          selectedLeadForComms: null,
          editingLead: null,
        },
        sidebarCollapsed: false,
        theme: 'light',

        // Actions
        openModal: (modal, data) => {
          set(
            (state) => ({
              modals: { ...state.modals, [modal]: true },
              ...(data && { dialogData: { ...state.dialogData, ...data } }),
            }),
            false,
            `openModal:${modal}`
          )
        },

        closeModal: (modal) => {
          set(
            (state) => ({
              modals: { ...state.modals, [modal]: false },
            }),
            false,
            `closeModal:${modal}`
          )
        },

        closeAllModals: () => {
          set(
            (state) => ({
              modals: Object.keys(state.modals).reduce(
                (acc, key) => ({ ...acc, [key]: false }),
                {} as typeof state.modals
              ),
            }),
            false,
            'closeAllModals'
          )
        },

        setDialogData: (key, data) => {
          set(
            (state) => ({
              dialogData: { ...state.dialogData, [key]: data },
            }),
            false,
            `setDialogData:${key}`
          )
        },

        clearDialogData: () => {
          set(
            {
              dialogData: {
                selectedLeadForComms: null,
                editingLead: null,
              },
            },
            false,
            'clearDialogData'
          )
        },

        toggleSidebar: () => {
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            'toggleSidebar'
          )
        },

        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed')
        },

        setTheme: (theme) => {
          set({ theme }, false, 'setTheme')
        },
      }),
      {
        name: 'ui-store',
        // Only persist certain UI state
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
)