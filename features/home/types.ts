export type GalleryPhoto = {
  id: string;
  uri: string;
  locked?: boolean;
  source?: 'instagram' | 'local';
};

export type ProfileHighlight = {
  id: string;
  title: string;
  coverUrl: string;
};

export type InstagramProfileLoadResult = {
  source?: string;
  username: string;
  displayName: string;
  biography: string;
  profilePictureUrl: string;
  postsCount: number;
  followers: string;
  following: string;
  highlightCount: number;
  highlights: ProfileHighlight[];
  photos: GalleryPhoto[];
};

export type PersistedHomeState = {
  version: 1;
  usernameInput: string;
  profileName: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  postsCount: string;
  followers: string;
  following: string;
  profileLoaded: boolean;
  profileSource: string;
  highlights: ProfileHighlight[];
  photos: GalleryPhoto[];
};
