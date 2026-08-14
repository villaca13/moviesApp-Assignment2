import { SignInProps, SignUpProps, AuthSession } from "../types/interfaces";
import { randomAlphaNumeric } from "../util";

// Keep storage key names in one place so reads/writes never drift apart
const USERS_KEY = "users";
const SESSION_KEY = "session";

// Move randomAlphaNumeric here from authContext.tsx, unchanged — it belongs
// with the other persistence helpers, not in the component/context layer.

// --- Registered users ---

export const getUsers = (): SignUpProps[] => {
  // TODO:
  // 1. Read USERS_KEY from localStorage
  // 2. If nothing is stored yet, return an empty array
  // 3. Otherwise JSON.parse the stored string and return it as SignUpProps[]
    const userList = localStorage.getItem(USERS_KEY);
    if (!userList) {
        return [];
    }
    return JSON.parse(userList);

};

export const registerUser = (data: SignUpProps): void => {
  // TODO:
  // 1. Get the current list via getUsers()
  // 2. Check whether a user with this email already exists
  //    - if so, throw an Error so the signup form can show "email already registered"
  // 3. Add `data` to the list
  // 4. JSON.stringify the updated list and save it back under USERS_KEY
  const users = getUsers();
  if (users.some((user) => user.email === data.email)) {
    throw new Error("Email already registered");
  }
  users.push(data);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

};

// --- Login / session ---

export const loginUser = (data: SignInProps): AuthSession => {
  // TODO:
  // 1. Get the registered users via getUsers()
  // 2. Find one whose email AND password match data.email / data.password
  // 3. If none matches, throw an Error ("invalid email or password")
  // 4. If found, build an AuthSession: { email: user.email, token: randomAlphaNumeric(50) }
  // 5. Call saveSession() with it
  // 6. Return the AuthSession
    const users = getUsers();
    const user = users.find((user) => user.email === data.email && user.password === data.password);
    if (!user) {
        throw new Error("Invalid email or password");
    }
    const session = { email: user.email, token: randomAlphaNumeric(50) };
    saveSession(session);
    return session;
};

export const getSession = (): AuthSession | null => {
  // TODO:
  // 1. Read SESSION_KEY from localStorage
  // 2. Return null if nothing is stored
  // 3. Otherwise JSON.parse and return it as AuthSession
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
        return null;
    }
    return JSON.parse(session);
};

export const saveSession = (session: AuthSession): void => {
  // TODO: JSON.stringify `session` and save it under SESSION_KEY
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const logoutUser = (): void => {
  // TODO: remove SESSION_KEY from localStorage
    localStorage.removeItem(SESSION_KEY);
};