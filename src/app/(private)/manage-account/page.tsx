// app/(private)/manage-account/page.tsx
import { sql } from "@vercel/postgres";
import UserList from "./UserList";
import AddUserForm from "./AddUserForm";

export const revalidate = 0;

async function getUsers() {
  const { rows } = await sql`SELECT * FROM account`;
  return rows.map((user) => ({
    github_username: user.github_username,
    github_id: user.github_id.toString(),
  }));
}

export default async function ManageAccountPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <AddUserForm />
      <UserList users={users} />
    </div>
  );
}