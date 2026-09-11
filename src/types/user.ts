export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string | null;
  institutionName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserListItem[];
}
