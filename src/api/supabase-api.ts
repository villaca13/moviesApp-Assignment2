import { SignInProps, SignUpProps, AuthSession, Review } from "../types/interfaces";
import { supabase } from "./supabase-client";
import { UserProfile } from "../types/interfaces";

export const registerUser = async (data: SignUpProps): Promise<void> => {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        is_subscribed: data.isSubscribed ?? false,
      },
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  if (authData.user) {
    await upsertProfile(authData.user.id, { email_notifications: data.isSubscribed ?? false });
  }
};

export const loginUser = async (data: SignInProps): Promise<AuthSession> => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!authData.session || !authData.user) {
    throw new Error("Login failed: no session returned");
  }

  await upsertProfile(authData.user.id, { remember_me: data.remember_me ?? false });
  return {
    user: {
      id: authData.user.id,
      email: authData.user.email ?? "",
    },
    access_token: authData.session.access_token,
  };
};

export const getSession = async (): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return null;
  }
  return {
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? "",
    },
    access_token: data.session.access_token,
  };
};

export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};


export interface MovieDocument {
  favourites: number[];
  mustWatch: number[];
  reviews: Review[];
}

export const emptyMovieData: MovieDocument = { favourites: [], mustWatch: [], reviews: [] };

export const fetchMovieData = async (userId: string): Promise<MovieDocument> => {
  const { data, error } = await supabase
    .from("user_movie_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data.data as MovieDocument;
  }

  // First time this user has touched favourites/mustWatch/reviews — create their document
  const { error: insertError } = await supabase
    .from("user_movie_data")
    .insert({ user_id: userId, data: emptyMovieData });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return emptyMovieData;
};

export const saveMovieData = async (userId: string, data: MovieDocument): Promise<void> => {
  const { error } = await supabase
    .from("user_movie_data")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const upsertProfile = async (
  userId: string,
  changes: Partial<Pick<UserProfile, "remember_me" | "email_notifications">>
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, ...changes, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(error.message);
  }
};