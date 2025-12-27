import { createContext, useContext } from 'react';

interface ChatContextType {
    isBlockChat?: boolean; // True when used in BlockChat (no routing)
}

const ChatContext = createContext<ChatContextType>({});

export const ChatContextProvider = ChatContext.Provider;

export function useChatContext() {
    return useContext(ChatContext);
}
