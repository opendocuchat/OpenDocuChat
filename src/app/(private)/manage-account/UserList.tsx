// app/(private)/manage-account/UserList.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteGithubUser } from "./actions";
import { Button } from "@/components/ui/button";

interface User {
  github_username: string;
  github_id: string;
}

export default function UserList({ users }: { users: User[] }) {
  const removeUser = async (username: string) => {
    const result = await deleteGithubUser(username);
    if (!result.success) {
      console.error("Failed to remove user");
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {users.map((user) => (
            
            <li
              key={user.github_id}
              className="flex justify-between items-center mb-2"
            >
              <span>{user.github_username}</span>
              <Button
                onClick={() => removeUser(user.github_username)}
                variant={"destructive"}
              >
                Remove
              </Button>
            </li>
            
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}