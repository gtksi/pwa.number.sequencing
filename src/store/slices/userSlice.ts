import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '../../db/db';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
}

const initialState: UserState = {
  profile: null,
  isLoading: true,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
      state.isLoading = false;
    },
    updateUserProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    updateSettings(state, action: PayloadAction<Partial<UserProfile['settings']>>) {
      if (state.profile) {
        state.profile.settings = { ...state.profile.settings, ...action.payload };
      }
    }
  },
});

export const { setUserProfile, updateUserProfile, updateSettings } = userSlice.actions;
export default userSlice.reducer;
