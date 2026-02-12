/**
 * Profile data structure
 */
export interface Profile {
  did: string;
  name: string;
  logo?: string;
}

/**
 * POST /profiles
 * Create a profile
 */
export interface CreateProfileRequest {
  did: string;
  name: string;
  logo?: string;
}

/**
 * PATCH /profiles/{did}
 * Update a profile
 */
export interface UpdateProfileRequest {
  did: string;
  name: string;
  logo?: string;
}
