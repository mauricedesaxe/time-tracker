import React, { createContext, useContext, ReactNode } from "react";
import { Store } from "tinybase";
import { timeTrackerStore } from "./timeTrackerStore";

const StoreContext = createContext<Store | null>(null);

export const StoreProvider: React.FC<{
  children: ReactNode;
  store?: Store;
}> = ({ children, store = timeTrackerStore }) => {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = (): Store => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return store;
};
