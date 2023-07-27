import constate from "constate";
import { useState } from "react";

const useAppState_ = () => {
  const [setsomething, setsetsomething] = useState("something");
  return {
    setsomething,
    setsetsomething,
  };
};

export const [AppStateProvider, useAppState] = constate(useAppState_);
