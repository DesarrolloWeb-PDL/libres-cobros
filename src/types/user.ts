export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  clubId: string | null;
  clubName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserListItem[];
}
