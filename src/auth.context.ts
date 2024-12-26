import { createContext } from "react";
import { AuthContextType } from "./auth-types";

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export default AuthContext;
