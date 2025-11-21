import { create } from "zustand";

type UiState = {
  isRightPanelOpen: boolean;
  isTicketFormOpen: boolean;
  isChatbotOpen: boolean;
};

type UiActions = {
  toggleRightPanel: () => void;
  setRightPanelOpen: (isOpen: boolean) => void;
  openTicketForm: () => void;
  closeTicketForm: () => void;
  toggleChatbot: () => void;
};

export const useUiStore = create<UiState & UiActions>((set) => ({
  isRightPanelOpen: true,
  isTicketFormOpen: false,
  isChatbotOpen: false,
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  setRightPanelOpen: (isOpen: boolean) => set({ isRightPanelOpen: isOpen }),
  openTicketForm: () => set({ isTicketFormOpen: true }),
  closeTicketForm: () => set({ isTicketFormOpen: false }),
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),
}));
